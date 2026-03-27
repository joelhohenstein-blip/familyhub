import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, Check, CheckCheck, Send, Pin, X } from 'lucide-react';
import { trpc } from '~/utils/trpc';
import { usePusherChannel } from '~/hooks/usePusherChannel';
import { useTypingIndicators } from '~/hooks/useTypingIndicators';
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
  ChatBubbleTimestamp,
} from '~/components/ui/chat-bubble';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { MessageReactions } from './MessageReactions';
import { TypingIndicators } from './TypingIndicators';
import { PresenceDisplay } from '../presence/PresenceDisplay';

interface ConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  status: 'sent' | 'delivered' | 'read';
  readAt?: Date;
  reactionsCount?: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

interface ConversationDetailProps {
  conversationId: string;
  currentUserId: string;
  otherParticipantName?: string;
  otherParticipantId?: string;
  familyId?: string;
  isAdmin?: boolean;
}

export const ConversationDetail: React.FC<ConversationDetailProps> = ({
  conversationId,
  currentUserId,
  otherParticipantName = 'User',
  otherParticipantId,
  familyId,
  isAdmin = false,
}) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [pusherConnected, setPusherConnected] = useState(false);
  const [showPinnedPanel, setShowPinnedPanel] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mutation to mark messages as read
  const markAsReadMutation = trpc.conversations.markAsRead.useMutation();

  // Mutation to unpin message (admin only)
  const unpinMutation = trpc.messages.unpinMessage.useMutation();

  // Typing indicators hook
  const typingIndicators = useTypingIndicators({
    conversationId,
    debounceMs: 500,
  });

  // Queries
  const getMessagesQuery = trpc.conversations.getMessages.useQuery(
    { conversationId, limit: 50, offset: 0 },
    { enabled: !!conversationId }
  );

  // Query to get pinned messages
  const getPinnedMessagesQuery = trpc.messages.getPinnedMessages.useQuery(
    { conversationId },
    { enabled: !!conversationId }
  );

  // Pusher real-time subscription for conversation updates
  usePusherChannel(
    `private-conversation-${conversationId}`,
    conversationId,
    (event, data) => {
      setPusherConnected(true);
      if (event === 'message-sent') {
        // Add new message to the list
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === data.message.id);
          if (!exists) {
            return [...prev, data.message];
          }
          return prev;
        });

        // Auto-mark received messages as read
        if (data.message.senderId !== currentUserId) {
          setTimeout(() => {
            markAsReadMutation.mutate({ messageId: data.message.id });
          }, 500);
        }
      } else if (event === 'message-read') {
        // Update message status to read
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId
              ? { ...m, status: 'read' as const, readAt: new Date() }
              : m
          )
        );
      }
    }
  );

  // Legacy tRPC subscription fallback
  const conversationSubscription = trpc.conversations.onConversationUpdate.useSubscription(
    { conversationId },
    {
      enabled: !!conversationId && !pusherConnected,
      onData: (data) => {
        if (data.type === 'message-sent') {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === data.message.id);
            if (!exists) {
              return [...prev, data.message];
            }
            return prev;
          });

          // Auto-mark received messages as read
          if (data.message.senderId !== currentUserId) {
            setTimeout(() => {
              markAsReadMutation.mutate({ messageId: data.message.id });
            }, 500);
          }
        } else if (data.type === 'message-read') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.messageId
                ? { ...m, status: 'read' as const, readAt: new Date() }
                : m
            )
          );
        }
      },
    }
  );

  // Update messages when query data changes
  useEffect(() => {
    if (getMessagesQuery.data) {
      setMessages(getMessagesQuery.data as unknown as ConversationMessage[]);
      setIsLoadingMessages(false);
    }
  }, [getMessagesQuery.data]);

  // Update pinned messages when query data changes
  useEffect(() => {
    if (getPinnedMessagesQuery.data) {
      setPinnedMessages(getPinnedMessagesQuery.data);
    }
  }, [getPinnedMessagesQuery.data]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mark all messages as read when component mounts/updates
  useEffect(() => {
    messages.forEach((msg) => {
      if (msg.senderId !== currentUserId && msg.status !== 'read') {
        markAsReadMutation.mutate({ messageId: msg.id });
      }
    });
  }, [messages, currentUserId, markAsReadMutation]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'read':
        return <CheckCheck className="w-4 h-4 text-blue-600" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-gray-400" />;
      case 'sent':
      default:
        return <Check className="w-4 h-4 text-gray-400" />;
    }
  };

  if (isLoadingMessages && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-gray-600">Loading messages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-900">Error</p>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const handleUnpin = async (messageId: string) => {
    try {
      await unpinMutation.mutateAsync({
        conversationId,
        messageId,
      });
      // Refetch pinned messages
      getPinnedMessagesQuery.refetch();
    } catch (error) {
      console.error('Failed to unpin message:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Pinned Messages Panel */}
      {showPinnedPanel && pinnedMessages.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pin className="w-4 h-4 text-amber-600 fill-amber-600" />
              <span className="text-sm font-semibold text-amber-900">
                {pinnedMessages.length} pinned {pinnedMessages.length === 1 ? 'message' : 'messages'}
              </span>
            </div>
            <button
              onClick={() => setShowPinnedPanel(false)}
              className="p-1 hover:bg-amber-100 rounded transition"
              aria-label="Close pinned messages"
            >
              <X className="w-4 h-4 text-amber-600" />
            </button>
          </div>
          <div className="px-3 pb-3 space-y-2 max-h-32 overflow-y-auto">
            {pinnedMessages.map((item: any) => (
              <div
                key={item.id}
                className="bg-white rounded p-2 text-sm text-gray-700 border border-amber-100 flex items-start justify-between gap-2 hover:bg-amber-50 transition"
              >
                <p className="flex-1 line-clamp-2">{item.message?.content}</p>
                {isAdmin && (
                  <button
                    onClick={() => handleUnpin(item.messageId)}
                    className="text-gray-400 hover:text-red-600 transition flex-shrink-0 p-1"
                    disabled={unpinMutation.isPending}
                    title="Unpin message"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">{otherParticipantName}</h2>
        <p className="text-sm text-gray-600">Direct message</p>
      </div>

      {/* Presence Display - shows family members' online/offline status */}
      {familyId && (
        <div className="border-b border-slate-200 bg-white">
          <PresenceDisplay familyId={familyId} compact={true} maxVisible={3} />
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-600">No messages yet</p>
              <p className="text-sm text-gray-500 mt-2">Start the conversation by sending a message</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isSent = message.senderId === currentUserId;
              return (
                <div key={message.id} className="group">
                  <ChatBubble variant={isSent ? 'sent' : 'received'}>
                    {!isSent && (
                      <ChatBubbleAvatar
                        fallback={otherParticipantName.charAt(0).toUpperCase()}
                        className="w-8 h-8"
                      />
                    )}
                    <div className="flex flex-col flex-1">
                      <ChatBubbleMessage variant={isSent ? 'sent' : 'received'}>
                        <p className="text-sm">{message.content}</p>
                      </ChatBubbleMessage>
                      {message.reactionsCount && Object.keys(message.reactionsCount).length > 0 && (
                        <MessageReactions
                          messageId={message.id}
                          reactionsCount={message.reactionsCount}
                        />
                      )}
                    </div>
                    <ChatBubbleTimestamp
                      timestamp={formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                    />
                    {isSent && (
                      <div className="ml-2 flex-shrink-0">
                        {getStatusIcon(message.status)}
                      </div>
                    )}
                  </ChatBubble>
                </div>
              );
            })}
            {/* Typing Indicators */}
            <TypingIndicators conversationId={conversationId} variant="minimal" className="px-0" />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area is handled by parent component */}
    </div>
  );
};
