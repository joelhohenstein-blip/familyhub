import React, { useState } from 'react';
import { ChevronUp, AlertCircle, Loader2 } from 'lucide-react';
import { PostCard } from './PostCard';
import { validateContent } from '~/utils/postValidation';
import { trpc } from '~/utils/trpc';

interface ThreadPost {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
  media?: Array<{
    id: string;
    url: string;
    type: 'image' | 'video';
    fileName: string;
  }>;
  replies?: ThreadPost[];
}

interface PostThreadProps {
  post: ThreadPost & {
    author?: { id: string; firstName: string; lastName: string };
  };
  replies?: ThreadPost[];
  familyId: string;
  currentUserId?: string;
  onClose?: () => void;
  onReplyAdded?: () => void;
}

interface RenderablePost extends ThreadPost {
  author?: { id: string; firstName: string; lastName: string };
  depth: number;
}

const renderPostsRecursive = (
  posts: any[],
  depth: number = 0,
  currentUserId?: string,
  onDelete?: (postId: string) => void
): React.ReactNode => {
  if (!posts || posts.length === 0) return null;

  return posts.map((post) => {
    const authorName = post.author
      ? `${post.author.firstName} ${post.author.lastName}`
      : 'Unknown User';

    return (
      <div key={post.id} className={`space-y-2 ${depth > 0 ? 'ml-4' : ''}`}>
        <PostCard
          id={post.id}
          authorId={post.authorId}
          authorName={authorName}
          content={post.content}
          createdAt={post.createdAt}
          media={post.media}
          currentUserId={currentUserId}
          onPostDeleted={onDelete}
          isReply={depth > 0}
        />
        {post.replies && post.replies.length > 0 && (
          <div className="space-y-2">
            {renderPostsRecursive(post.replies, depth + 1, currentUserId, onDelete)}
          </div>
        )}
      </div>
    );
  });
};

export const PostThread: React.FC<PostThreadProps> = ({
  post,
  replies,
  familyId,
  currentUserId,
  onClose,
  onReplyAdded,
}) => {
  const [replyContent, setReplyContent] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const replyToPostMutation = trpc.posts.replyToPost.useMutation();

  const handleReplySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate
    const contentErrors = validateContent(replyContent);
    if (contentErrors.length > 0) {
      setErrors(contentErrors.map((e) => e.message));
      return;
    }

    setErrors([]);
    setIsSubmitting(true);

    try {
      await replyToPostMutation.mutateAsync({
        familyId,
        parentPostId: post.id,
        content: replyContent.trim(),
      });

      setReplyContent('');
      setShowReplyForm(false);
      onReplyAdded?.();
    } catch (error: any) {
      setErrors([error.message || 'Failed to create reply']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const authorName = post.author
    ? `${post.author.firstName} ${post.author.lastName}`
    : 'Unknown User';

  const totalReplies = replies
    ? replies.reduce((count, reply) => {
        return count + 1 + (reply.replies?.length || 0);
      }, 0)
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center sm:justify-center z-50">
      <div className="w-full sm:max-w-2xl bg-white rounded-t-xl sm:rounded-lg shadow-xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Thread ({totalReplies} replies)
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close thread"
          >
            <ChevronUp className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Root Post */}
          <div className="pb-4 border-b border-gray-200">
            <PostCard
              id={post.id}
              authorId={post.authorId}
              authorName={authorName}
              content={post.content}
              createdAt={post.createdAt}
              media={post.media}
              replyCount={totalReplies}
              currentUserId={currentUserId}
            />
          </div>

          {/* Replies */}
          {replies && replies.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Replies</h3>
              <div className="space-y-2">
                {renderPostsRecursive(replies, 0, currentUserId)}
              </div>
            </div>
          )}

          {/* Reply Form */}
          {!showReplyForm ? (
            <button
              onClick={() => setShowReplyForm(true)}
              className="w-full py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium text-sm border border-blue-200"
            >
              Write a Reply
            </button>
          ) : (
            <form onSubmit={handleReplySubmit} className="bg-gray-50 rounded-lg p-4 space-y-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value.substring(0, 5000))}
                placeholder="Write your reply..."
                maxLength={5000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                disabled={isSubmitting}
              />

              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  {replyContent.length} / 5000 characters
                </div>
              </div>

              {errors.length > 0 && (
                <div className="space-y-1 p-2 bg-red-50 rounded border border-red-200">
                  {errors.map((error, idx) => (
                    <div key={idx} className="flex gap-2 text-sm text-red-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyContent('');
                    setErrors([]);
                  }}
                  disabled={isSubmitting}
                  className="px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || replyContent.trim() === ''}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Replying...
                    </>
                  ) : (
                    'Reply'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
