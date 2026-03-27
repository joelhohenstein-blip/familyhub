import { router, procedure } from '../trpc';
import { z } from 'zod';
import { db } from '~/db/index.server';
import {
  games as gamesTable,
  gameSessions as gameSessionsTable,
  gamePlayers as gamePlayersTable,
  gameStats as gameStatsTable,
  leaderboards as leaderboardsTable,
  achievements as achievementsTable,
  userAchievements as userAchievementsTable,
} from '~/db/games.schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';

/**
 * Games & Entertainment API Router
 * Handles multiplayer games, leaderboards, and achievements
 */

export const gamesRouter = router({
  /**
   * Get all available games
   */
  listGames: procedure
    .input(z.object({
      category: z.string().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(gamesTable.isActive, true)];
      if (input.category) {
        conditions.push(eq(gamesTable.category, input.category));
      }

      const gamesList = await db
        .select()
        .from(gamesTable)
        .where(and(...conditions))
        .limit(input.limit)
        .offset(input.offset)
        .orderBy(asc(gamesTable.name));

      const total = await db
        .select({ count: sql<number>`count(*)` })
        .from(gamesTable)
        .where(eq(gamesTable.isActive, true));

      return {
        items: gamesList,
        total: total[0]?.count || 0,
        hasMore: (input.offset + input.limit) < (total[0]?.count || 0),
      };
    }),

  /**
   * Get game details
   */
  getGame: procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const game = await db
        .select()
        .from(gamesTable)
        .where(eq(gamesTable.id, input.id))
        .limit(1);

      return game[0];
    }),

  /**
   * Start a new game session
   */
  startGame: procedure
    .input(z.object({
      gameId: z.string(),
      familyId: z.string(),
      invitedUserIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new Error('Not authenticated');

      const sessionId = crypto.randomUUID();

      // Create session
      await db.insert(gameSessionsTable).values({
        id: sessionId,
        gameId: input.gameId,
        familyId: input.familyId,
        createdBy: ctx.user.id,
        status: 'waiting',
        scores: '{}',
      });

      // Add creator as first player
      await db.insert(gamePlayersTable).values({
        id: crypto.randomUUID(),
        sessionId,
        userId: ctx.user.id,
        status: 'active',
      });

      // Send invitations to other players
      if (input.invitedUserIds?.length) {
        // TODO: Implement invitation system via notifications
      }

      return { sessionId };
    }),

  /**
   * Join a game session
   */
  joinGame: procedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new Error('Not authenticated');

      const session = await db
        .select()
        .from(gameSessionsTable)
        .where(eq(gameSessionsTable.id, input.sessionId))
        .limit(1);

      if (!session[0]) throw new Error('Game session not found');

      // Check player count
      const playerCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(gamePlayersTable)
        .where(eq(gamePlayersTable.sessionId, input.sessionId));

      const game = await db
        .select()
        .from(gamesTable)
        .where(eq(gamesTable.id, session[0].gameId))
        .limit(1);

      if (playerCount[0]?.count >= game[0]?.maxPlayers) {
        throw new Error('Game session is full');
      }

      // Add player
      const playerId = crypto.randomUUID();
      await db.insert(gamePlayersTable).values({
        id: playerId,
        sessionId: input.sessionId,
        userId: ctx.user.id,
      });

      return { playerId };
    }),

  /**
   * Submit game results
   */
  submitResults: procedure
    .input(z.object({
      sessionId: z.string(),
      scores: z.record(z.string(), z.number()),
      winnerId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new Error('Not authenticated');

      // Update session
      await db
        .update(gameSessionsTable)
        .set({
          status: 'completed',
          scores: JSON.stringify(input.scores),
          winner: input.winnerId,
          endedAt: new Date(),
        })
        .where(eq(gameSessionsTable.id, input.sessionId));

      // Update player scores
      for (const [userId, score] of Object.entries(input.scores)) {
        await db
          .update(gamePlayersTable)
          .set({ score: score as number })
          .where(
            and(
              eq(gamePlayersTable.sessionId, input.sessionId),
              eq(gamePlayersTable.userId, userId)
            )
          );
      }

      // Update game stats
      const session = await db
        .select()
        .from(gameSessionsTable)
        .where(eq(gameSessionsTable.id, input.sessionId))
        .limit(1);

      for (const userId of Object.keys(input.scores)) {
        const existingStats = await db
          .select()
          .from(gameStatsTable)
          .where(
            and(
              eq(gameStatsTable.userId, userId),
              eq(gameStatsTable.gameId, session[0]!.gameId)
            )
          )
          .limit(1);

        const score = input.scores[userId]!;
        const isWinner = userId === input.winnerId;

        if (existingStats[0]) {
          await db
            .update(gameStatsTable)
            .set({
              totalGames: existingStats[0].totalGames + 1,
              wins: isWinner ? existingStats[0].wins + 1 : existingStats[0].wins,
              highScore: Math.max(existingStats[0].highScore, score),
            })
            .where(eq(gameStatsTable.id, existingStats[0].id));
        } else {
          await db.insert(gameStatsTable).values({
            id: crypto.randomUUID(),
            userId,
            gameId: session[0]!.gameId,
            totalGames: 1,
            wins: isWinner ? 1 : 0,
            highScore: score,
          });
        }
      }

      return { success: true };
    }),

  /**
   * Get user game statistics
   */
  getUserStats: procedure
    .input(z.object({
      userId: z.string(),
      gameId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(gameStatsTable.userId, input.userId)];
      if (input.gameId) {
        conditions.push(eq(gameStatsTable.gameId, input.gameId));
      }

      return await db
        .select()
        .from(gameStatsTable)
        .where(and(...conditions))
        .orderBy(desc(gameStatsTable.totalGames));
    }),

  /**
   * Get leaderboard for a game
   */
  getLeaderboard: procedure
    .input(z.object({
      gameId: z.string(),
      familyId: z.string(),
      period: z.enum(['all-time', 'monthly', 'weekly']).default('all-time'),
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      const leaderboard = await db
        .select({
          rank: leaderboardsTable.rank,
          userId: leaderboardsTable.userId,
          score: leaderboardsTable.score,
          firstName: sql<string>`u.first_name`,
          lastName: sql<string>`u.last_name`,
          avatar: sql<string>`u.avatar`,
        })
        .from(leaderboardsTable)
        .where(
          and(
            eq(leaderboardsTable.gameId, input.gameId),
            eq(leaderboardsTable.familyId, input.familyId),
            eq(leaderboardsTable.period, input.period)
          )
        )
        .limit(input.limit)
        .orderBy(asc(leaderboardsTable.rank));

      return leaderboard;
    }),

  /**
   * Get user achievements
   */
  getUserAchievements: procedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const achievements = await db
        .select({
          achievement: achievementsTable,
          unlockedAt: userAchievementsTable.unlockedAt,
        })
        .from(userAchievementsTable)
        .innerJoin(
          achievementsTable,
          eq(userAchievementsTable.achievementId, achievementsTable.id)
        )
        .where(eq(userAchievementsTable.userId, input.userId))
        .orderBy(desc(userAchievementsTable.unlockedAt));

      return achievements;
    }),

  /**
   * Get all achievements
   */
  listAchievements: procedure
    .input(z.object({
      category: z.string().optional(),
      userId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [];
      if (input.category) {
        conditions.push(eq(achievementsTable.category, input.category));
      }

      const allAchievements = conditions.length > 0
        ? await db.select().from(achievementsTable).where(and(...conditions))
        : await db.select().from(achievementsTable);

      // Get user's unlocked achievements if userId provided
      if (input.userId) {
        const unlockedIds = (
          await db
            .select({ achievementId: userAchievementsTable.achievementId })
            .from(userAchievementsTable)
            .where(eq(userAchievementsTable.userId, input.userId))
        ).map(a => a.achievementId);

        return allAchievements.map(a => ({
          ...a,
          unlocked: unlockedIds.includes(a.id),
        }));
      }

      return allAchievements;
    }),

  /**
   * Unlock achievement
   */
  unlockAchievement: procedure
    .input(z.object({
      userId: z.string(),
      achievementId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if already unlocked
      const existing = await db
        .select()
        .from(userAchievementsTable)
        .where(
          and(
            eq(userAchievementsTable.userId, input.userId),
            eq(userAchievementsTable.achievementId, input.achievementId)
          )
        )
        .limit(1);

      if (existing[0]) {
        return { success: false, message: 'Already unlocked' };
      }

      await db.insert(userAchievementsTable).values({
        id: crypto.randomUUID(),
        userId: input.userId,
        achievementId: input.achievementId,
      });

      return { success: true };
    }),

  /**
   * Get game session details
   */
  getSession: procedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const session = await db
        .select()
        .from(gameSessionsTable)
        .where(eq(gameSessionsTable.id, input.sessionId))
        .limit(1);

      if (!session[0]) throw new Error('Session not found');

      const players = await db
        .select()
        .from(gamePlayersTable)
        .where(eq(gamePlayersTable.sessionId, input.sessionId));

      return {
        ...session[0],
        players,
      };
    }),
});
