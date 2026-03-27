import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { trpc } from "~/utils/trpc";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Pin, Trash2, Search, AlertCircle, Clock } from "lucide-react";

export function PinMessagesPanel() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [unpinConfirmOpen, setUnpinConfirmOpen] = useState(false);
  const [messageToUnpin, setMessageToUnpin] = useState<{ conversationId: string; messageId: string } | null>(null);

  // Fetch current user's families and conversations
  const { data: userData } = trpc.auth.me.useQuery();
  const familyId = userData?.user?.id ? "family-placeholder" : null; // In a real app, get from context

  // Get conversations for the current user
  const { data: conversationsData, isLoading: conversationsLoading } = trpc.conversations.getConversations.useQuery(
    { familyId: selectedConversationId || "" },
    { enabled: !!selectedConversationId }
  );

  // Get pinned messages for selected conversation
  const { data: pinnedData, isLoading: pinnedLoading } = trpc.messages.getPinnedMessages.useQuery(
    { conversationId: selectedConversationId || "" },
    { enabled: !!selectedConversationId }
  );

  // Pin message mutation
  const pinMutation = trpc.messages.pinMessage.useMutation();

  // Unpin message mutation
  const unpinMutation = trpc.messages.unpinMessage.useMutation();

  const handlePin = async (conversationId: string, messageId: string) => {
    try {
      await pinMutation.mutateAsync({
        conversationId,
        messageId,
      });
    } catch (error) {
      console.error("Failed to pin message:", error);
    }
  };

  const handleUnpinClick = (conversationId: string, messageId: string) => {
    setMessageToUnpin({ conversationId, messageId });
    setUnpinConfirmOpen(true);
  };

  const handleUnpinConfirm = async () => {
    if (!messageToUnpin) return;
    try {
      await unpinMutation.mutateAsync({
        conversationId: messageToUnpin.conversationId,
        messageId: messageToUnpin.messageId,
      });
      setUnpinConfirmOpen(false);
      setMessageToUnpin(null);
    } catch (error) {
      console.error("Failed to unpin message:", error);
    }
  };

  // Filter pinned messages by search query
  const filteredPinnedMessages = useMemo(() => {
    if (!pinnedData) return [];
    if (!searchQuery) return pinnedData;

    const query = searchQuery.toLowerCase();
    return pinnedData.filter((item: any) =>
      item.message?.content.toLowerCase().includes(query)
    );
  }, [pinnedData, searchQuery]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pinned" className="w-full">
        <TabsList>
          <TabsTrigger value="pinned">Pinned Messages</TabsTrigger>
          <TabsTrigger value="conversations">Manage Conversations</TabsTrigger>
        </TabsList>

        <TabsContent value="pinned" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Currently Pinned Messages</CardTitle>
              <CardDescription>
                View and manage pinned messages across your conversations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedConversationId ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-semibold">Select a conversation</p>
                    <p>Switch to the "Manage Conversations" tab to select a conversation and view its pinned messages.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search pinned messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {pinnedLoading ? (
                    <div className="text-center py-8 text-gray-500">
                      Loading pinned messages...
                    </div>
                  ) : filteredPinnedMessages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No pinned messages in this conversation
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredPinnedMessages.map((item: any) => (
                        <div
                          key={item.id}
                          className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <Pin className="w-4 h-4 text-blue-600 fill-blue-600" />
                                <p className="text-sm font-semibold text-gray-900">
                                  {item.message?.content.substring(0, 100)}
                                </p>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-500 ml-6">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Pinned: {new Date(item.pinnedAt).toLocaleString()}
                                </div>
                              </div>
                              {item.message?.content.length > 100 && (
                                <p className="text-sm text-gray-600 ml-6 mt-2 line-clamp-2">
                                  {item.message.content.substring(100)}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 ml-6">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                handleUnpinClick(
                                  item.conversationId,
                                  item.messageId
                                )
                              }
                              disabled={unpinMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Unpin
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Messages</CardTitle>
              <CardDescription>
                Select a conversation to view and pin messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Placeholder for conversations list */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-600">
                    Conversation selection functionality requires integration with family/conversation data.
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    In a complete implementation, this would display all active conversations for the family.
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-700">
                  <p className="font-semibold">Coming Soon</p>
                  <p>Message pinning interface requires family context. Admins can pin messages directly from conversation view.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Unpin Confirmation Dialog */}
      <AlertDialog open={unpinConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Unpin Message</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to unpin this message? It will no longer be highlighted for conversation participants.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel onClick={() => setUnpinConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnpinConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Unpin
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
