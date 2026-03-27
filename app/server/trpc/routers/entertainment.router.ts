import { router, procedure } from '../trpc';
import { z } from 'zod';
import { db } from '~/db/index.server';
import {
  musicPlaylists as musicPlaylistsTable,
  musicTracks as musicTracksTable,
  watchParties as watchPartiesTable,
  watchPartyParticipants as watchPartyParticipantsTable,
  recommendations as recommendationsTable,
} from '~/db/games.schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';

/**
 * Entertainment API Router
 * Handles music sharing, watch parties, and content recommendations
 */

export const entertainmentRouter = router({
  /**
   * Create a music playlist
   */
  createPlaylist: procedure
    .input(z.object({
      familyId: z.string(),
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      isPublic: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new Error('Not authenticated');

      const playlistId = crypto.randomUUID();

      await db.insert(musicPlaylistsTable).values({
        id: playlistId,
        familyId: input.familyId,
        createdBy: ctx.user.id,
        name: input.name,
        description: input.description,
        isPublic: input.isPublic,
      });

      return { id: playlistId };
    }),

  /**
   * Get playlists for a family
   */
  listPlaylists: procedure
    .input(z.object({
      familyId: z.string(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const playlists = await db
        .select()
        .from(musicPlaylistsTable)
        .where(eq(musicPlaylistsTable.familyId, input.familyId))
        .limit(input.limit)
        .offset(input.offset)
        .orderBy(desc(musicPlaylistsTable.updatedAt));

      const total = await db
        .select({ count: sql<number>`count(*)` })
        .from(musicPlaylistsTable)
        .where(eq(musicPlaylistsTable.familyId, input.familyId));

      return {
        items: playlists,
        total: total[0]?.count || 0,
        hasMore: (input.offset + input.limit) < (total[0]?.count || 0),
      };
    }),

  /**
   * Add track to playlist
   */
  addTrack: procedure
    .input(z.object({
      playlistId: z.string(),
      title: z.string().min(1).max(200),
      artist: z.string().min(1).max(200),
      duration: z.number().positive(),
      url: z.string().url(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new Error('Not authenticated');

      // Get max order number
      const lastTrack = await db
        .select({ order: musicTracksTable.order })
        .from(musicTracksTable)
        .where(eq(musicTracksTable.playlistId, input.playlistId))
        .orderBy(desc(musicTracksTable.order))
        .limit(1);

      const order = (lastTrack[0]?.order ?? 0) + 1;

      const trackId = crypto.randomUUID();

      await db.insert(musicTracksTable).values({
        id: trackId,
        playlistId: input.playlistId,
        title: input.title,
        artist: input.artist,
        duration: input.duration,
        url: input.url,
        order,
        addedBy: ctx.user.id,
      });

      return { id: trackId };
    }),

  /**
   * Get playlist with tracks
   */
  getPlaylist: procedure
    .input(z.object({ playlistId: z.string() }))
    .query(async ({ input }) => {
      const playlist = await db
        .select()
        .from(musicPlaylistsTable)
        .where(eq(musicPlaylistsTable.id, input.playlistId))
        .limit(1);

      if (!playlist[0]) throw new Error('Playlist not found');

      const tracks = await db
        .select()
        .from(musicTracksTable)
        .where(eq(musicTracksTable.playlistId, input.playlistId))
        .orderBy(asc(musicTracksTable.order));

      return {
        ...playlist[0],
        tracks,
      };
    }),

  /**
   * Remove track from playlist
   */
  removeTrack: procedure
    .input(z.object({ trackId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new Error('Not authenticated');

      await db.delete(musicTracksTable).where(eq(musicTracksTable.id, input.trackId));

      return { success: true };
    }),

  /**
   * Create watch party
   */
  createWatchParty: procedure
    .input(z.object({
      familyId: z.string(),
      title: z.string().min(1).max(200),
      contentUrl: z.string().url(),
      contentType: z.enum(['movie', 'show', 'stream']),
      scheduledAt: z.date(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new Error('Not authenticated');

      const partyId = crypto.randomUUID();

      await db.insert(watchPartiesTable).values({
        id: partyId,
        familyId: input.familyId,
        createdBy: ctx.user.id,
        title: input.title,
        contentUrl: input.contentUrl,
        contentType: input.contentType,
        scheduledAt: input.scheduledAt,
        status: 'scheduled',
      });

      // Add creator as participant
      await db.insert(watchPartyParticipantsTable).values({
        id: crypto.randomUUID(),
        watchPartyId: partyId,
        userId: ctx.user.id,
      });

      return { id: partyId };
    }),

  /**
   * Get watch parties for family
   */
  listWatchParties: procedure
    .input(z.object({
      familyId: z.string(),
      status: z.enum(['scheduled', 'watching', 'completed']).optional(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(watchPartiesTable.familyId, input.familyId)];
      if (input.status) {
        conditions.push(eq(watchPartiesTable.status, input.status));
      }

      const parties = await db
        .select()
        .from(watchPartiesTable)
        .where(and(...conditions))
        .limit(input.limit)
        .orderBy(asc(watchPartiesTable.scheduledAt));

      return parties;
    }),

  /**
   * Join watch party
   */
  joinWatchParty: procedure
    .input(z.object({ watchPartyId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new Error('Not authenticated');

      // Check if already joined
      const existing = await db
        .select()
        .from(watchPartyParticipantsTable)
        .where(
          and(
            eq(watchPartyParticipantsTable.watchPartyId, input.watchPartyId),
            eq(watchPartyParticipantsTable.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (existing[0]) {
        return { success: false, message: 'Already joined' };
      }

      const participantId = crypto.randomUUID();

      await db.insert(watchPartyParticipantsTable).values({
        id: participantId,
        watchPartyId: input.watchPartyId,
        userId: ctx.user.id,
      });

      return { success: true };
    }),

  /**
   * Get watch party details with participants
   */
  getWatchParty: procedure
    .input(z.object({ watchPartyId: z.string() }))
    .query(async ({ input }) => {
      const party = await db
        .select()
        .from(watchPartiesTable)
        .where(eq(watchPartiesTable.id, input.watchPartyId))
        .limit(1);

      if (!party[0]) throw new Error('Watch party not found');

      const participants = await db
        .select()
        .from(watchPartyParticipantsTable)
        .where(eq(watchPartyParticipantsTable.watchPartyId, input.watchPartyId));

      return {
        ...party[0],
        participants,
      };
    }),

  /**
   * Create content recommendation
   */
  createRecommendation: procedure
    .input(z.object({
      familyId: z.string(),
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      contentType: z.enum(['movie', 'show', 'game', 'music']),
      contentUrl: z.string().url().optional(),
      rating: z.number().min(1).max(5).optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new Error('Not authenticated');

      const recommendationId = crypto.randomUUID();

      await db.insert(recommendationsTable).values({
        id: recommendationId,
        familyId: input.familyId,
        createdBy: ctx.user.id,
        title: input.title,
        description: input.description,
        contentType: input.contentType,
        contentUrl: input.contentUrl,
        rating: input.rating,
        reason: input.reason,
      });

      return { id: recommendationId };
    }),

  /**
   * Get recommendations for family
   */
  listRecommendations: procedure
    .input(z.object({
      familyId: z.string(),
      contentType: z.enum(['movie', 'show', 'game', 'music']).optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(recommendationsTable.familyId, input.familyId)];
      if (input.contentType) {
        conditions.push(eq(recommendationsTable.contentType, input.contentType));
      }

      const recommendations = await db
        .select()
        .from(recommendationsTable)
        .where(and(...conditions))
        .limit(input.limit)
        .offset(input.offset)
        .orderBy(desc(recommendationsTable.votes));

      const total = await db
        .select({ count: sql<number>`count(*)` })
        .from(recommendationsTable)
        .where(eq(recommendationsTable.familyId, input.familyId));

      return {
        items: recommendations,
        total: total[0]?.count || 0,
        hasMore: (input.offset + input.limit) < (total[0]?.count || 0),
      };
    }),

  /**
   * Vote on recommendation
   */
  voteRecommendation: procedure
    .input(z.object({
      recommendationId: z.string(),
      upvote: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new Error('Not authenticated');

      const recommendation = await db
        .select()
        .from(recommendationsTable)
        .where(eq(recommendationsTable.id, input.recommendationId))
        .limit(1);

      if (!recommendation[0]) throw new Error('Recommendation not found');

      const newVotes = input.upvote
        ? recommendation[0].votes + 1
        : Math.max(0, recommendation[0].votes - 1);

      await db
        .update(recommendationsTable)
        .set({ votes: newVotes })
        .where(eq(recommendationsTable.id, input.recommendationId));

      return { votes: newVotes };
    }),
});
