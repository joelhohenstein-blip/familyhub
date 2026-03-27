import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import { router, procedure } from '../trpc';
import { emitter } from '~/utils/emitter.server';
import { pusherEvents } from '~/utils/pusher.server';
import { postsTable, postMediaTable, familyMembers } from '../../../db/schema';
import { eq, desc, and, isNull, count } from 'drizzle-orm';

// Validation schemas
const createPostSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  content: z.string()
    .min(1, 'Content cannot be empty')
    .max(5000, 'Content must be less than 5000 characters'),
});

const replyToPostSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  parentPostId: z.string().uuid('Invalid parent post ID'),
  content: z.string()
    .min(1, 'Content cannot be empty')
    .max(5000, 'Content must be less than 5000 characters'),
});

const getPostsSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const getThreadRepliesSchema = z.object({
  postId: z.string().uuid('Invalid post ID'),
  limit: z.number().min(1).max(100).default(100),
});

const deletePostSchema = z.object({
  postId: z.string().uuid('Invalid post ID'),
});

const addPostMediaSchema = z.object({
  postId: z.string().uuid('Invalid post ID'),
  url: z.string().url('Invalid URL'),
  type: z.enum(['image', 'video'] as const),
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().min(1, 'File size must be greater than 0'),
});

const onPostsUpdateSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
});

// Helper function to check nesting depth
async function getPostDepth(db: any, postId: string): Promise<number> {
  let depth = 0;
  let currentPostId: string | null = postId;

  while (currentPostId) {
    const [post] = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, currentPostId))
      .limit(1) as any;

    if (!post || !post.parentPostId) break;
    depth++;
    currentPostId = post.parentPostId;

    if (depth > 5) {
      return depth; // Max depth exceeded
    }
  }

  return depth;
}

export const postsRouter = router({
  /**
   * Create a new top-level post
   */
  createPost: procedure
    .input(createPostSchema)
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

      // Trim content
      const trimmedContent = input.content.trim();

      // Create the post
      const [newPost] = await ctx.db.insert(postsTable)
        .values({
          familyId: input.familyId,
          authorId: ctx.user.id,
          content: trimmedContent,
          parentPostId: null,
          status: 'active',
        })
        .returning();

      // Emit event for real-time updates (tRPC subscriptions)
      emitter.emit('posts-update', {
        familyId: input.familyId,
        type: 'post-created',
        post: newPost,
      });

      // Broadcast via Pusher for real-time sync
      try {
        await pusherEvents.postCreated(input.familyId, newPost);
      } catch (error) {
        console.error('Failed to broadcast post creation via Pusher:', error);
        // Don't throw - Pusher is optional
      }

      return newPost;
    }),

  /**
   * Get posts for a family (top-level only)
   */
  getPosts: procedure
    .input(getPostsSchema)
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

      // Get top-level posts only (no parent)
      const posts = await ctx.db.select()
        .from(postsTable)
        .where(
          and(
            eq(postsTable.familyId, input.familyId),
            isNull(postsTable.parentPostId),
            eq(postsTable.status, 'active')
          )
        )
        .orderBy(desc(postsTable.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Get media for each post
      const postsWithMedia = await Promise.all(
        posts.map(async (post) => {
          const media = await ctx.db.select()
            .from(postMediaTable)
            .where(eq(postMediaTable.postId, post.id));
          return { ...post, media };
        })
      );

      return { posts: postsWithMedia };
    }),

  /**
   * Reply to a post (create a nested reply)
   */
  replyToPost: procedure
    .input(replyToPostSchema)
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

      // Verify parent post exists and belongs to the family
      const [parentPost] = await ctx.db.select()
        .from(postsTable)
        .where(
          and(
            eq(postsTable.id, input.parentPostId),
            eq(postsTable.familyId, input.familyId)
          )
        )
        .limit(1);

      if (!parentPost) {
        throw new Error('Parent post not found');
      }

      // Check nesting depth
      const depth = await getPostDepth(ctx.db, input.parentPostId);
      if (depth >= 5) {
        throw new Error('Maximum thread depth reached (5 levels)');
      }

      // Trim content
      const trimmedContent = input.content.trim();

      // Create the reply
      const [newReply] = await ctx.db.insert(postsTable)
        .values({
          familyId: input.familyId,
          authorId: ctx.user.id,
          content: trimmedContent,
          parentPostId: input.parentPostId,
          status: 'active',
        })
        .returning();

      // Emit event for real-time updates (tRPC subscriptions)
      emitter.emit('posts-update', {
        familyId: input.familyId,
        type: 'reply-created',
        post: newReply,
        parentPostId: input.parentPostId,
      });

      // Broadcast via Pusher for real-time sync
      try {
        await pusherEvents.replyCreated(input.familyId, newReply, input.parentPostId);
      } catch (error) {
        console.error('Failed to broadcast reply creation via Pusher:', error);
        // Don't throw - Pusher is optional
      }

      return newReply;
    }),

  /**
   * Get all replies for a post (entire thread)
   */
  getThreadReplies: procedure
    .input(getThreadRepliesSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the root post first
      const [rootPost] = await ctx.db.select()
        .from(postsTable)
        .where(eq(postsTable.id, input.postId))
        .limit(1);

      if (!rootPost) {
        throw new Error('Post not found');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db.select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, rootPost.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error('You are not a member of this family');
      }

      // Get all replies recursively
      async function getRepliesRecursive(parentId: string): Promise<any[]> {
        const replies = await ctx.db.select()
          .from(postsTable)
          .where(
            and(
              eq(postsTable.parentPostId, parentId),
              eq(postsTable.status, 'active')
            )
          )
          .orderBy(postsTable.createdAt);

        // Recursively get replies for each reply
        const repliesWithChildren = await Promise.all(
          replies.map(async (reply) => {
            const media = await ctx.db.select()
              .from(postMediaTable)
              .where(eq(postMediaTable.postId, reply.id));
            const children = await getRepliesRecursive(reply.id);
            return { ...reply, media, replies: children };
          })
        );

        return repliesWithChildren;
      }

      // Get media for root post
      const rootMedia = await ctx.db.select()
        .from(postMediaTable)
        .where(eq(postMediaTable.postId, input.postId));

      const replies = await getRepliesRecursive(input.postId);

      return {
        post: { ...rootPost, media: rootMedia },
        replies,
      };
    }),

  /**
   * Delete a post (and its replies)
   */
  deletePost: procedure
    .input(deletePostSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the post
      const [post] = await ctx.db.select()
        .from(postsTable)
        .where(eq(postsTable.id, input.postId))
        .limit(1);

      if (!post) {
        throw new Error('Post not found');
      }

      // Verify user is the author or admin
      if (post.authorId !== ctx.user.id) {
        throw new Error('You can only delete your own posts');
      }

      // Soft delete the post
      const [deletedPost] = await ctx.db.update(postsTable)
        .set({
          status: 'deleted',
          updatedAt: new Date(),
        })
        .where(eq(postsTable.id, input.postId))
        .returning();

      // Emit event for real-time updates (tRPC subscriptions)
      emitter.emit('posts-update', {
        familyId: post.familyId,
        type: 'post-deleted',
        postId: input.postId,
      });

      // Broadcast via Pusher for real-time sync
      try {
        await pusherEvents.postDeleted(post.familyId, input.postId);
      } catch (error) {
        console.error('Failed to broadcast post deletion via Pusher:', error);
        // Don't throw - Pusher is optional
      }

      return { success: true };
    }),

  /**
   * Add media to a post
   */
  addPostMedia: procedure
    .input(addPostMediaSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the post and verify ownership
      const [post] = await ctx.db.select()
        .from(postsTable)
        .where(eq(postsTable.id, input.postId))
        .limit(1);

      if (!post) {
        throw new Error('Post not found');
      }

      if (post.authorId !== ctx.user.id) {
        throw new Error('You can only add media to your own posts');
      }

      // Validate file size (10MB max)
      if (input.fileSize > 10 * 1024 * 1024) {
        throw new Error('File size exceeds 10MB limit');
      }

      // Create media record
      const [media] = await ctx.db.insert(postMediaTable)
        .values({
          postId: input.postId,
          url: input.url,
          type: input.type,
          fileName: input.fileName,
          fileSize: input.fileSize,
        })
        .returning();

      // Emit event for real-time updates (tRPC subscriptions)
      emitter.emit('posts-update', {
        familyId: post.familyId,
        type: 'media-added',
        postId: input.postId,
        media,
      });

      // Broadcast via Pusher for real-time sync
      try {
        await pusherEvents.mediaAdded(post.familyId, input.postId, media);
      } catch (error) {
        console.error('Failed to broadcast media addition via Pusher:', error);
        // Don't throw - Pusher is optional
      }

      return media;
    }),

  /**
   * Subscribe to posts updates for a family
   */
  onPostsUpdate: procedure
    .input(onPostsUpdateSchema)
    .subscription(({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      return observable<any>((emit) => {
        const onUpdate = async (data: any) => {
          // Only emit updates for the subscribed family
          if (data.familyId !== input.familyId) return;

          // Verify user still has access to the family
          const [membership] = await ctx.db.select()
            .from(familyMembers)
            .where(
              and(
                eq(familyMembers.familyId, input.familyId),
                eq(familyMembers.userId, ctx.user!.id)
              )
            )
            .limit(1);

          if (!membership) return; // User no longer has access

          emit.next(data);
        };

        emitter.on('posts-update', onUpdate);

        return () => {
          emitter.off('posts-update', onUpdate);
        };
      });
    }),
});
