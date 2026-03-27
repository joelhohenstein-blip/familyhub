import { z } from "zod";
import { router, procedure } from "../trpc";
import { healthCheckService } from "../../services/HealthCheckService";
import { errorLoggingService } from "../../services/ErrorLoggingService";
import { alertingService } from "../../services/AlertingService";

const ErrorsListInput = z.object({
  level: z.enum(["error", "warn", "info"]).optional(),
  service: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().default(50),
  offset: z.number().default(0),
});

const ErrorsSummaryInput = z.object({
  timeWindowMinutes: z.number().default(60),
});

const ErrorsAcknowledgeInput = z.object({
  errorId: z.number(),
});

const AlertsAcknowledgeInput = z.object({
  alertId: z.string(),
});

const ErrorRateCheckInput = z.object({
  thresholdPercent: z.number().default(5),
});

export const maintenanceRouter = router({
  health: router({
    /**
     * Get overall health status
     */
    status: procedure.query(async () => {
      try {
        const health = await healthCheckService.getOverallHealth();
        return health;
      } catch (error) {
        console.error("Error getting health status:", error);
        throw error;
      }
    }),

    /**
     * Get per-component health details
     */
    components: procedure.query(async () => {
      try {
        const health = await healthCheckService.getOverallHealth();
        return health.components;
      } catch (error) {
        console.error("Error getting components:", error);
        throw error;
      }
    }),
  }),

  errors: router({
    /**
     * Get error logs with filters
     */
    list: procedure
      .input(ErrorsListInput)
      .query(async ({ input }) => {
        try {
          const errors = await errorLoggingService.queryErrors({
            level: input.level,
            service: input.service,
            startDate: input.startDate,
            endDate: input.endDate,
            limit: input.limit,
            offset: input.offset,
          });

          return {
            errors,
            total: errors.length,
            limit: input.limit,
            offset: input.offset,
          };
        } catch (error) {
          console.error("Error listing errors:", error);
          throw error;
        }
      }),

    /**
     * Get error summary
     */
    summary: procedure
      .input(ErrorsSummaryInput)
      .query(async ({ input }) => {
        try {
          const summary = await errorLoggingService.getErrorSummary(input.timeWindowMinutes);
          return summary;
        } catch (error) {
          console.error("Error getting error summary:", error);
          throw error;
        }
      }),

    /**
     * Acknowledge an error (mark as handled)
     */
    acknowledge: procedure
      .input(ErrorsAcknowledgeInput)
      .mutation(async ({ input }) => {
        try {
          // Mark error as acknowledged (simplified)
          return { success: true, errorId: input.errorId };
        } catch (error) {
          console.error("Error acknowledging error:", error);
          throw error;
        }
      }),
  }),

  alerts: router({
    /**
     * Get active alerts
     */
    list: procedure.query(async () => {
      try {
        const alerts = alertingService.getActiveAlerts();
        return alerts;
      } catch (error) {
        console.error("Error listing alerts:", error);
        throw error;
      }
    }),

    /**
     * Acknowledge an alert
     */
    acknowledge: procedure
      .input(AlertsAcknowledgeInput)
      .mutation(async ({ input }) => {
        try {
          const alert = await alertingService.acknowledgeAlert(input.alertId);
          return alert;
        } catch (error) {
          console.error("Error acknowledging alert:", error);
          throw error;
        }
      }),

    /**
     * Evaluate error rate and check for alerts
     */
    checkErrorRate: procedure
      .input(ErrorRateCheckInput)
      .query(async ({ input }) => {
        try {
          const alerts = await alertingService.checkErrorRate(input.thresholdPercent);
          return alerts;
        } catch (error) {
          console.error("Error checking error rate:", error);
          throw error;
        }
      }),
  }),

  metrics: router({
    /**
     * Get key metrics summary
     */
    summary: procedure.query(async () => {
      try {
        const errorSummary = await errorLoggingService.getErrorSummary(60);
        const health = await healthCheckService.getOverallHealth();
        const activeAlerts = alertingService.getActiveAlerts();

        return {
          errorRate: errorSummary.totalErrors,
          errorsByLevel: errorSummary.byLevel,
          errorsByService: errorSummary.byService,
          healthStatus: health.status,
          healthComponents: health.components,
          activeAlerts: activeAlerts.length,
          uptime: process.uptime(),
        };
      } catch (error) {
        console.error("Error getting metrics summary:", error);
        throw error;
      }
    }),
  }),
});
