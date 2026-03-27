import { z } from 'zod';
import { router, procedure } from '~/server/trpc/trpc';
import {
  scanMessage,
  logMessageModeration,
  getFlaggedMessages,
  updateMessageModerationDecision,
  isMessageAlreadyReviewed,
} from '~/server/services/moderation.service';
import {
  scanMedia,
  logMediaModeration,
  getFlaggedMedia,
  updateMediaModerationDecision,
  getMediaByHash,
} from '~/server/services/vision.service';
import { generateModerationDecision } from '~/server/services/chat-ai.service';

export const contentModerationRouter = router({
  /**
   * Scan an incoming message for policy violations
   * Returns moderation result with violation score
   */
  scanMessage: procedure
    .input(
      z.object({
        messageId: z.string(),
        content: z.string().min(1).max(5000),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      const userId = ctx.userId || 'system';
      
      // Check if already reviewed
      const alreadyReviewed = await isMessageAlreadyReviewed(ctx.db, input.messageId);
      if (alreadyReviewed) {
        return { success: false, message: 'Message already reviewed' };
      }

      try {
        // Perform content scan
        const scanResult = await scanMessage(input.content, userId);

        // Log the moderation event
        await logMessageModeration(ctx.db, input.messageId, userId, input.content, scanResult);

        // Generate AI-powered decision
        const decision = await generateModerationDecision(
          input.messageId,
          'message',
          input.content,
          scanResult.score,
          scanResult.reasons
        );

        return {
          success: true,
          messageId: input.messageId,
          flagged: scanResult.flagged,
          score: scanResult.score,
          reasons: scanResult.reasons,
          decision: decision.decision,
          confidence: decision.confidence,
          explanation: decision.explanation,
        };
      } catch (error) {
        console.error('Error scanning message:', error);
        throw error;
      }
    }),

  /**
   * Scan uploaded media for policy violations
   * Returns moderation result before media becomes visible
   */
  scanMedia: procedure
    .input(
      z.object({
        mediaId: z.string(),
        mediaBuffer: z.instanceof(Buffer),
        mediaType: z.string().regex(/^image\//),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      const userId = ctx.userId || 'system';

      try {
        // Check for duplicate media by hash
        const scanResult = await scanMedia(input.mediaBuffer, input.mediaType, userId);
        
        if (scanResult.isValidMedia) {
          const existingMedia = await getMediaByHash(ctx.db, scanResult.mediaHash);
          if (existingMedia) {
            return {
              success: false,
              message: 'Duplicate media detected',
              isDuplicate: true,
              mediaId: input.mediaId,
            };
          }
        }

        // Log the moderation event
        await logMediaModeration(ctx.db, input.mediaId, userId, scanResult.mediaHash, scanResult);

        // Generate AI-powered decision
        const decision = await generateModerationDecision(
          input.mediaId,
          'media',
          `[${scanResult.mediaFormat.toUpperCase()} IMAGE]`,
          scanResult.analysisResults.confidence,
          scanResult.isExplicit ? ['Explicit content detected'] : []
        );

        return {
          success: true,
          mediaId: input.mediaId,
          isExplicit: scanResult.isExplicit,
          confidence: scanResult.analysisResults.confidence,
          analysis: scanResult.analysisResults.text,
          mediaHash: scanResult.mediaHash,
          mediaFormat: scanResult.mediaFormat,
          decision: decision.decision,
          explanation: decision.explanation,
          isValidMedia: scanResult.isValidMedia,
        };
      } catch (error) {
        console.error('Error scanning media:', error);
        throw error;
      }
    }),

  /**
   * Get flagged items (messages or media) pending review
   */
  getFlaggedQueue: procedure
    .input(
      z.object({
        type: z.enum(['message', 'media', 'all']).optional(),
        status: z.enum(['pending_review', 'flagged_auto', 'approved', 'rejected']).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }: any) => {
      try {
        const messages =
          input.type === 'media'
            ? []
            : await getFlaggedMessages(ctx.db, input.status as any, input.limit, input.offset);

        const media =
          input.type === 'message'
            ? []
            : await getFlaggedMedia(ctx.db, input.status as any, input.limit, input.offset);

        // Combine and sort by creation date
        const combined = [
          ...messages.map((m: any) => ({
            id: m.id,
            type: 'message' as const,
            content: m.content,
            score: m.score,
            reasons: m.reasons,
            flagged: m.flagged,
            status: m.status,
            createdAt: m.createdAt,
            reviewedAt: m.reviewedAt,
            reviewedBy: m.reviewedBy,
            reviewReason: m.reviewReason,
          })),
          ...media.map((m: any) => ({
            id: m.id,
            type: 'media' as const,
            content: m.aiAnalysisResults || 'No analysis',
            score: m.violationScore || 0,
            reasons: [],
            flagged: m.flagged || (m.violationScore || 0) > 0.5,
            status: m.status,
            createdAt: m.createdAt,
            reviewedAt: m.reviewedAt,
            reviewedBy: m.reviewedBy,
            reviewReason: m.reviewReason,
          })),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return {
          items: combined,
          total: combined.length,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error('Error fetching flagged queue:', error);
        throw error;
      }
    }),

  /**
   * Review and approve/reject a flagged item
   */
  reviewFlaggedItem: procedure
    .input(
      z.object({
        itemId: z.string(),
        itemType: z.enum(['message', 'media']),
        decision: z.enum(['approved', 'rejected']),
        reason: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      const reviewedBy = ctx.userId || 'system';

      try {
        if (input.itemType === 'message') {
          await updateMessageModerationDecision(
            ctx.db,
            input.itemId,
            input.decision,
            input.reason,
            reviewedBy
          );
        } else {
          await updateMediaModerationDecision(
            ctx.db,
            input.itemId,
            input.decision,
            input.reason,
            reviewedBy
          );
        }

        return {
          success: true,
          itemId: input.itemId,
          decision: input.decision,
          reviewedAt: new Date(),
        };
      } catch (error) {
        console.error('Error reviewing flagged item:', error);
        throw error;
      }
    }),
});

export default contentModerationRouter;
