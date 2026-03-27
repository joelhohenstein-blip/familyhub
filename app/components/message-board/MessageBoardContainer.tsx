import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { trpc } from '~/utils/trpc';
import { usePusherChannel } from '~/hooks/usePusherChannel';
import { CreatePostForm } from './CreatePostForm';
import { PostCard } from './PostCard';
import { PostThread } from './PostThread';

interface Post {
  id: string;
  familyId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  parentPostId: string | null;
  status: string;
  media?: Array<{
    id: string;
    url: string;
    type: 'image' | 'video';
    fileName: string;
  }>;
}

interface MessageBoardContainerProps {
  familyId: string;
  currentUserId?: string;
}

export const MessageBoardContainer: React.FC<MessageBoardContainerProps> = ({
  familyId,
  currentUserId,
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedThreadPost, setSelectedThreadPost] = useState<Post | null>(null);
  const [threadReplies, setThreadReplies] = useState<any[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pusherConnected, setPusherConnected] = useState(false);

  // Queries
  const getPostsQuery = trpc.posts.getPosts.useQuery(
    { familyId, limit: 50, offset: 0 },
    { enabled: !!familyId }
  );

  const getThreadRepliesQuery = trpc.posts.getThreadReplies.useQuery(
    { postId: selectedThreadPost?.id || '' },
    { enabled: !!selectedThreadPost?.id }
  );


  // Pusher real-time subscription for posts and replies
  usePusherChannel(
    `private-family-${familyId}`,
    familyId,
    (event, data) => {
      setPusherConnected(true);
      // Handle real-time updates from Pusher
      if (event === 'post-created') {
        setPosts((prev) => [data.post, ...prev]);
      } else if (event === 'reply-created') {
        // Update the thread if viewing
        if (selectedThreadPost?.id === data.parentPostId) {
          refetchThread();
        }
      } else if (event === 'post-deleted') {
        setPosts((prev) => prev.filter((p) => p.id !== data.postId));
      } else if (event === 'media-added') {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === data.postId
              ? { ...p, media: [...(p.media || []), data.media] }
              : p
          )
        );
      }
    }
  );

  // Legacy tRPC subscription fallback (for backward compatibility)
  const postsSubscription = trpc.posts.onPostsUpdate.useSubscription(
    { familyId },
    {
      enabled: !!familyId && !pusherConnected,
      onData: (data) => {
        // Handle real-time updates (fallback if Pusher unavailable)
        if (data.type === 'post-created') {
          setPosts((prev) => [data.post, ...prev]);
        } else if (data.type === 'reply-created') {
          // Update the thread if viewing
          if (selectedThreadPost?.id === data.parentPostId) {
            refetchThread();
          }
        } else if (data.type === 'post-deleted') {
          setPosts((prev) => prev.filter((p) => p.id !== data.postId));
        } else if (data.type === 'media-added') {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === data.postId
                ? { ...p, media: [...(p.media || []), data.media] }
                : p
            )
          );
        }
      },
    }
  );

  // Update posts when query data changes
  useEffect(() => {
    if (getPostsQuery.data?.posts) {
      // Only update if we don't have Pusher updates
      if (!pusherConnected) {
        setPosts(getPostsQuery.data.posts as unknown as Post[]);
      }
    }
  }, [getPostsQuery.data, pusherConnected]);
  useEffect(() => {
    if (getThreadRepliesQuery.data?.replies) {
      setThreadReplies(getThreadRepliesQuery.data.replies as any[]);
      setIsLoadingThread(false);
    }
  }, [getThreadRepliesQuery.data]);

  const refetchPosts = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await getPostsQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [getPostsQuery]);

  const refetchThread = useCallback(async () => {
    if (!selectedThreadPost?.id) return;
    setIsLoadingThread(true);
    try {
      await getThreadRepliesQuery.refetch();
    } finally {
      setIsLoadingThread(false);
    }
  }, [selectedThreadPost?.id, getThreadRepliesQuery]);

  const handleOpenThread = (post: Post) => {
    setSelectedThreadPost(post);
    setIsLoadingThread(true);
    setError(null);
  };

  const handleCloseThread = () => {
    setSelectedThreadPost(null);
    setThreadReplies([]);
    refetchPosts();
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const getReplyCount = (postId: string): number => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return 0;

    const countReplies = (currentPost: Post): number => {
      const directReplies = posts.filter((p) => p.parentPostId === currentPost.id).length;
      const childReplies = posts
        .filter((p) => p.parentPostId === currentPost.id)
        .reduce((sum, p) => sum + countReplies(p), 0);

      return directReplies + childReplies;
    };

    return countReplies(post);
  };

  // Filter to only top-level posts
  const topLevelPosts = posts.filter((p) => !p.parentPostId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Family Message Board</h1>
          <p className="text-gray-600">Connect and share with your family</p>
        </div>

        {/* Create Post Form */}
        <CreatePostForm familyId={familyId} onPostCreated={refetchPosts} />

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {getPostsQuery.isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!getPostsQuery.isLoading && topLevelPosts.length === 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <p className="text-gray-600">No posts yet. Be the first to post!</p>
          </div>
        )}

        {/* Posts List */}
        {!getPostsQuery.isLoading && topLevelPosts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Posts ({topLevelPosts.length})
              </h2>
              <button
                onClick={refetchPosts}
                disabled={isRefreshing}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh posts"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-3">
              {topLevelPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => handleOpenThread(post)}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <PostCard
                    id={post.id}
                    authorId={post.authorId}
                    authorName={`User ${post.authorId.slice(0, 8)}`}
                    content={post.content}
                    createdAt={post.createdAt}
                    media={post.media}
                    replyCount={getReplyCount(post.id)}
                    currentUserId={currentUserId}
                    onReplyClick={() => handleOpenThread(post)}
                    onPostDeleted={handlePostDeleted}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Thread Modal */}
      {selectedThreadPost && (
        <PostThread
          post={selectedThreadPost}
          replies={threadReplies}
          familyId={familyId}
          currentUserId={currentUserId}
          onClose={handleCloseThread}
          onReplyAdded={refetchThread}
        />
      )}
    </div>
  );
};
