import { z } from "zod";
import { router, procedure } from "../trpc";
import {
  resourcePermissionsTable,
  familyMembers,
  users,
  families,
} from "../../../db/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import { logAction } from "../../../utils/auditLog.server";

// Zod schemas for validation
const grantPermissionSchema = z.object({
  familyId: z.string().uuid(),
  userId: z.string().uuid(),
  resourceType: z.string().min(1),
  resourceId: z.string().uuid(),
  permission: z.string().min(1),
});

const revokePermissionSchema = z.object({
  familyId: z.string().uuid(),
  permissionId: z.string().uuid(),
});

const getResourcePermissionsSchema = z.object({
  familyId: z.string().uuid(),
  resourceType: z.string(),
  resourceId: z.string().uuid(),
});

const checkPermissionSchema = z.object({
  familyId: z.string().uuid(),
  userId: z.string().uuid(),
  resourceType: z.string(),
  resourceId: z.string().uuid(),
  permission: z.string(),
});

const validatePermissionPolicySchema = z.object({
  permission: z.string(),
  resourceType: z.string(),
});

// Policy validation - define allowed permissions per resource type
const PERMISSION_POLICY: Record<string, string[]> = {
  calendar: ["read", "write", "delete", "admin"],
  albums: ["read", "write", "delete", "admin"],
  posts: ["read", "write", "delete", "admin"],
  messages: ["read", "write", "delete", "admin"],
  messages_board: ["read", "write", "delete", "admin"],
  calls: ["read", "initiate", "admin"],
  video_calls: ["read", "initiate", "admin"],
  audio_calls: ["read", "initiate", "admin"],
  weather: ["read"],
  streaming: ["read", "admin"],
  games: ["read", "play", "admin"],
};

export const permissionsRouter = router({
  // Grant permission on a resource
  grantPermission: procedure
    .input(grantPermissionSchema)
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
        throw new Error("Only family admins can grant permissions");
      }

      // Validate the permission exists in policy
      const allowedPermissions = PERMISSION_POLICY[input.resourceType];
      if (!allowedPermissions || !allowedPermissions.includes(input.permission)) {
        throw new Error(
          `Invalid permission "${input.permission}" for resource type "${input.resourceType}"`
        );
      }

      // Check if user exists and is a member of the family
      const targetMember = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, input.userId)
          )
        )
        .limit(1);

      if (!targetMember.length) {
        throw new Error("User is not a member of this family");
      }

      // Check if permission already exists and is active
      const existingPermission = await ctx.db
        .select()
        .from(resourcePermissionsTable)
        .where(
          and(
            eq(resourcePermissionsTable.familyId, input.familyId),
            eq(resourcePermissionsTable.userId, input.userId),
            eq(resourcePermissionsTable.resourceType, input.resourceType),
            eq(resourcePermissionsTable.resourceId, input.resourceId),
            eq(resourcePermissionsTable.permission, input.permission),
            isNull(resourcePermissionsTable.revokedAt)
          )
        )
        .limit(1);

      if (existingPermission.length) {
        throw new Error("User already has this permission");
      }

      // Grant the permission
      const [permission] = await ctx.db
        .insert(resourcePermissionsTable)
        .values({
          familyId: input.familyId,
          userId: input.userId,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          permission: input.permission,
          grantedBy: ctx.user.id,
          grantedAt: new Date(),
        })
        .returning();

      // Log the action
      await logAction({
        actionType: "GRANT_PERMISSION",
        actorId: ctx.user.id,
        targetId: input.userId,
        targetType: "permission",
        description: `Admin granted permission "${input.permission}" on ${input.resourceType} to user ${input.userId}`,
        metadata: {
          familyId: input.familyId,
          userId: input.userId,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          permission: input.permission,
        },
      });

      return { permission };
    }),

  // Revoke permission on a resource
  revokePermission: procedure
    .input(revokePermissionSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Get the permission to revoke
      const [permission] = await ctx.db
        .select()
        .from(resourcePermissionsTable)
        .where(eq(resourcePermissionsTable.id, input.permissionId))
        .limit(1);

      if (!permission) {
        throw new Error("Permission not found");
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
        throw new Error("Only family admins can revoke permissions");
      }

      // Revoke the permission
      const [revokedPermission] = await ctx.db
        .update(resourcePermissionsTable)
        .set({
          revokedAt: new Date(),
          revokedBy: ctx.user.id,
        })
        .where(eq(resourcePermissionsTable.id, input.permissionId))
        .returning();

      // Log the action
      await logAction({
        actionType: "REVOKE_PERMISSION",
        actorId: ctx.user.id,
        targetId: permission.userId,
        targetType: "permission",
        description: `Admin revoked permission "${permission.permission}" on ${permission.resourceType} from user ${permission.userId}`,
        metadata: {
          familyId: input.familyId,
          userId: permission.userId,
          resourceType: permission.resourceType,
          resourceId: permission.resourceId,
          permission: permission.permission,
          permissionId: input.permissionId,
        },
      });

      return { permission: revokedPermission };
    }),

  // Get all permissions for a resource
  getResourcePermissions: procedure
    .input(getResourcePermissionsSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Verify user is member of the family
      const userMembership = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!userMembership.length) {
        throw new Error("You are not a member of this family");
      }

      // Get all active permissions for this resource
      const permissions = await ctx.db
        .select()
        .from(resourcePermissionsTable)
        .innerJoin(users, eq(resourcePermissionsTable.userId, users.id))
        .where(
          and(
            eq(resourcePermissionsTable.familyId, input.familyId),
            eq(resourcePermissionsTable.resourceType, input.resourceType),
            eq(resourcePermissionsTable.resourceId, input.resourceId),
            isNull(resourcePermissionsTable.revokedAt)
          )
        );

      return { permissions };
    }),

  // Check if user has permission (performance optimized - <50ms)
  checkPermission: procedure
    .input(checkPermissionSchema)
    .query(async ({ ctx, input }) => {
      const startTime = Date.now();

      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Quick check: verify user is member of family first
      const userMembership = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, input.userId)
          )
        )
        .limit(1);

      if (!userMembership.length) {
        return { hasPermission: false, performanceMs: Date.now() - startTime };
      }

      // Check for explicit permission
      const permission = await ctx.db
        .select()
        .from(resourcePermissionsTable)
        .where(
          and(
            eq(resourcePermissionsTable.familyId, input.familyId),
            eq(resourcePermissionsTable.userId, input.userId),
            eq(resourcePermissionsTable.resourceType, input.resourceType),
            eq(resourcePermissionsTable.resourceId, input.resourceId),
            eq(resourcePermissionsTable.permission, input.permission),
            isNull(resourcePermissionsTable.revokedAt)
          )
        )
        .limit(1);

      const hasPermission = permission.length > 0;
      const performanceMs = Date.now() - startTime;

      // Ensure we're under the 50ms requirement
      if (performanceMs > 50) {
        console.warn(
          `Permission check took ${performanceMs}ms (should be <50ms) for user ${input.userId}`
        );
      }

      return { hasPermission, performanceMs };
    }),

  // Get all permissions for a user in a family
  getUserPermissions: procedure
    .input(
      z.object({
        familyId: z.string().uuid(),
        userId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      // Verify user is member of the family
      const userMembership = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!userMembership.length) {
        throw new Error("You are not a member of this family");
      }

      // Get all active permissions for the user
      const permissions = await ctx.db
        .select()
        .from(resourcePermissionsTable)
        .where(
          and(
            eq(resourcePermissionsTable.familyId, input.familyId),
            eq(resourcePermissionsTable.userId, input.userId),
            isNull(resourcePermissionsTable.revokedAt)
          )
        );

      // Group by resource type
      const grouped = permissions.reduce(
        (acc, perm) => {
          if (!acc[perm.resourceType]) {
            acc[perm.resourceType] = [];
          }
          acc[perm.resourceType].push(perm);
          return acc;
        },
        {} as Record<string, typeof permissions>
      );

      return { permissions: grouped, total: permissions.length };
    }),
});
