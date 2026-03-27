import { db } from "../../db/index.server";
import { errorLogs, type NewErrorLog } from "../../db/schema";

interface ErrorFilter {
  level?: string;
  service?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class ErrorLoggingService {
  /**
   * Log an error to the database
   */
  async logError(
    message: string,
    level: "error" | "warn" | "info" = "error",
    metadata?: {
      stack?: string;
      json_payload?: Record<string, any>;
      service?: string;
      env?: string;
      [key: string]: any;
    }
  ) {
    try {
      const errorLog: NewErrorLog = {
        message,
        level,
        timestamp: new Date(),
        stack: metadata?.stack,
        json_payload: metadata?.json_payload,
        service: metadata?.service || process.env.NODE_ENV || "unknown",
        env: metadata?.env || process.env.NODE_ENV,
        metadata: metadata ? { ...metadata } : null,
      };

      const result = await db.insert(errorLogs).values(errorLog).returning();
      return result[0];
    } catch (error: any) {
      console.error("Error logging error:", error);
      throw error;
    }
  }

  /**
   * Query errors with filters and pagination
   */
  async queryErrors(filter: ErrorFilter = {}) {
    try {
      // Return sample data for now - actual queries would go here
      // In production, this would use db.select().from(errorLogs).where(...)
      return [];
    } catch (error: any) {
      console.error("Error querying errors:", error);
      throw error;
    }
  }

  /**
   * Get error summary stats
   */
  async getErrorSummary(timeWindowMinutes: number = 60) {
    try {
      // Return sample data for now
      const summary = {
        totalErrors: 0,
        byLevel: {
          error: 0,
          warn: 0,
          info: 0,
        },
        byService: {} as Record<string, number>,
      };

      return summary;
    } catch (error: any) {
      console.error("Error getting error summary:", error);
      throw error;
    }
  }
}

export const errorLoggingService = new ErrorLoggingService();
