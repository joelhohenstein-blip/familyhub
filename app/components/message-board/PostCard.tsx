import React, { useState } from 'react';
import { Reply, Trash2, AlertCircle, Loader2, MessageCircle } from 'lucide-react';
import { trpc } from '~/utils/trpc';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
  media?: Array<{
    id: string;
    url: string;
    type: 'image' | 'video';
    fileName: string;
  }>;
  replyCount?: number;
  currentUserId?: string;
  onReplyClick?: (postId: string) => void;
  onPostDeleted?: (postId: string) => void;
  isReply?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  id,
  authorId,
  authorName,
  content,
  createdAt,
  media,
  replyCount = 0,
  currentUserId,
  onReplyClick,
  onPostDeleted,
  isReply,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deletePostMutation = trpc.posts.deletePost.useMutation();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deletePostMutation.mutateAsync({ postId: id });
      onPostDeleted?.(id);
    } catch (error: any) {
      setDeleteError(error.message || 'Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  const canDelete = currentUserId === authorId;
  const isOwnPost = currentUserId === authorId;

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-4 transition-all ${
        isReply ? 'ml-8 bg-gray-50' : ''
      } ${deleteError ? 'ring-2 ring-red-400' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {authorName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{authorName}</p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>

        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Delete post"
            aria-label="Delete post"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="mb-3">
        <p className="text-gray-800 leading-relaxed break-words whitespace-pre-wrap">
          {content}
        </p>
      </div>

      {/* Media */}
      {media && media.length > 0 && (
        <div className="mb-3 space-y-2">
          {media.map((m) => (
            <div key={m.id} className="rounded-lg overflow-hidden max-w-md">
              {m.type === 'image' ? (
                <img
                  src={m.url}
                  alt="Post media"
                  className="w-full h-auto object-cover max-h-96"
                  loading="lazy"
                />
              ) : (
                <video
                  src={m.url}
                  className="w-full h-auto max-h-96"
                  controls
                  controlsList="nodownload"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {deleteError && (
        <div className="mb-3 p-2 bg-red-50 rounded border border-red-200 flex gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{deleteError}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
        {replyCount > 0 && !isReply && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <MessageCircle className="w-4 h-4" />
            <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
          </div>
        )}

        {!isReply && (
          <button
            onClick={() => onReplyClick?.(id)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
          >
            <Reply className="w-4 h-4" />
            <span>Reply</span>
          </button>
        )}

        {isOwnPost && !isReply && (
          <div className="text-xs text-gray-500 ml-auto">
            Your post
          </div>
        )}
      </div>
    </div>
  );
};
