'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { trpc } from '~/utils/trpc';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '~/components/ui/alert-dialog';
import { Loader2, Send, Plus, Trash2, Edit2, MessageSquare, Eye, Lock, CheckCircle2, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface JobMessagingPanelProps {
  orderId: string;
  orderNumber?: string;
  currentUserId?: string;
}

export function JobMessagingPanel({ orderId, orderNumber, currentUserId }: JobMessagingPanelProps) {
  const [isCreateThreadDialogOpen, setIsCreateThreadDialogOpen] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadDescription, setNewThreadDescription] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [markedAsReadMessageIds, setMarkedAsReadMessageIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch threads for order
  // TODO: Implement getProjectThreadsForOrder in photoDigitization router
  // const { data: threadsData, isLoading: isLoadingThreads, refetch: refetchThreads } = trpc.photoDigitization.getProjectThreadsForOrder.useQuery(
  //   { orderId },
  //   { enabled: !!orderId }
  // );
  const threadsData: { threads: Array<{ id: string; title: string; description?: string; createdAt: string; lastMessageAt?: string; messages?: Array<{ id: string; status: string }> }> } = { threads: [] };
  const isLoadingThreads = false;
  const refetchThreads = () => {};

  // Fetch messages for selected thread
  // TODO: Implement getThreadMessages in photoDigitization router
  // const { data: messagesData, isLoading: isLoadingMessages, refetch: refetchMessages } = trpc.photoDigitization.getThreadMessages.useQuery(
  //   { threadId: selectedThreadId || '' },
  //   { enabled: !!selectedThreadId }
  // );
  const messagesData = { messages: [] };
  const isLoadingMessages = false;
  const refetchMessages = () => {};

  // Create thread mutation
  // TODO: Implement createProjectThread in photoDigitization router
  // const createThreadMutation = trpc.photoDigitization.createProjectThread.useMutation({
  //   onSuccess: () => {
  //     toast.success('Thread created successfully');
  //     setNewThreadTitle('');
  //     setNewThreadDescription('');
  //     setIsCreateThreadDialogOpen(false);
  //     refetchThreads();
  //   },
  //   onError: (error) => {
  //     toast.error(`Failed to create thread: ${error.message}`);
  //   },
  // });
  const createThreadMutation = { mutate: (_data: any) => {}, isPending: false };

  // Send message mutation
  // TODO: Implement sendThreadMessage in photoDigitization router
  // const sendMessageMutation = trpc.photoDigitization.sendThreadMessage.useMutation({
  //   onSuccess: () => {
  //     toast.success('Message sent successfully');
  //     setMessageContent('');
  //     refetchMessages();
  //   },
  //   onError: (error) => {
  //     toast.error(`Failed to send message: ${error.message}`);
  //   },
  // });
  const sendMessageMutation = { mutate: (_data: any) => {}, isPending: false };

  // Mark message as read mutation
  // TODO: Implement markMessageAsRead in photoDigitization router
  // const markAsReadMutation = trpc.photoDigitization.markMessageAsRead.useMutation({
  //   onSuccess: (messageId) => {
  //     setMarkedAsReadMessageIds(prev => new Set([...prev, messageId]));
  //   },
  //   onError: (error) => {
  //     console.error('Failed to mark message as read:', error);
  //   },
  // });
  const markAsReadMutation = { mutate: (_data: any) => {}, isPending: false };

  // Delete message mutation
  // TODO: Implement deleteThreadMessage in photoDigitization router
  // const deleteMessageMutation = trpc.photoDigitization.deleteThreadMessage.useMutation({
  //   onSuccess: () => {
  //     toast.success('Message deleted successfully');
  //     refetchMessages();
  //   },
  //   onError: (error) => {
  //     toast.error(`Failed to delete message: ${error.message}`);
  //   },
  // });
  const deleteMessageMutation = { mutate: (_data: any) => {}, isPending: false };

  // Edit message mutation
  // TODO: Implement editThreadMessage in photoDigitization router
  // const editMessageMutation = trpc.photoDigitization.editThreadMessage.useMutation({
  //   onSuccess: () => {
  //     toast.success('Message updated successfully');
  //     refetchMessages();
  //   },
  //   onError: (error) => {
  //     toast.error(`Failed to update message: ${error.message}`);
  //   },
  // });
  const editMessageMutation = { mutate: (_data: any) => {}, isPending: false };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData]);

  // Mark unread messages as read when viewing thread
  useEffect(() => {
    if (selectedThreadId && messagesData?.messages) {
      messagesData.messages.forEach((message: any) => {
        if (message.status !== 'read' && !markedAsReadMessageIds.has(message.id)) {
          markAsReadMutation.mutate({ messageId: message.id });
        }
      });
    }
  }, [selectedThreadId, messagesData]);

  // Calculate unread counts
  useEffect(() => {
    if (threadsData?.threads) {
      const counts: Record<string, number> = {};
      threadsData.threads.forEach((thread: any) => {
        const unreadCount = thread.messages?.filter((m: any) => m.status !== 'read').length || 0;
        if (unreadCount > 0) {
          counts[thread.id] = unreadCount;
        }
      });
      setUnreadCounts(counts);
    }
  }, [threadsData]);

  const handleCreateThread = () => {
    if (!newThreadTitle.trim()) {
      toast.error('Thread title is required');
      return;
    }

    createThreadMutation.mutate({
      orderId,
      title: newThreadTitle,
      description: newThreadDescription || undefined,
    });
  };

  const handleSendMessage = () => {
    if (!messageContent.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    if (!selectedThreadId) {
      toast.error('Please select a thread first');
      return;
    }

    sendMessageMutation.mutate({
      threadId: selectedThreadId,
      content: messageContent,
      isCustomerVisible: true,
    });
  };

  const handleDeleteMessage = (messageId: string) => {
    deleteMessageMutation.mutate({ messageId });
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    editMessageMutation.mutate({
      messageId,
      content: newContent,
    });
  };

  const threads = threadsData?.threads || [];
  const messages = messagesData?.messages || [];
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* Header with unread badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Message Threads</h3>
          {totalUnread > 0 && (
            <div className="flex items-center gap-1 bg-destructive text-destructive-foreground px-2 py-1 rounded-full text-xs font-semibold">
              <Bell className="w-3 h-3" />
              {totalUnread}
            </div>
          )}
        </div>
        <Button
          onClick={() => setIsCreateThreadDialogOpen(true)}
          size="sm"
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          New Thread
        </Button>
      </div>

      {/* Create Thread Dialog */}
      <Dialog open={isCreateThreadDialogOpen} onOpenChange={setIsCreateThreadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Message Thread</DialogTitle>
            <DialogDescription>
              Start a new conversation thread for order {orderNumber || orderId}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Thread Title</label>
              <input
                type="text"
                value={newThreadTitle}
                onChange={(e) => setNewThreadTitle(e.target.value)}
                placeholder="e.g., Status Update, Question about delivery"
                className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background text-foreground"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (Optional)</label>
              <Textarea
                value={newThreadDescription}
                onChange={(e) => setNewThreadDescription(e.target.value)}
                placeholder="Add more context about this thread..."
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsCreateThreadDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateThread}
                disabled={createThreadMutation.isPending}
              >
                {createThreadMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Thread
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Threads List and Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Threads List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Threads</CardTitle>
            <CardDescription>{threads.length} thread(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {isLoadingThreads ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : threads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No threads yet. Create one to start messaging.
              </p>
            ) : (
              threads.map((thread: any) => {
                const unreadCount = unreadCounts[thread.id] || 0;
                const isSelected = selectedThreadId === thread.id;
                return (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card hover:bg-muted border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{thread.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(thread.lastMessageAt || thread.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <div className="flex-shrink-0 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {unreadCount}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Messages View */}
        <Card className="lg:col-span-2">
          {selectedThreadId ? (
            <>
              <CardHeader>
                <CardTitle className="text-base">
                  {threads.find((t: any) => t.id === selectedThreadId)?.title || 'Messages'}
                </CardTitle>
                <CardDescription>
                  {threads.find((t: any) => t.id === selectedThreadId)?.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Messages List */}
                <div className="space-y-3 max-h-64 overflow-y-auto border border-border rounded-lg p-4 bg-muted/30">
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No messages yet. Start the conversation!
                    </p>
                  ) : (
                    messages.map((message: any) => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg border ${
                          message.status === 'read'
                            ? 'bg-card border-border'
                            : 'bg-accent/10 border-accent'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{message.senderName || 'Unknown'}</p>
                              {message.isAdmin && (
                                <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-semibold">
                                  <Lock className="w-3 h-3" />
                                  Admin
                                </span>
                              )}
                              {message.status === 'read' && (
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(message.createdAt), {
                                addSuffix: true,
                              })}
                              {message.isEdited && ' (edited)'}
                            </p>
                            <p className="text-sm mt-2 break-words">{message.content}</p>
                          </div>
                          {currentUserId === message.senderId && (
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newContent = prompt('Edit message:', message.content);
                                  if (newContent && newContent !== message.content) {
                                    handleEditMessage(message.id, newContent);
                                  }
                                }}
                                disabled={editMessageMutation.isPending}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMessage(message.id)}
                                disabled={deleteMessageMutation.isPending}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="space-y-2">
                  <Textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Type your message here... (visible to customer)"
                    className="min-h-20"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      onClick={handleSendMessage}
                      disabled={sendMessageMutation.isPending || !messageContent.trim()}
                      className="gap-2"
                    >
                      {sendMessageMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Send className="w-4 h-4" />
                      Send Message
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Select a thread to view messages</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
