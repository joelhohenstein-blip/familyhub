import { procedure, router } from "../trpc";
import { z } from "zod";
import { calls, callParticipants } from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.PUSHER_CLUSTER || "mt1",
});

export const callsRouter = router({
  startCall: procedure
    .input(
      z.object({
        familyId: z.string().uuid(),
        participantIds: z.array(z.string().uuid()).optional(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      const roomName = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const call = await ctx.db
        .insert(calls)
        .values({
          familyId: input.familyId,
          initiatorId: ctx.user.id,
          roomName,
          status: "pending",
        })
        .returning();

      if (input.participantIds && input.participantIds.length > 0) {
        await ctx.db.insert(callParticipants).values(
          input.participantIds.map((userId: string) => ({
            callId: call[0].id,
            userId,
          }))
        );
      }

      // Add initiator as participant
      await ctx.db.insert(callParticipants).values({
        callId: call[0].id,
        userId: ctx.user.id,
      });

      // Broadcast event via Pusher
      await pusher.trigger(`family-${input.familyId}`, "call-started", {
        callId: call[0].id,
        roomName: call[0].roomName,
        initiatorId: ctx.user.id,
      });

      return {
        callId: call[0].id,
        roomName: call[0].roomName,
        joinUrl: `/dashboard/calls/${call[0].id}`,
      };
    }),

  joinCall: procedure
    .input(
      z.object({
        callId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Check if call exists
      const call = await ctx.db.query.calls.findFirst({
        where: eq(calls.id, input.callId),
      });

      if (!call) {
        throw new Error("Call not found");
      }

      // Check if user is already a participant
      const existingParticipant = await ctx.db.query.callParticipants.findFirst({
        where: and(
          eq(callParticipants.callId, input.callId),
          eq(callParticipants.userId, ctx.user.id)
        ),
      });

      if (!existingParticipant) {
        await ctx.db.insert(callParticipants).values({
          callId: input.callId,
          userId: ctx.user.id,
        });
      }

      // Update call status to active if pending
      if (call.status === "pending") {
        await ctx.db
          .update(calls)
          .set({
            status: "active",
            startedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(calls.id, input.callId));
      }

      // Broadcast participant joined event
      await pusher.trigger(`call-${input.callId}`, "participant-joined", {
        userId: ctx.user.id,
        timestamp: new Date(),
      });

      return {
        success: true,
        callId: input.callId,
        roomName: call.roomName,
      };
    }),

  getCallStatus: procedure
    .input(z.object({ callId: z.string().uuid() }))
    .query(async ({ ctx, input }: any) => {
      const call = await ctx.db.query.calls.findFirst({
        where: eq(calls.id, input.callId),
        with: {
          participants: {
            with: {
              user: true,
            },
          },
        },
      });

      if (!call) {
        throw new Error("Call not found");
      }

      return {
        callId: call.id,
        roomName: call.roomName,
        status: call.status,
        startedAt: call.startedAt,
        participantCount: call.participants.length,
        participants: call.participants.map((p: any) => ({
          userId: p.userId,
          joinedAt: p.joinedAt,
          audioEnabled: p.audioEnabled,
          videoEnabled: p.videoEnabled,
        })),
      };
    }),

  endCall: procedure
    .input(z.object({ callId: z.string().uuid() }))
    .mutation(async ({ ctx, input }: any) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      const call = await ctx.db.query.calls.findFirst({
        where: eq(calls.id, input.callId),
      });

      if (!call) {
        throw new Error("Call not found");
      }

      // Update all participants' leftAt timestamp
      await ctx.db
        .update(callParticipants)
        .set({
          leftAt: new Date(),
        })
        .where(eq(callParticipants.callId, input.callId));

      // End the call
      await ctx.db
        .update(calls)
        .set({
          status: "ended",
          endedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(calls.id, input.callId));

      // Broadcast call ended event
      await pusher.trigger(`call-${input.callId}`, "call-ended", {
        timestamp: new Date(),
      });

      return { success: true };
    }),

  updateMediaState: procedure
    .input(
      z.object({
        callId: z.string().uuid(),
        audioEnabled: z.boolean().optional(),
        videoEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      const participant = await ctx.db.query.callParticipants.findFirst({
        where: and(
          eq(callParticipants.callId, input.callId),
          eq(callParticipants.userId, ctx.user.id)
        ),
      });

      if (!participant) {
        throw new Error("Participant not found in this call");
      }

      const updateData: Record<string, any> = {};
      if (input.audioEnabled !== undefined) {
        updateData.audioEnabled = input.audioEnabled;
      }
      if (input.videoEnabled !== undefined) {
        updateData.videoEnabled = input.videoEnabled;
      }

      await ctx.db
        .update(callParticipants)
        .set(updateData)
        .where(eq(callParticipants.id, participant.id));

      // Broadcast media state change
      await pusher.trigger(`call-${input.callId}`, "media-state-changed", {
        userId: ctx.user.id,
        audioEnabled: input.audioEnabled,
        videoEnabled: input.videoEnabled,
        timestamp: new Date(),
      });

      return { success: true };
    }),

  onCallUpdate: procedure
    .input(z.object({ callId: z.string().uuid() }))
    .subscription(async ({ input }: any) => {
      // This would be implemented with actual subscription logic
      // For now, returning a placeholder
      return {
        callId: input.callId,
        channel: `call-${input.callId}`,
      };
    }),
});
