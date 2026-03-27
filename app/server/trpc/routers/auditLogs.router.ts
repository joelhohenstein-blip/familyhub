import { z } from "zod";
import { router, procedure } from "../trpc";
import { auditLog, familyMembers, users } from "../../../db/schema";
import { eq, and, gte, lte, ilike, desc } from "drizzle-orm";

const getAuditLogsSchema = z.object({
  familyId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  actionType: z.string().optional(),
  resourceType: z.string().optional(),
  targetId: z.string().uuid().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

const getAccessChangesSchema = z.object({
  familyId: z.string().uuid(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

const getAggregatedInsightsSchema = z.object({
  familyId: z.string().uuid(),
  days: z.number().int().positive().max(90).default(7),
});

export const auditLogsRouter = router({
  // Get audit logs with filtering
  getAuditLogs: procedure
    .input(getAuditLogsSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Verify user is admin of the family
      const adminMembership = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id),
            eq(familyMembers.role, "admin")
          )
        )
        .limit(1);

      if (!adminMembership.length) {
        throw new Error("Only family admins can view audit logs");
      }

      // Build filter conditions
      const conditions = [eq(auditLog.familyId, input.familyId)];

      if (input.userId) {
        conditions.push(eq(auditLog.actorId, input.userId));
      }

      if (input.actionType) {
        // Support blur-specific filtering: if actionType contains 'BLUR', match any blur-related action
        if (input.actionType.toUpperCase().includes('BLUR')) {
          const blurActions = [
            'AUTO_BLUR_APPLIED',
            'BLUR_TOGGLED',
            'SESSION_BLUR_TOGGLED',
            'FORCE_BLUR_APPLIED',
            'ASSIGN_CLEARANCE',
          ];
          // Filter logs where actionType matches any blur-related action
          const allLogs = await ctx.db
            .select()
            .from(auditLog)
            .where(and(
              eq(auditLog.familyId, input.familyId),
              ...(conditions.length > 0 ? conditions : [])
            ));
          
          const blurLogs = allLogs.filter((log) =>
            blurActions.some((action) => log.actionType.includes(action))
          );
          
          // Return early with blur-filtered results
          const totalLogs = blurLogs.length;
          const page = input.page;
          const limit = input.limit;
          const offset = (page - 1) * limit;
          
          const paginatedLogs = blurLogs
            .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
            .slice(offset, offset + limit);
          
          return {
            logs: paginatedLogs,
            pagination: {
              page,
              limit,
              offset,
              totalLogs,
              totalPages: Math.ceil(totalLogs / limit),
            },
          };
        } else {
          conditions.push(ilike(auditLog.actionType, `%${input.actionType}%`));
        }
      }

      if (input.targetId) {
        conditions.push(eq(auditLog.targetId, input.targetId));
      }

      if (input.resourceType) {
        conditions.push(eq(auditLog.targetType, input.resourceType));
      }

      if (input.startDate) {
        conditions.push(gte(auditLog.createdAt, input.startDate));
      }

      if (input.endDate) {
        const endOfDay = new Date(input.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        conditions.push(lte(auditLog.createdAt, endOfDay));
      }

      // Get total count
      const countResult = await ctx.db
        .select()
        .from(auditLog)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const totalLogs = countResult.length;

      // Calculate pagination
      const page = input.page;
      const limit = input.limit;
      const offset = (page - 1) * limit;

      // Fetch paginated logs, ordered by creation date descending
      const logs = await ctx.db
        .select()
        .from(auditLog)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(auditLog.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        logs,
        pagination: {
          page,
          limit,
          offset,
          totalLogs,
          totalPages: Math.ceil(totalLogs / limit),
        },
      };
    }),

  // Get role and permission changes specifically
  getAccessChanges: procedure
    .input(getAccessChangesSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Verify user is admin of the family
      const adminMembership = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id),
            eq(familyMembers.role, "admin")
          )
        )
        .limit(1);

      if (!adminMembership.length) {
        throw new Error("Only family admins can view access changes");
      }

      // Build filter conditions for access-related actions
      const conditions = [eq(auditLog.familyId, input.familyId)];

      // Filter for role and permission related actions
      const accessActions = [
        "ASSIGN_ROLE",
        "GRANT_PERMISSION",
        "REVOKE_PERMISSION",
        "DEACTIVATE_MEMBER",
        "REACTIVATE_MEMBER",
      ];

      if (input.startDate) {
        conditions.push(gte(auditLog.createdAt, input.startDate));
      }

      if (input.endDate) {
        const endOfDay = new Date(input.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        conditions.push(lte(auditLog.createdAt, endOfDay));
      }

      // Get total count
      let query = ctx.db
        .select()
        .from(auditLog)
        .where(and(...conditions));

      // Filter by access-related action types in memory (since we can't easily use IN with conditions array)
      const allLogs = await query;
      const filteredLogs = allLogs.filter((log) =>
        accessActions.some(
          (action) =>
            log.actionType === action ||
            log.actionType.includes("ROLE") ||
            log.actionType.includes("PERMISSION")
        )
      );

      const totalChanges = filteredLogs.length;

      // Calculate pagination
      const page = input.page;
      const limit = input.limit;
      const offset = (page - 1) * limit;

      const paginatedLogs = filteredLogs
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
        .slice(offset, offset + limit);

      return {
        logs: paginatedLogs,
        pagination: {
          page,
          limit,
          offset,
          totalChanges,
          totalPages: Math.ceil(totalChanges / limit),
        },
      };
    }),

  // Get aggregated insights for dashboard
  getAggregatedInsights: procedure
    .input(getAggregatedInsightsSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Verify user is admin of the family
      const adminMembership = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id),
            eq(familyMembers.role, "admin")
          )
        )
        .limit(1);

      if (!adminMembership.length) {
        throw new Error("Only family admins can view insights");
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // Get all relevant logs for the period
      const logs = await ctx.db
        .select()
        .from(auditLog)
        .where(
          and(
            eq(auditLog.familyId, input.familyId),
            gte(auditLog.createdAt, startDate),
            lte(auditLog.createdAt, endDate)
          )
        )
        .orderBy(desc(auditLog.createdAt));

      // Aggregate insights
      const roleChanges = logs.filter((log) => log.actionType === "ASSIGN_ROLE");
      const permissionGrants = logs.filter(
        (log) => log.actionType === "GRANT_PERMISSION"
      );
      const permissionRevokes = logs.filter(
        (log) => log.actionType === "REVOKE_PERMISSION"
      );
      const memberDeactivations = logs.filter(
        (log) => log.actionType === "DEACTIVATE_MEMBER"
      );
      const memberReactivations = logs.filter(
        (log) => log.actionType === "REACTIVATE_MEMBER"
      );

      // Count by actor (who made the changes)
      const changesByActor = logs.reduce(
        (acc, log) => {
          const actor = log.actorId || "Unknown";
          if (!acc[actor]) {
            acc[actor] = 0;
          }
          acc[actor]++;
          return acc;
        },
        {} as Record<string, number>
      );

      // Count by action type
      const changesByType = logs.reduce(
        (acc, log) => {
          const action = log.actionType || "Unknown";
          if (!acc[action]) {
            acc[action] = 0;
          }
          acc[action]++;
          return acc;
        },
        {} as Record<string, number>
      );

      // Get recent changes (last 5)
      const recentChanges = logs.slice(0, 5);

      // Get most active admins
      const adminMemberships = await ctx.db
        .select()
        .from(familyMembers)
        .innerJoin(users, eq(familyMembers.userId, users.id))
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.role, "admin")
          )
        );

      const adminChangeActivity: Record<string, number> = {};
      adminMemberships.forEach((membership) => {
        const adminId = membership.family_members.userId;
        adminChangeActivity[adminId] =
          changesByActor[adminId] || 0;
      });

      // Get most active members (by number of access changes)
      const topModifiedMembers = logs
        .filter((log) => log.targetId)
        .reduce(
          (acc, log) => {
            const targetId = log.targetId || "Unknown";
            if (!acc[targetId]) {
              acc[targetId] = 0;
            }
            acc[targetId]++;
            return acc;
          },
          {} as Record<string, number>
        );

      return {
        summary: {
          totalChanges: logs.length,
          roleChanges: roleChanges.length,
          permissionGrants: permissionGrants.length,
          permissionRevokes: permissionRevokes.length,
          memberDeactivations: memberDeactivations.length,
          memberReactivations: memberReactivations.length,
        },
        changesByActor,
        changesByType,
        adminActivity: adminChangeActivity,
        topModifiedMembers,
        recentChanges,
        periodDays: input.days,
        startDate,
        endDate,
      };
    }),

  // Get all logs for export (CSV)
  exportAuditLogs: procedure
    .input(
      z.object({
        familyId: z.string().uuid(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        filterByBlur: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Verify user is admin of the family
      const adminMembership = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id),
            eq(familyMembers.role, "admin")
          )
        )
        .limit(1);

      if (!adminMembership.length) {
        throw new Error("Only family admins can export audit logs");
      }

      // Build conditions
      const conditions = [eq(auditLog.familyId, input.familyId)];

      if (input.startDate) {
        conditions.push(gte(auditLog.createdAt, input.startDate));
      }

      if (input.endDate) {
        const endOfDay = new Date(input.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        conditions.push(lte(auditLog.createdAt, endOfDay));
      }

      // Get all logs for export
      let logs = await ctx.db
        .select()
        .from(auditLog)
        .where(and(...conditions))
        .orderBy(desc(auditLog.createdAt));

      // Filter by blur events if requested
      if (input.filterByBlur) {
        const blurActions = [
          'AUTO_BLUR_APPLIED',
          'BLUR_TOGGLED',
          'SESSION_BLUR_TOGGLED',
          'FORCE_BLUR_APPLIED',
          'ASSIGN_CLEARANCE',
        ];
        logs = logs.filter((log) =>
          blurActions.some((action) => log.actionType.includes(action))
        );
      }

      // Get actor user emails for government-grade formatting
      const actorIds = [...new Set(logs.map((log) => log.actorId).filter(Boolean))];
      const actorEmails: Record<string, string> = {};
      
      if (actorIds.length > 0) {
        const actorUsers = await ctx.db
          .select()
          .from(users);
        
        actorIds.forEach((actorId) => {
          const user = actorUsers.find((u) => u.id === actorId);
          actorEmails[actorId] = user?.email || actorId;
        });
      }

      // Format for CSV export with government-grade formatting
      const csvData = logs.map((log) => {
        const metadata = log.metadata || {};
        const metadataStr = JSON.stringify(metadata);
        
        return {
          timestamp: log.createdAt?.toISOString() || "",
          actor_email: actorEmails[log.actorId] || log.actorId || "SYSTEM",
          action_type: log.actionType,
          target_resource: log.targetId || "N/A",
          target_type: log.targetType || "N/A",
          description: log.description || "",
          metadata_json: metadataStr,
          record_id: log.id,
        };
      });

      return { 
        logs: csvData, 
        count: logs.length,
        exportedAt: new Date().toISOString(),
        familyId: input.familyId,
      };
    }),
});
