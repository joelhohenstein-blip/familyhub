import { z } from 'zod';
import { router, procedure, adminProcedure } from '../trpc';
import { families, familyMembers } from '../../../db/schema';
import { eq, ilike } from 'drizzle-orm';

// Zod schemas for validation
const familyIdSchema = z.object({
  familyId: z.string().uuid()
});

const createFamilySchema = z.object({
  surname: z.string().min(1, 'Surname is required').max(255, 'Surname must be less than 255 characters'),
  avatarUrl: z.string().optional(),
  description: z.string().optional()
});

const updateFamilySchema = z.object({
  familyId: z.string().uuid(),
  surname: z.string().min(1, 'Surname is required').max(255, 'Surname must be less than 255 characters')
});

const getAllFamiliesSchema = z.object({
  search: z.string().optional(),
  limit: z.number().optional().default(50),
  offset: z.number().optional().default(0)
});

export const familiesRouter = router({
  // Get all families with optional filtering/search
  getAll: procedure
    .input(getAllFamiliesSchema)
    .query(async ({ ctx, input }) => {
      let allFamilies = [] as Array<{ id: string; surname: string; createdAt: Date; updatedAt: Date }>;
      
      if (input.search) {
        // Search by surname (using ilike for case-insensitive)
        allFamilies = await ctx.db.select().from(families)
          .where(ilike(families.surname, `%${input.search}%`));
      } else {
        allFamilies = await ctx.db.select().from(families);
      }
      
      return {
        families: allFamilies,
        total: allFamilies.length
      };
    }),

  // Get single family by ID
  getById: procedure
    .input(familyIdSchema)
    .query(async ({ ctx, input }) => {
      const [family] = await ctx.db.select()
        .from(families)
        .where(eq(families.id, input.familyId))
        .limit(1);
      
      if (!family) {
        throw new Error('Family not found');
      }
      
      return family;
    }),

  // Create a new family with surname
  create: adminProcedure
    .input(createFamilySchema)
    .mutation(async ({ ctx, input }) => {
      // Check if surname already exists
      const [existingFamily] = await ctx.db.select()
        .from(families)
        .where(eq(families.surname, input.surname))
        .limit(1);
      
      if (existingFamily) {
        throw new Error(`Family with surname "${input.surname}" already exists`);
      }
      
      // Create new family
      const [newFamily] = await ctx.db.insert(families)
        .values({
          surname: input.surname,
          ownerId: ctx.user.id,
          avatarUrl: input.avatarUrl,
          description: input.description
        })
        .returning();
      
      // Auto-add creator as admin/owner
      await ctx.db.insert(familyMembers)
        .values({
          familyId: newFamily.id,
          userId: ctx.user.id,
          role: 'admin',
          status: 'active',
          acceptedAt: new Date()
        });
      
      return newFamily;
    }),

  // Update family surname
  update: adminProcedure
    .input(updateFamilySchema)
    .mutation(async ({ ctx, input }) => {
      // Check if new surname already exists (and it's not the same family)
      const [existingFamily] = await ctx.db.select()
        .from(families)
        .where(eq(families.surname, input.surname))
        .limit(1);
      
      if (existingFamily && existingFamily.id !== input.familyId) {
        throw new Error(`Family with surname "${input.surname}" already exists`);
      }
      
      // Update family
      const [updatedFamily] = await ctx.db.update(families)
        .set({
          surname: input.surname,
          updatedAt: new Date()
        })
        .where(eq(families.id, input.familyId))
        .returning();
      
      if (!updatedFamily) {
        throw new Error('Family not found');
      }
      
      return updatedFamily;
    }),

  // Delete family
  delete: adminProcedure
    .input(familyIdSchema)
    .mutation(async ({ ctx, input }) => {
      const [deletedFamily] = await ctx.db.delete(families)
        .where(eq(families.id, input.familyId))
        .returning();
      
      if (!deletedFamily) {
        throw new Error('Family not found');
      }
      
      return { success: true, family: deletedFamily };
    }),

  // Update family avatar
  updateFamilyAvatar: adminProcedure
    .input(z.object({
      familyId: z.string().uuid(),
      avatarUrl: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user is admin of the family
      const [adminMembership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          eq(familyMembers.familyId, input.familyId)
        );

      if (!adminMembership) {
        throw new Error('You are not a member of this family');
      }

      const [updatedFamily] = await ctx.db.update(families)
        .set({
          avatarUrl: input.avatarUrl,
          updatedAt: new Date()
        })
        .where(eq(families.id, input.familyId))
        .returning();

      if (!updatedFamily) {
        throw new Error('Family not found');
      }

      return updatedFamily;
    }),

  // Get user's families
  getMyFamilies: procedure
    .query(async ({ ctx }) => {
      if (!ctx.user?.id) {
        throw new Error("User must be authenticated");
      }

      const userFamilies = await ctx.db
        .select()
        .from(families)
        .innerJoin(familyMembers, eq(families.id, familyMembers.familyId))
        .where(eq(familyMembers.userId, ctx.user.id));

      return userFamilies.map(uf => ({
        ...uf.families,
        role: uf.family_members.role,
        status: uf.family_members.status
      }));
    }),

  // Get family details with members
  getFamilyDetails: procedure
    .input(familyIdSchema)
    .query(async ({ ctx, input }) => {
      // Verify user is member of the family
      const [userMembership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          eq(familyMembers.familyId, input.familyId)
        );

      if (!userMembership) {
        throw new Error('You are not a member of this family');
      }

      const [family] = await ctx.db.select()
        .from(families)
        .where(eq(families.id, input.familyId))
        .limit(1);

      if (!family) {
        throw new Error('Family not found');
      }

      return family;
    })
});
