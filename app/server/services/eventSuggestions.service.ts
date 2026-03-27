import { db } from '~/db/index.server';
import { eventSuggestions, type EventSuggestion } from '~/db/schema';
import { eq, and } from 'drizzle-orm';
import openai from './openai.service';

interface EventContext {
  familySize: number;
  ageRanges: string[];
  recentActivities?: string[];
  preferences?: string[];
}

interface EventSuggestionInput {
  familyId: string;
  context: EventContext;
}

const SUGGESTION_TIMEOUT = 2000; // 2 seconds
const SUGGESTION_CACHE = new Map<string, { data: EventSuggestion[]; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

export const eventSuggestionsService = {
  async generateEventSuggestions(familyId: string, context: EventContext): Promise<EventSuggestion[]> {
    // Check cache first
    const cacheKey = `suggestions_${familyId}`;
    const cached = SUGGESTION_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Validate family context
    if (!familyId || !context || context.familySize === 0) {
      return []; // Gracefully handle empty context
    }

    try {
      // Create a promise that resolves within timeout
      const suggestionPromise = this.getAISuggestions(familyId, context);
      const timeoutPromise = new Promise<EventSuggestion[]>((_, reject) =>
        setTimeout(() => reject(new Error('Suggestion generation timeout')), SUGGESTION_TIMEOUT)
      );

      const aiSuggestions = await Promise.race([suggestionPromise, timeoutPromise]);

      // Validate and filter suggestions
      const validSuggestions = aiSuggestions.filter(
        (s) => s.title && s.suggestedTime && s.status === 'pending'
      );

      // Cache the results
      SUGGESTION_CACHE.set(cacheKey, {
        data: validSuggestions,
        timestamp: Date.now(),
      });

      return validSuggestions;
    } catch (error) {
      console.error('Event suggestion generation error:', error);
      return []; // Gracefully handle errors
    }
  },

  async getAISuggestions(familyId: string, context: EventContext): Promise<EventSuggestion[]> {
    const prompt = `Generate 5-7 family event suggestions based on the following context:
- Family size: ${context.familySize} people
- Age ranges: ${context.ageRanges.join(', ')}
- Recent activities: ${context.recentActivities?.join(', ') || 'None'}
- Preferences: ${context.preferences?.join(', ') || 'None'}

For each suggestion, provide a JSON object with:
- title: event name
- suggestedTime: ISO timestamp (within next 7 days)
- location: physical location or "virtual"
- category: one of [activity, meal, game, movie, outing, celebration, other]
- rationale: brief explanation why this event suits the family

Return a JSON array of suggestions. Format: [{"title": "...", "suggestedTime": "...", "location": "...", "category": "...", "rationale": "..."}]`;

    try {
      if (!openai) {
        throw new Error('OpenAI service not configured. Set OPENAI_API_KEY environment variable.');
      }
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content || '[]';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      // Format and save suggestions to database
      const formattedSuggestions: EventSuggestion[] = [];

      for (const suggestion of parsed) {
        if (suggestion.title && suggestion.suggestedTime) {
          const saved = await db
            .insert(eventSuggestions)
            .values({
              familyId,
              title: suggestion.title,
              description: suggestion.rationale,
              suggestedTime: new Date(suggestion.suggestedTime),
              location: suggestion.location || null,
              category: suggestion.category || 'other',
              rationale: suggestion.rationale,
              status: 'pending',
            })
            .returning();

          if (saved.length > 0) {
            formattedSuggestions.push(saved[0]);
          }
        }
      }

      return formattedSuggestions;
    } catch (error) {
      console.error('OpenAI API error:', error);
      return [];
    }
  },

  async evaluateEventTiming(suggestion: EventSuggestion, familyCalendarEvents: any[]): Promise<{ hasConflict: boolean; conflictingEvents: any[] }> {
    const conflictingEvents = familyCalendarEvents.filter((event) => {
      const suggestionStart = new Date(suggestion.suggestedTime).getTime();
      const suggestionEnd = suggestionStart + 3600000; // 1 hour default duration
      const eventStart = new Date(event.startTime).getTime();
      const eventEnd = new Date(event.endTime).getTime();

      // Check for overlap
      return (
        (suggestionStart >= eventStart && suggestionStart < eventEnd) ||
        (suggestionEnd > eventStart && suggestionEnd <= eventEnd) ||
        (suggestionStart <= eventStart && suggestionEnd >= eventEnd)
      );
    });

    return {
      hasConflict: conflictingEvents.length > 0,
      conflictingEvents,
    };
  },

  async confirmSuggestion(suggestionId: string): Promise<EventSuggestion | null> {
    const result = await db
      .update(eventSuggestions)
      .set({
        status: 'confirmed',
        confirmedAt: new Date(),
      })
      .where(eq(eventSuggestions.id, suggestionId))
      .returning();

    return result.length > 0 ? result[0] : null;
  },

  async rejectSuggestion(suggestionId: string): Promise<EventSuggestion | null> {
    const result = await db
      .update(eventSuggestions)
      .set({
        status: 'rejected',
      })
      .where(eq(eventSuggestions.id, suggestionId))
      .returning();

    return result.length > 0 ? result[0] : null;
  },

  async getSuggestionsByFamily(familyId: string, status?: 'pending' | 'confirmed' | 'rejected'): Promise<EventSuggestion[]> {
    let query = db.select().from(eventSuggestions).where(eq(eventSuggestions.familyId, familyId)) as any;

    if (status) {
      query = query.where(eq(eventSuggestions.status, status));
    }

    return await query;
  },

  async getSuggestionById(suggestionId: string): Promise<EventSuggestion | null> {
    const result = await db
      .select()
      .from(eventSuggestions)
      .where(eq(eventSuggestions.id, suggestionId));

    return result.length > 0 ? result[0] : null;
  },

  clearCache(familyId: string): void {
    const cacheKey = `suggestions_${familyId}`;
    SUGGESTION_CACHE.delete(cacheKey);
  },
};
