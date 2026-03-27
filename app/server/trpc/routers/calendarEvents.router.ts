import { router, procedure } from '../trpc';
import { z } from 'zod';
import { calendarEventsService } from '../../services/calendarEvents.service';
import { familyMembers } from '~/db/schema';
import { eq, and } from 'drizzle-orm';

export const calendarEventsRouter = router({
  createEvent: procedure
    .input(
      z.object({
        familyId: z.string().uuid(),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        startTime: z.coerce.date(),
        endTime: z.coerce.date(),
        location: z.string().optional(),
        visibility: z.enum(['public', 'family', 'private']),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      // Verify user is a family member
      const memberCheck = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user?.id || '')
          )
        );

      if (memberCheck.length === 0) {
        throw new Error('Unauthorized: Not a family member');
      }

      // Validate that endTime is after startTime
      if (new Date(input.endTime) <= new Date(input.startTime)) {
        throw new Error('Event end time must be after start time');
      }

      try {
        const event = await calendarEventsService.createEvent({
          familyId: input.familyId,
          createdBy: ctx.user?.id || '',
          title: input.title,
          description: input.description,
          startTime: new Date(input.startTime),
          endTime: new Date(input.endTime),
          location: input.location,
          visibility: input.visibility,
        });

        return {
          success: true,
          event,
          message: 'Event created successfully',
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create event';
        throw new Error(message);
      }
    }),

  updateVisibility: procedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        familyId: z.string().uuid(),
        visibility: z.enum(['public', 'family', 'private']),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      // Verify user is a family member
      const memberCheck = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user?.id || '')
          )
        );

      if (memberCheck.length === 0) {
        throw new Error('Unauthorized: Not a family member');
      }

      try {
        const event = await calendarEventsService.updateVisibility(
          input.eventId,
          input.visibility,
          ctx.user?.id || '',
          input.reason
        );

        if (!event) {
          throw new Error('Event not found');
        }

        return {
          success: true,
          event,
          message: 'Event visibility updated successfully',
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update visibility';
        throw new Error(message);
      }
    }),

  rsvpEvent: procedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        familyId: z.string().uuid(),
        status: z.enum(['attending', 'maybe', 'not_attending']),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      // Verify user is a family member
      const memberCheck = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user?.id || '')
          )
        );

      if (memberCheck.length === 0) {
        throw new Error('Unauthorized: Not a family member');
      }

      try {
        const rsvp = await calendarEventsService.rsvpEvent(
          input.eventId,
          ctx.user?.id || '',
          input.status
        );

        // Get updated RSVP stats
        const stats = await calendarEventsService.getRsvpStats(input.eventId);

        return {
          success: true,
          rsvp,
          stats,
          message: `RSVP updated to ${input.status}`,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to RSVP to event';
        throw new Error(message);
      }
    }),

  getCalendarEvents: procedure
    .input(
      z.object({
        familyId: z.string().uuid(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      })
    )
    .query(async ({ input, ctx }: any) => {
      // Verify user is a family member
      const memberCheck = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user?.id || '')
          )
        );

      if (memberCheck.length === 0) {
        throw new Error('Unauthorized: Not a family member');
      }

      try {
        const events = await calendarEventsService.getCalendarEvents({
          familyId: input.familyId,
          userId: ctx.user?.id || '',
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
        });

        return {
          success: true,
          events,
          count: events.length,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch events';
        throw new Error(message);
      }
    }),

  getEventDetails: procedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        familyId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }: any) => {
      // Verify user is a family member
      const memberCheck = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user?.id || '')
          )
        );

      if (memberCheck.length === 0) {
        throw new Error('Unauthorized: Not a family member');
      }

      try {
        const event = await calendarEventsService.getEventDetails(
          input.eventId,
          ctx.user?.id || ''
        );

        if (!event) {
          throw new Error('Event not found');
        }

        // Get RSVP stats
        const stats = await calendarEventsService.getRsvpStats(input.eventId);

        // Get visibility audit trail
        const audit = await calendarEventsService.getVisibilityAudit(input.eventId);

        return {
          success: true,
          event,
          stats,
          audit,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch event details';
        throw new Error(message);
      }
    }),

  getVisibilityAudit: procedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        familyId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }: any) => {
      // Verify user is a family member
      const memberCheck = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user?.id || '')
          )
        );

      if (memberCheck.length === 0) {
        throw new Error('Unauthorized: Not a family member');
      }

      try {
        const audit = await calendarEventsService.getVisibilityAudit(input.eventId);

        return {
          success: true,
          audit,
          count: audit.length,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch audit trail';
        throw new Error(message);
      }
    }),

  validateConflicts: procedure
    .input(
      z.object({
        familyId: z.string().uuid(),
        startTime: z.coerce.date(),
        endTime: z.coerce.date(),
        excludeEventId: z.string().uuid().optional(),
      })
    )
    .query(async ({ input, ctx }: any) => {
      // Verify user is a family member
      const memberCheck = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user?.id || '')
          )
        );

      if (memberCheck.length === 0) {
        throw new Error('Unauthorized: Not a family member');
      }

      try {
        const conflicts = await calendarEventsService.validateEventConflicts({
          familyId: input.familyId,
          startTime: new Date(input.startTime),
          endTime: new Date(input.endTime),
          excludeEventId: input.excludeEventId,
        });

        return {
          success: true,
          hasConflicts: conflicts.length > 0,
          conflicts,
          count: conflicts.length,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to validate conflicts';
        throw new Error(message);
      }
    }),
});
