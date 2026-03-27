import { router, procedure, adminProcedure } from "../trpc";
import { z } from "zod";
import { count, desc, sql, eq, and } from "drizzle-orm";
import {
  users,
  families,
  auditLog,
  subscriptionTiers,
  photoDigitizationOrders,
  familyMembers,
  type NewSubscriptionTier,
} from "~/db/schema";
import { photoDigitizationInternalStorageService } from "../../services/photoDigitizationInternalStorage.service";

/**
 * Helper function to verify admin access
 * Checks if user has admin role in any family
 */
async function requireAdminAccess(ctx: any) {
  if (!ctx.user?.id) {
    throw new Error("User must be authenticated");
  }

  const [userMembership] = await ctx.db
    .select()
    .from(familyMembers)
    .where(
      and(
        eq(familyMembers.userId, ctx.user.id),
        eq(familyMembers.role, "admin")
      )
    )
    .limit(1);

  if (!userMembership) {
    throw new Error("Only admins can access this resource");
  }
}

export const adminRouter = router({
  getDashboardStats: adminProcedure.query(async ({ ctx }: { ctx: any }) => {
    if (!ctx.user?.id) throw new Error("Not authenticated");
    // Get total users
    const totalUsersResult = await ctx.db
      .select({ count: count() })
      .from(users);
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get total families
    const totalFamiliesResult = await ctx.db
      .select({ count: count() })
      .from(families);
    const totalFamilies = totalFamiliesResult[0]?.count || 0;

    // Get total messages - placeholder
    const totalMessages = 0;

    // Get flagged items count - placeholder
    const flaggedItems = 0;

    // Get pending reviews count - placeholder
    const pendingReviews = 0;

    // Active users (last 7 days) - placeholder
    const activeUsers = Math.floor(totalUsers * 0.7);

    return {
      totalUsers,
      totalFamilies,
      totalMessages,
      flaggedItems,
      activeUsers,
      pendingReviews,
    };
  }),

  getRecentActivity: adminProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ ctx, input }: { ctx: any; input: any }) => {
      if (!ctx.user?.id) throw new Error("Not authenticated");
      
      const activities = await ctx.db
        .select()
        .from(auditLog)
        .orderBy(desc(auditLog.createdAt))
        .limit(input.limit);

      return activities.map((activity: any) => ({
        id: activity.id,
        type: (activity.actionType || "unknown") as
          | "user_joined"
          | "message_flagged"
          | "content_reviewed"
          | "family_created",
        description: activity.description || "Unknown action",
        timestamp: activity.createdAt,
        severity: (activity.severity || "info") as
          | "info"
          | "warning"
          | "error",
      }));
    }),

  /**
   * Admin: Create a new subscription plan
   */
  createSubscriptionPlan: adminProcedure
    .input(
      z.object({
        id: z.string().min(1, "Plan ID required").max(50),
        name: z.string().min(1, "Plan name required").max(100),
        description: z.string().max(500).optional(),
        priceMonthly: z.number().int().min(0).nullable().optional(),
        priceYearly: z.number().int().min(0).nullable().optional(),
        stripePriceIdMonthly: z.string().optional(),
        stripePriceIdYearly: z.string().optional(),
        stripeProductId: z.string().optional(),
        trialDays: z.number().int().min(0).default(14),
        features: z.record(z.string(), z.boolean()).default(() => ({})),
        maxFamilyMembers: z.number().int().nullable().optional(),
        maxStorageGB: z.number().int().nullable().optional(),
        maxMediaLibraryItems: z.number().int().nullable().optional(),
        displayOrder: z.number().int().default(0),
        internalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      if (!ctx.user?.id) throw new Error("Not authenticated");

      try {
        // Check for duplicate plan
        const [existing] = await ctx.db
          .select()
          .from(subscriptionTiers)
          .where(eq(subscriptionTiers.id, input.id))
          .limit(1);

        if (existing) {
          throw new Error("Plan with this ID already exists");
        }

        // Create the plan
        const tierData: NewSubscriptionTier = {
          id: input.id,
          name: input.name,
          description: input.description || null,
          priceMonthly: input.priceMonthly ?? null,
          priceYearly: input.priceYearly ?? null,
          stripePriceIdMonthly: input.stripePriceIdMonthly || null,
          stripePriceIdYearly: input.stripePriceIdYearly || null,
          stripeProductId: input.stripeProductId || null,
          trialDays: input.trialDays,
          features: input.features as Record<string, boolean>,
          maxFamilyMembers: input.maxFamilyMembers ?? null,
          maxStorageGB: input.maxStorageGB ?? null,
          maxMediaLibraryItems: input.maxMediaLibraryItems ?? null,
          displayOrder: input.displayOrder,
          internalNotes: input.internalNotes || null,
          isActive: true,
        };

        const newPlan = await ctx.db
          .insert(subscriptionTiers)
          .values(tierData)
          .returning();

        const createdPlan = Array.isArray(newPlan) ? newPlan[0] : newPlan;

        // Log audit
        await ctx.db.insert(auditLog).values({
          actionType: "plan_created",
          actorId: ctx.user.id,
          targetId: createdPlan.id,
          targetType: "subscription_tier",
          description: `Created plan: ${createdPlan.name}`,
        });

        return createdPlan;
      } catch (error) {
        console.error("Error creating plan:", error);
        throw new Error(
          error instanceof Error ? error.message : "Failed to create plan"
        );
      }
    }),

  /**
   * Admin: Update a subscription plan
   */
  updateSubscriptionPlan: adminProcedure
    .input(
      z.object({
        id: z.string().min(1, "Plan ID required"),
        name: z.string().min(1, "Plan name required").optional(),
        description: z.string().max(500).optional(),
        priceMonthly: z.number().int().min(0).nullable().optional(),
        priceYearly: z.number().int().min(0).nullable().optional(),
        stripePriceIdMonthly: z.string().optional(),
        stripePriceIdYearly: z.string().optional(),
        features: z.record(z.string(), z.boolean()).optional(),
        maxFamilyMembers: z.number().int().nullable().optional(),
        maxStorageGB: z.number().int().nullable().optional(),
        maxMediaLibraryItems: z.number().int().nullable().optional(),
        displayOrder: z.number().int().optional(),
        internalNotes: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      if (!ctx.user?.id) throw new Error("Not authenticated");

      try {
        // Check if plan exists
        const [existing] = await ctx.db
          .select()
          .from(subscriptionTiers)
          .where(eq(subscriptionTiers.id, input.id))
          .limit(1);

        if (!existing) {
          throw new Error("Plan not found");
        }

        // Build update object with only provided fields
        const updateData: Record<string, any> = {
          updatedAt: new Date(),
        };

        if (input.name !== undefined) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.priceMonthly !== undefined) updateData.priceMonthly = input.priceMonthly;
        if (input.priceYearly !== undefined) updateData.priceYearly = input.priceYearly;
        if (input.stripePriceIdMonthly !== undefined)
          updateData.stripePriceIdMonthly = input.stripePriceIdMonthly;
        if (input.stripePriceIdYearly !== undefined)
          updateData.stripePriceIdYearly = input.stripePriceIdYearly;
        if (input.features !== undefined) updateData.features = input.features;
        if (input.maxFamilyMembers !== undefined)
          updateData.maxFamilyMembers = input.maxFamilyMembers;
        if (input.maxStorageGB !== undefined) updateData.maxStorageGB = input.maxStorageGB;
        if (input.maxMediaLibraryItems !== undefined)
          updateData.maxMediaLibraryItems = input.maxMediaLibraryItems;
        if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;
        if (input.internalNotes !== undefined)
          updateData.internalNotes = input.internalNotes;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;

        const [updated] = await ctx.db
          .update(subscriptionTiers)
          .set(updateData)
          .where(eq(subscriptionTiers.id, input.id))
          .returning();

        // Log audit
        await ctx.db.insert(auditLog).values({
          actionType: "plan_updated",
          actorId: ctx.user.id,
          targetId: updated.id,
          targetType: "subscription_tier",
          description: `Updated plan: ${updated.name}`,
        });

        return updated;
      } catch (error) {
        console.error("Error updating plan:", error);
        throw new Error(
          error instanceof Error ? error.message : "Failed to update plan"
        );
      }
    }),

  /**
   * Admin: Delete a subscription plan (soft delete)
   */
  deleteSubscriptionPlan: adminProcedure
    .input(z.object({ id: z.string().min(1, "Plan ID required") }))
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      if (!ctx.user?.id) throw new Error("Not authenticated");

      try {
        // Check if plan exists
        const [existing] = await ctx.db
          .select()
          .from(subscriptionTiers)
          .where(eq(subscriptionTiers.id, input.id))
          .limit(1);

        if (!existing) {
          throw new Error("Plan not found");
        }

        // Soft delete the plan
        const [deleted] = await ctx.db
          .update(subscriptionTiers)
          .set({
            isDeleted: true,
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(subscriptionTiers.id, input.id))
          .returning();

        // Log audit
        await ctx.db.insert(auditLog).values({
          actionType: "plan_deleted",
          actorId: ctx.user.id,
          targetId: deleted.id,
          targetType: "subscription_tier",
          description: `Deleted plan: ${deleted.name}`,
        });

        return deleted;
      } catch (error) {
        console.error("Error deleting plan:", error);
        throw new Error(
          error instanceof Error ? error.message : "Failed to delete plan"
        );
      }
    }),

  /**
   * Admin: Get photo digitization dashboard data
   * Returns aggregated data for dashboard - payment stats, order counts by status, recent activity
   * Requires admin role verification
   */
  getPhotoDigitizationDashboardData: procedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(10).optional(),
      })
    )
    .query(async ({ ctx, input }: { ctx: any; input: any }) => {
      // Verify admin access
      await requireAdminAccess(ctx);

      try {
        // Get all orders grouped by status
        const allOrders = await ctx.db
          .select()
          .from(photoDigitizationOrders)
          .orderBy(desc(photoDigitizationOrders.submittedAt))
          .limit(input.limit || 50);

        // Count by status
        const statusCounts = {
          inquiry_submitted: 0,
          quantity_verified: 0,
          payment_pending: 0,
          payment_confirmed: 0,
          in_processing: 0,
          completed: 0,
          cancelled: 0,
        };

        const paymentStats = {
          pending: 0,
          confirmed: 0,
          failed: 0,
          total: 0,
          totalRevenue: "0",
        };

        allOrders.forEach((order: any) => {
          const status = order.status as keyof typeof statusCounts;
          if (status in statusCounts) {
            statusCounts[status]++;
          }

          if (order.status === "payment_pending") {
            paymentStats.pending++;
          } else if (order.status === "payment_confirmed") {
            paymentStats.confirmed++;
            if (order.estimatedPrice) {
              paymentStats.totalRevenue = String(
                Number(paymentStats.totalRevenue) + Number(order.estimatedPrice)
              );
            }
          }
          paymentStats.total++;
        });

        // Get recent orders
        const recentOrders = allOrders.slice(0, 5);

        return {
          success: true,
          summary: {
            totalOrders: allOrders.length,
            statusCounts,
            paymentStats,
          },
          recentOrders,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("Error getting photo digitization dashboard data:", error);
        throw new Error(
          error instanceof Error
            ? error.message
            : "Failed to get dashboard data"
        );
      }
    }),
});
