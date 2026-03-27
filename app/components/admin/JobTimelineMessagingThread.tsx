import React, { useState, useEffect, useRef } from 'react';
import { trpc } from '~/utils/trpc';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Badge } from '~/components/ui/badge';
import {
  Send,
  Loader2,
  MessageSquare,
  Archive,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
} from 'lucide-react';

interface JobTimelineMessagingThreadProps {
  orderId: string;
  orderNumber: string;
}

export default function JobTimelineMessagingThread({
  orderId,
  orderNumber,
}: JobTimelineMessagingThreadProps) {
  const [messageContent, setMessageContent] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch threads for this order
  const threadsQuery = trpc.photoDigitization.getProjectThreadsForOrder.useQuery(
    { orderId }
  );

  // Fetch messages for selected thread
  const messagesQuery = trpc.photoDigitization.getThreadMessages.useQuery(
    { threadId: selectedThreadId || '', limit: 50, offset: 0 },
    { enabled: !!selectedThreadId }
  );

  // Mutations
  const createThreadMutation = trpc.photoDigitization.createProjectThread.useMutation();
  const postMessageMutation = trpc.photoDigitization.postThreadMessage.useMutation();
  const editMessageMutation = trpc.photoDigitization.editThreadMessage.useMutation();
  const deleteMessageMutation = trpc.photoDigitization.deleteThreadMessage.useMutation();
  const archiveThreadMutation = trpc.photoDigitization.archiveProjectThread.useMutation();
  const resolveThreadMutation = trpc.photoDigitization.resolveProjectThread.useMutation();

  // Auto-scroll to latest messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesQuery.data?.messages]);

  // Create new thread
  const handleCreateThread = async () => {
    const title = window.prompt('Enter thread title:');
    if (!title) return;

    try {
      const result = await createThreadMutation.mutateAsync({
        orderId,
        title,
      });

      setSelectedThreadId(result.thread.id);
      threadsQuery.refetch();
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  // Post message
  const handlePostMessage = async () => {
    if (!selectedThreadId || !messageContent.trim()) return;

    try {
      await postMessageMutation.mutateAsync({
        threadId: selectedThreadId,
        content: messageContent,
      });

      setMessageContent('');
      messagesQuery.refetch();
    } catch (error) {
      console.error('Failed to post message:', error);
    }
  };

  // Edit message
  const handleEditMessage = async (messageId: string) => {
    if (!editingContent.trim()) return;

    try {
      await editMessageMutation.mutateAsync({
        messageId,
        content: editingContent,
      });

      setEditingMessageId(null);
      setEditingContent('');
      messagesQuery.refetch();
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Delete this message?')) return;

    try {
      await deleteMessageMutation.mutateAsync({ messageId });
      messagesQuery.refetch();
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  // Archive thread
  const handleArchiveThread = async (threadId: string) => {
    if (!window.confirm('Archive this thread?')) return;

    try {
      await archiveThreadMutation.mutateAsync({ threadId });
      setSelectedThreadId(null);
      threadsQuery.refetch();
    } catch (error) {
      console.error('Failed to archive thread:', error);
    }
  };

  // Resolve thread
  const handleResolveThread = async (threadId: string) => {
    if (!window.confirm('Mark this thread as resolved?')) return;

    try {
      await resolveThreadMutation.mutateAsync({ threadId });
      threadsQuery.refetch();
    } catch (error) {
      console.error('Failed to resolve thread:', error);
    }
  };

  const threads = threadsQuery.data?.threads || [];
  const currentThread = threads.find((t: any) => t.id === selectedThreadId);
  const messages = messagesQuery.data?.messages || [];

  return (
    <div className="space-y-4">
      {/* Threads List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Job Timeline Threads
              </CardTitle>
              <CardDescription>
                Manage messaging threads for order {orderNumber}
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={handleCreateThread}
              disabled={createThreadMutation.isPending}
            >
              {createThreadMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-2" />
              )}
              New Thread
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {threadsQuery.isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <p className="ml-2 text-gray-600">Loading threads...</p>
            </div>
          ) : threads.length === 0 ? (
            <p className="text-center py-6 text-gray-500">
              No threads yet. Create one to get started!
            </p>
          ) : (
            <div className="space-y-2">
              {threads.map((thread: any) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedThreadId === thread.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{thread.title}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {thread.messageCount} messages •{' '}
                        {thread.lastMessageAt
                          ? new Date(thread.lastMessageAt).toLocaleDateString()
                          : 'No messages'}
                      </p>
                    </div>
                    <Badge
                      className={`ml-2 ${
                        thread.status === 'resolved'
                          ? 'bg-green-100 text-green-800'
                          : thread.status === 'archived'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {thread.status === 'resolved' ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : null}
                      {thread.status}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages View */}
      {selectedThreadId && currentThread ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{currentThread.title}</CardTitle>
                {currentThread.description && (
                  <CardDescription>{currentThread.description}</CardDescription>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveThread(selectedThreadId)}
                  disabled={currentThread.status === 'resolved'}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Resolve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleArchiveThread(selectedThreadId)}
                  disabled={currentThread.status === 'archived'}
                >
                  <Archive className="h-4 w-4 mr-1" />
                  Archive
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Messages Area */}
            <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto space-y-3 border border-gray-200">
              {messagesQuery.isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No messages in this thread yet. Start the conversation!</p>
                </div>
              ) : (
                <>
                  {messages.map((message: any) => (
                    <div
                      key={message.id}
                      className="bg-white p-3 rounded border border-gray-200 hover:shadow-sm transition-shadow"
                    >
                      {editingMessageId === message.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="text-sm"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleEditMessage(message.id)
                              }
                              disabled={editMessageMutation.isPending}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingMessageId(null);
                                setEditingContent('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-xs font-semibold text-gray-700">
                              {message.senderId}
                            </p>
                            <div className="flex items-center gap-1">
                              {message.isEdited && (
                                <span className="text-xs text-gray-500">
                                  (edited)
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {new Date(message.createdAt).toLocaleTimeString(
                                  [],
                                  {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }
                                )}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-800 mb-2">
                            {message.content}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {message.status}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2"
                              onClick={() => {
                                setEditingMessageId(message.id);
                                setEditingContent(message.content);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-red-600 hover:text-red-700"
                              onClick={() =>
                                handleDeleteMessage(message.id)
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            <div className="space-y-2">
              <Textarea
                placeholder="Type your message here..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                className="resize-none"
                rows={3}
                disabled={postMessageMutation.isPending}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setMessageContent('')}
                  disabled={!messageContent.trim()}
                >
                  Clear
                </Button>
                <Button
                  onClick={handlePostMessage}
                  disabled={
                    !messageContent.trim() || postMessageMutation.isPending
                  }
                >
                  {postMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Message
                </Button>
              </div>
            </div>

            {/* Thread Status Alert */}
            {currentThread.status !== 'active' && (
              <div
                className={`p-3 rounded-lg border flex items-start gap-2 ${
                  currentThread.status === 'resolved'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                {currentThread.status === 'resolved' ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                )}
                <p className="text-sm text-gray-700">
                  This thread is{' '}
                  <span className="font-semibold">{currentThread.status}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
