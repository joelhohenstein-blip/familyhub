import { db } from '~/db/index.server';
import { calendarIntegrations, calendarSyncLogs, eventSuggestions } from '~/db/schema';
import { eq, and } from 'drizzle-orm';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  description?: string;
}

export const calendarSyncService = {
  // Token encryption/decryption utilities
  encryptToken(token: string): string {
    return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
  },

  decryptToken(encryptedToken: string): string {
    return CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
  },

  async syncEventToGoogle(accessToken: string, event: CalendarEvent): Promise<{ success: boolean; externalId?: string; error?: string }> {
    try {
      const decryptedToken = this.decryptToken(accessToken);

      // Use googleapis client (would be initialized in real implementation)
      const response = await this.retryOperation(async () => {
        // Simulated Google Calendar API call
        // In production, use: const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        return {
          id: `google_${Date.now()}`,
        };
      });

      return {
        success: true,
        externalId: response.id,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  async syncEventToOutlook(accessToken: string, event: CalendarEvent): Promise<{ success: boolean; externalId?: string; error?: string }> {
    try {
      const decryptedToken = this.decryptToken(accessToken);

      // Use microsoft-graph client (would be initialized in real implementation)
      const response = await this.retryOperation(async () => {
        // Simulated Microsoft Graph API call
        // In production, use: const client = graph.Client.init({ authProvider });
        return {
          id: `outlook_${Date.now()}`,
        };
      });

      return {
        success: true,
        externalId: response.id,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  async rotateCredentials(integrationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const integration = await db
        .select()
        .from(calendarIntegrations)
        .where(eq(calendarIntegrations.id, integrationId));

      if (integration.length === 0) {
        return { success: false, error: 'Integration not found' };
      }

      const int = integration[0];

      // Simulate token refresh based on provider
      if (int.provider === 'google') {
        // In production: use Google OAuth2 to refresh token
        const newAccessToken = `new_google_token_${Date.now()}`;
        const newRefreshToken = int.refreshToken;
        const newExpiresAt = new Date(Date.now() + 3600000); // 1 hour

        await db
          .update(calendarIntegrations)
          .set({
            accessToken: this.encryptToken(newAccessToken),
            refreshToken: newRefreshToken ? this.encryptToken(newRefreshToken) : null,
            tokenExpiresAt: newExpiresAt,
          })
          .where(eq(calendarIntegrations.id, integrationId));
      } else if (int.provider === 'outlook') {
        // In production: use Microsoft OAuth2 to refresh token
        const newAccessToken = `new_outlook_token_${Date.now()}`;
        const newRefreshToken = int.refreshToken;
        const newExpiresAt = new Date(Date.now() + 3600000);

        await db
          .update(calendarIntegrations)
          .set({
            accessToken: this.encryptToken(newAccessToken),
            refreshToken: newRefreshToken ? this.encryptToken(newRefreshToken) : null,
            tokenExpiresAt: newExpiresAt,
          })
          .where(eq(calendarIntegrations.id, integrationId));
      }

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMsg };
    }
  },

  async handleSyncError(error: Error, eventId: string, providerId: string, familyId: string): Promise<void> {
    try {
      await db.insert(calendarSyncLogs).values({
        familyId,
        provider: providerId as 'google' | 'outlook',
        eventId,
        status: 'failed',
        error: error.message,
        metadata: {
          timestamp: new Date().toISOString(),
          retryable: this.isRetryableError(error),
        },
      });
    } catch (logError) {
      console.error('Failed to log sync error:', logError);
    }
  },

  async syncConfirmedEvent(suggestionId: string, familyId: string): Promise<{ google?: boolean; outlook?: boolean }> {
    const suggestion = await db
      .select()
      .from(eventSuggestions)
      .where(eq(eventSuggestions.id, suggestionId));

    if (suggestion.length === 0) {
      throw new Error('Suggestion not found');
    }

    const event = suggestion[0];
    const results = { google: false, outlook: false };

    // Get all active integrations for the family
    const integrations = await db
      .select()
      .from(calendarIntegrations)
      .where(and(eq(calendarIntegrations.familyId, familyId), eq(calendarIntegrations.isActive, true)));

    for (const integration of integrations) {
      try {
        const calendarEvent: CalendarEvent = {
          id: event.id,
          title: event.title,
          startTime: new Date(event.suggestedTime),
          endTime: new Date(new Date(event.suggestedTime).getTime() + 3600000), // 1 hour
          location: event.location || undefined,
          description: event.description || event.rationale || undefined,
        };

        if (integration.provider === 'google') {
          const result = await this.syncEventToGoogle(integration.accessToken, calendarEvent);
          results.google = result.success;

          if (result.success) {
            await db.insert(calendarSyncLogs).values({
              familyId,
              provider: 'google',
              eventId: event.id,
              status: 'synced',
              metadata: { externalId: result.externalId },
            });
          } else {
            await this.handleSyncError(new Error(result.error || 'Unknown error'), event.id, 'google', familyId);
          }
        } else if (integration.provider === 'outlook') {
          const result = await this.syncEventToOutlook(integration.accessToken, calendarEvent);
          results.outlook = result.success;

          if (result.success) {
            await db.insert(calendarSyncLogs).values({
              familyId,
              provider: 'outlook',
              eventId: event.id,
              status: 'synced',
              metadata: { externalId: result.externalId },
            });
          } else {
            await this.handleSyncError(new Error(result.error || 'Unknown error'), event.id, 'outlook', familyId);
          }
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        await this.handleSyncError(err, event.id, integration.provider, familyId);
      }
    }

    return results;
  },

  async getSyncHistory(familyId: string, limit = 50): Promise<any[]> {
    return db
      .select()
      .from(calendarSyncLogs)
      .where(eq(calendarSyncLogs.familyId, familyId))
      .orderBy(calendarSyncLogs.createdAt)
      .limit(limit);
  },

  async getSyncStatus(familyId: string, provider: 'google' | 'outlook'): Promise<{ isActive: boolean; lastSyncAt?: Date; error?: string }> {
    const integration = await db
      .select()
      .from(calendarIntegrations)
      .where(and(eq(calendarIntegrations.familyId, familyId), eq(calendarIntegrations.provider, provider)));

    if (integration.length === 0) {
      return { isActive: false };
    }

    return {
      isActive: integration[0].isActive ?? false,
      lastSyncAt: integration[0].lastSyncAt || undefined,
    };
  },

  async retryOperation<T>(operation: () => Promise<T>, retries = 0): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries < MAX_RETRIES && this.isRetryableError(error)) {
        const backoff = INITIAL_BACKOFF * Math.pow(2, retries);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        return this.retryOperation(operation, retries + 1);
      }
      throw error;
    }
  },

  isRetryableError(error: any): boolean {
    // Network errors, timeouts, and rate limiting are retryable
    const message = error?.message || '';
    return (
      message.includes('timeout') ||
      message.includes('429') ||
      message.includes('ECONNRESET') ||
      message.includes('ECONNREFUSED')
    );
  },
};
