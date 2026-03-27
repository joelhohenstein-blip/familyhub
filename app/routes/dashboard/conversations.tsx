import React, { useState, useEffect } from 'react';
import { useLoaderData, redirect } from 'react-router';
import { Plus, MessageSquare, Loader2 } from 'lucide-react';
import { trpc } from '~/utils/trpc';
import { callTrpc } from '~/utils/trpc.server';
import { Button } from '~/components/ui/button';
import { ConversationList } from '~/components/conversations/ConversationList';
import { ConversationDetail } from '~/components/conversations/ConversationDetail';
import { ConversationInput } from '~/components/conversations/ConversationInput';
import { StartConversationDialog } from '~/components/conversations/StartConversationDialog';
import { AppSidebar } from '~/components/app-sidebar';
import { SiteHeader } from '~/components/site-header';
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar';

interface LoaderData {
  userId: string;
}

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

export async function loader({ request, context }: any): Promise<LoaderData | Response> {
  // Try to get user from context first (SSR)
  let user = context.user;
  
  // If no context user, call tRPC to get auth state
  if (!user) {
    try {
      const caller = await callTrpc(request);
      const authResult = await caller.auth.me();
      if (!authResult.isSignedIn) {
        return redirect('/login');
      }
      user = authResult.user;
    } catch (error) {
      return redirect('/login');
    }
  }

  if (!user?.id) {
    return redirect('/login');
  }

  return {
    userId: user.id,
  };
}

export default function ConversationsPage() {
  const loaderData = useLoaderData<LoaderData>();
  const [familyId, setFamilyId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Get user's families
  const userFamiliesQuery = trpc.families.getMyFamilies.useQuery();

  // Use first family, or allow selection
  useEffect(() => {
    if (userFamiliesQuery.data && userFamiliesQuery.data.length > 0) {
      setFamilyId(userFamiliesQuery.data[0].id);
      setIsLoading(false);
    } else if (userFamiliesQuery.isLoading === false) {
      setIsLoading(false);
    }
  }, [userFamiliesQuery.data, userFamiliesQuery.isLoading]);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const handleConversationStarted = (conversationId: string) => {
    // Refresh the conversation list after a new conversation is created
    setDialogOpen(false);
    // The ConversationList will refetch via Pusher and tRPC
  };

  const getParticipantName = (conversation: Conversation): string => {
    if (!conversation.otherParticipant) return 'Unknown User';
    const participant = conversation.otherParticipant;
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

  if (isLoading || !familyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "16rem",
        "--header-height": "3.5rem",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Dashboard" />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
          <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Direct Messages</h1>
            </div>
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Chat
            </Button>
          </div>
          <p className="text-gray-600 mt-2">Connect privately with family members</p>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversation List */}
          <div className="lg:col-span-1">
            <ConversationList
              familyId={familyId}
              currentUserId={loaderData.userId}
              onSelectConversation={handleSelectConversation}
              selectedConversationId={selectedConversation?.id}
            />
          </div>

          {/* Conversation Detail and Input */}
          <div className="lg:col-span-2 space-y-4">
            {selectedConversation ? (
              <>
                <ConversationDetail
                  conversationId={selectedConversation.id}
                  currentUserId={loaderData.userId}
                  otherParticipantName={getParticipantName(selectedConversation)}
                  otherParticipantId={
                    selectedConversation.participant1Id === loaderData.userId
                      ? selectedConversation.participant2Id
                      : selectedConversation.participant1Id
                  }
                />
                <ConversationInput
                  conversationId={selectedConversation.id}
                  onMessageSent={() => {
                    // Refresh conversation list to update last message
                  }}
                />
              </>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 p-12 text-center min-h-96 flex items-center justify-center">
                <div>
                  <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No conversation selected
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Select a conversation from the list or start a new one
                  </p>
                  <Button
                    onClick={() => setDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Start New Chat
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Start Conversation Dialog */}
        <StartConversationDialog
          familyId={familyId}
          currentUserId={loaderData.userId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onConversationStarted={handleConversationStarted}
        />
      </div>
    </div>
    </SidebarInset>
    </SidebarProvider>
  );
}
