import { z } from 'zod';
import { router, procedure } from '../trpc';
import {
  familyDigests,
  digestShares,
  digestSubscriptions,
  familyMembers,
  auditLog,
} from '~/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import {
  generateFamilyDigest,
  saveDigest,
  getDigestById,
  getDigestsByDateRange,
} from '~/server/services/digest.service';
import crypto from 'crypto';

// Validation schemas
const generateSummarySchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

const getDigestByDateRangeSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

const viewDigestSchema = z.object({
  digestId: z.string().uuid('Invalid digest ID'),
});

const shareDigestSchema = z.object({
  digestId: z.string().uuid('Invalid digest ID'),
  expiresIn: z.number().optional().describe('Expiration time in minutes'),
  guestEmail: z.string().email().optional(),
});

const validateShareAccessSchema = z.object({
  shareToken: z.string(),
});

const getAllUserDigestsSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const digestsRouter = router({
  /**
   * Generate a summary for a given time window
   */
  generateSummary: procedure
    .input(generateSummarySchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db.select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error('You are not a member of this family');
      }

      // Validate date range
      if (input.startDate >= input.endDate) {
        throw new Error('Start date must be before end date');
      }

      try {
        // Generate the digest using AI service
        const { title, content } = await generateFamilyDigest(
          input.familyId,
          input.startDate,
          input.endDate
        );

        // Save to database
        const savedDigest = await saveDigest(
          input.familyId,
          title,
          content,
          input.startDate,
          input.endDate
        );

        // Log audit trail
        await ctx.db.insert(auditLog).values({
          actionType: 'digest_generated',
          actorId: ctx.user.id,
          targetId: savedDigest.id,
          targetType: 'digest',
          description: `Generated digest for ${input.startDate.toLocaleDateString()} - ${input.endDate.toLocaleDateString()}`,
        });

        return {
          success: true,
          digest: savedDigest,
        };
      } catch (error) {
        console.error('Error generating summary:', error);
        throw new Error('Failed to generate summary');
      }
    }),

  /**
   * Get digest by date range or create one if it doesn't exist
   */
  getDigestByDateRange: procedure
    .input(getDigestByDateRangeSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db.select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error('You are not a member of this family');
      }

      try {
        // Try to find existing digest
        const digests = await getDigestsByDateRange(
          input.familyId,
          input.startDate,
          input.endDate
        );

        if (digests.length > 0) {
          return {
            found: true,
            digest: digests[0],
          };
        }

        // No digest found
        return {
          found: false,
          digest: null,
        };
      } catch (error) {
        console.error('Error retrieving digest:', error);
        throw new Error('Failed to retrieve digest');
      }
    }),

  /**
   * View a specific digest with caching
   */
  viewDigest: procedure
    .input(viewDigestSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      try {
        const digest = await getDigestById(input.digestId);

        if (!digest) {
          throw new Error('Digest not found');
        }

        // Verify user is a member of the digest's family
        const [membership] = await ctx.db.select()
          .from(familyMembers)
          .where(
            and(
              eq(familyMembers.familyId, digest.familyId),
              eq(familyMembers.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!membership) {
          throw new Error('You do not have access to this digest');
        }

        return digest;
      } catch (error) {
        console.error('Error viewing digest:', error);
        throw new Error('Failed to view digest');
      }
    }),

  /**
   * Share a digest with a generated token
   */
  shareDigest: procedure
    .input(shareDigestSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      try {
        // Verify digest exists and user has access
        const digest = await getDigestById(input.digestId);
        if (!digest) {
          throw new Error('Digest not found');
        }

        const [membership] = await ctx.db.select()
          .from(familyMembers)
          .where(
            and(
              eq(familyMembers.familyId, digest.familyId),
              eq(familyMembers.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!membership) {
          throw new Error('You do not have access to share this digest');
        }

        // Generate secure share token
        const shareToken = crypto.randomBytes(32).toString('hex');

        // Calculate expiration
        let expiresAt: Date | null = null;
        if (input.expiresIn) {
          expiresAt = new Date(Date.now() + input.expiresIn * 60 * 1000);
        }

        // Create share record
        const [share] = await ctx.db.insert(digestShares)
          .values({
            digestId: input.digestId,
            creatorId: ctx.user.id,
            shareToken,
            expiresAt,
            guestEmail: input.guestEmail || null,
          })
          .returning();

        // Log audit trail
        await ctx.db.insert(auditLog).values({
          actionType: 'digest_shared',
          actorId: ctx.user.id,
          targetId: input.digestId,
          targetType: 'digest',
          description: `Digest shared ${input.guestEmail ? `with ${input.guestEmail}` : 'via link'}`,
        });

        return {
          success: true,
          share,
          shareUrl: `/share/digest/${shareToken}`,
        };
      } catch (error) {
        console.error('Error sharing digest:', error);
        throw new Error('Failed to share digest');
      }
    }),

  /**
   * Validate and retrieve digest via share token
   */
  validateShareAccess: procedure
    .input(validateShareAccessSchema)
    .query(async ({ ctx, input }) => {
      try {
        // Find share record
        const [share] = await ctx.db.select()
          .from(digestShares)
          .where(eq(digestShares.shareToken, input.shareToken))
          .limit(1);

        if (!share) {
          throw new Error('Invalid share token');
        }

        // Check expiration
        if (share.expiresAt && new Date() > share.expiresAt) {
          throw new Error('Share link has expired');
        }

        // Retrieve the digest
        const digest = await getDigestById(share.digestId);
        if (!digest) {
          throw new Error('Digest not found');
        }

        return {
          valid: true,
          digest,
          createdBy: share.creatorId,
        };
      } catch (error) {
        console.error('Error validating share access:', error);
        throw new Error('Invalid or expired share link');
      }
    }),

  /**
   * Get all digests for a family
   */
  getAllUserDigests: procedure
    .input(getAllUserDigestsSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db.select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error('You are not a member of this family');
      }

      try {
        const digests = await ctx.db.query.familyDigests.findMany({
          where: eq(familyDigests.familyId, input.familyId),
          orderBy: desc(familyDigests.createdAt),
          limit: input.limit,
          offset: input.offset,
        });

        return {
          digests,
          total: digests.length,
        };
      } catch (error) {
        console.error('Error retrieving digests:', error);
        throw new Error('Failed to retrieve digests');
      }
    }),
});
