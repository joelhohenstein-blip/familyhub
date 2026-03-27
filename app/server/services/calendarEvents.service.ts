import { db } from '~/db/index.server';
import {
  calendarEvents,
  eventRsvps,
  eventVisibilityAudit,
  type CalendarEvent,
  type EventRsvp,
  type EventVisibilityAudit,
} from '~/db/schema';
import { eq, and, between, or } from 'drizzle-orm';

export const calendarEventsService = {
  async createEvent(input: {
    familyId: string;
    createdBy: string;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    visibility: 'public' | 'family' | 'private';
  }): Promise<CalendarEvent> {
    const result = await db
      .insert(calendarEvents)
      .values({
        familyId: input.familyId,
        createdBy: input.createdBy,
        title: input.title,
        description: input.description || null,
        startTime: input.startTime,
        endTime: input.endTime,
        location: input.location || null,
        visibility: input.visibility,
      })
      .returning();

    return result[0];
  },

  async updateVisibility(
    eventId: string,
    newVisibility: 'public' | 'family' | 'private',
    userId: string,
    reason?: string
  ): Promise<CalendarEvent | null> {
    // Get the current event to retrieve old visibility
    const currentEvent = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId));

    if (currentEvent.length === 0) {
      return null;
    }

    const oldVisibility = currentEvent[0].visibility;

    // Update the event visibility
    const updated = await db
      .update(calendarEvents)
      .set({ visibility: newVisibility, updatedAt: new Date() })
      .where(eq(calendarEvents.id, eventId))
      .returning();

    // Log the visibility change in the audit table
    if (updated.length > 0) {
      await db.insert(eventVisibilityAudit).values({
        eventId,
        userId,
        oldVisibility,
        newVisibility,
        reason: reason || null,
      });
    }

    return updated.length > 0 ? updated[0] : null;
  },

  async getRsvpStatus(
    eventId: string,
    userId: string
  ): Promise<EventRsvp | null> {
    const result = await db
      .select()
      .from(eventRsvps)
      .where(
        and(
          eq(eventRsvps.eventId, eventId),
          eq(eventRsvps.userId, userId)
        )
      );

    return result.length > 0 ? result[0] : null;
  },

  async rsvpEvent(
    eventId: string,
    userId: string,
    status: 'attending' | 'maybe' | 'not_attending'
  ): Promise<EventRsvp> {
    // Check if RSVP already exists
    const existing = await this.getRsvpStatus(eventId, userId);

    if (existing) {
      // Update existing RSVP
      const updated = await db
        .update(eventRsvps)
        .set({ status, updatedAt: new Date() })
        .where(
          and(
            eq(eventRsvps.eventId, eventId),
            eq(eventRsvps.userId, userId)
          )
        )
        .returning();

      return updated[0];
    }

    // Create new RSVP
    const result = await db
      .insert(eventRsvps)
      .values({
        eventId,
        userId,
        status,
      })
      .returning();

    return result[0];
  },

  async getCalendarEvents(input: {
    familyId: string;
    userId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<(CalendarEvent & { rsvpStatus?: EventRsvp | null })[]> {
    const events = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.familyId, input.familyId),
          between(calendarEvents.startTime, input.startDate, input.endDate),
          or(
            eq(calendarEvents.visibility, 'public'),
            eq(calendarEvents.visibility, 'family'),
            eq(calendarEvents.createdBy, input.userId)
          )
        )
      );

    // Get RSVP status for current user for each event
    const eventsWithRsvp = await Promise.all(
      events.map(async (event) => {
        const rsvp = await this.getRsvpStatus(event.id, input.userId);
        return { ...event, rsvpStatus: rsvp };
      })
    );

    return eventsWithRsvp;
  },

  async getEventDetails(
    eventId: string,
    userId: string
  ): Promise<(CalendarEvent & { rsvps?: EventRsvp[]; userRsvp?: EventRsvp | null }) | null> {
    const event = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId));

    if (event.length === 0) {
      return null;
    }

    // Get all RSVPs for this event
    const rsvps = await db
      .select()
      .from(eventRsvps)
      .where(eq(eventRsvps.eventId, eventId));

    // Get the current user's RSVP
    const userRsvp = rsvps.find((r) => r.userId === userId) || null;

    return { ...event[0], rsvps, userRsvp };
  },

  async validateEventConflicts(input: {
    familyId: string;
    startTime: Date;
    endTime: Date;
    userId?: string;
    excludeEventId?: string;
  }): Promise<CalendarEvent[]> {
    let query = db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.familyId, input.familyId),
          or(
            // Event starts within our time range
            and(
              between(calendarEvents.startTime, input.startTime, input.endTime)
            ),
            // Event ends within our time range
            and(
              between(calendarEvents.endTime, input.startTime, input.endTime)
            ),
            // Event encompasses our time range
            and(
              // Start is before us and ends after us
              eq(calendarEvents.startTime, input.startTime)
            )
          )
        )
      ) as any;

    if (input.excludeEventId) {
      query = query.where(
        eq(calendarEvents.id, input.excludeEventId)
      ) as any;
    }

    const conflicts = await query;
    return conflicts;
  },

  async getVisibilityAudit(eventId: string): Promise<EventVisibilityAudit[]> {
    const audit = await db
      .select()
      .from(eventVisibilityAudit)
      .where(eq(eventVisibilityAudit.eventId, eventId));

    return audit;
  },

  async getRsvpStats(eventId: string): Promise<{
    attending: number;
    maybe: number;
    notAttending: number;
    total: number;
  }> {
    const rsvps = await db
      .select()
      .from(eventRsvps)
      .where(eq(eventRsvps.eventId, eventId));

    return {
      attending: rsvps.filter((r) => r.status === 'attending').length,
      maybe: rsvps.filter((r) => r.status === 'maybe').length,
      notAttending: rsvps.filter((r) => r.status === 'not_attending').length,
      total: rsvps.length,
    };
  },
};
