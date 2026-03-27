import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, MessageSquare, Clock } from 'lucide-react';
import { trpc } from '~/utils/trpc';
import { usePusherChannel } from '~/hooks/usePusherChannel';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  familyId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  otherParticipant?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string;
  };
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    status: string;
    createdAt: Date;
  };
}

interface ConversationListProps {
  familyId: string;
  currentUserId: string;
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversationId?: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  familyId,
  currentUserId,
  onSelectConversation,
  selectedConversationId,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pusherConnected, setPusherConnected] = useState(false);

  // Query to get conversations
  const getConversationsQuery = trpc.conversations.getConversations.useQuery(
    { familyId },
    { enabled: !!familyId }
  );

  // Pusher real-time subscription
  usePusherChannel(
    `private-family-${familyId}`,
    familyId,
    (event, data) => {
      setPusherConnected(true);
      if (event === 'conversation-created') {
        // Add new conversation to list
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === data.conversation.id);
          if (!exists) {
            return [data.conversation, ...prev];
          }
          return prev;
        });
      }
    }
  );

  // Update conversations when query data changes
  useEffect(() => {
    if (getConversationsQuery.data) {
      setConversations(getConversationsQuery.data as unknown as Conversation[]);
    }
  }, [getConversationsQuery.data]);

  const handleSelectConversation = (conversation: Conversation) => {
    onSelectConversation(conversation);
  };

  const getParticipantName = (participant: Conversation['otherParticipant']): string => {
    if (!participant) return 'Unknown User';
    if (participant.firstName && participant.lastName) {
      return `${participant.firstName} ${participant.lastName}`;
    }
    if (participant.firstName) {
      return participant.firstName;
    }
    if (participant.email) {
      return participant.email.split('@')[0];
    }
    return 'Unknown User';
  };

  const getParticipantInitials = (participant: Conversation['otherParticipant']): string => {
    if (!participant) return '?';
    const firstName = participant.firstName?.charAt(0) || '';
    const lastName = participant.lastName?.charAt(0) || '';
    return (firstName + lastName).toUpperCase() || '?';
  };

  if (getConversationsQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-gray-600">Loading conversations...</p>
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

  if (conversations.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No conversations yet</p>
        <p className="text-sm text-gray-500 mt-2">Start a new 1-on-1 chat to begin</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 bg-white rounded-lg border border-slate-200 overflow-hidden">
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          onClick={() => handleSelectConversation(conversation)}
          className={`w-full text-left p-4 hover:bg-slate-50 transition-colors border-b last:border-b-0 ${
            selectedConversationId === conversation.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
          }`}
        >
          <div className="flex gap-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {getParticipantInitials(conversation.otherParticipant)}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-medium text-gray-900 truncate">
                  {getParticipantName(conversation.otherParticipant)}
                </h3>
                {conversation.lastMessage && (
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {formatDistanceToNow(new Date(conversation.lastMessage.createdAt), { addSuffix: true })}
                  </span>
                )}
              </div>

              {/* Last message preview */}
              {conversation.lastMessage ? (
                <p className="text-sm text-gray-600 truncate mt-1">
                  {conversation.lastMessage.senderId === currentUserId ? 'You: ' : ''}
                  {conversation.lastMessage.content}
                </p>
              ) : (
                <p className="text-sm text-gray-500 truncate mt-1 italic">No messages yet</p>
              )}
            </div>

            {/* Status indicator */}
            {conversation.lastMessage?.status !== 'read' &&
              conversation.lastMessage?.senderId !== currentUserId && (
                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
              )}
          </div>
        </button>
      ))}
    </div>
  );
};
