import React from 'react';
import { useLoaderData, redirect } from 'react-router';
import { callTrpc } from '~/utils/trpc.server';
import { trpc } from '~/utils/trpc';
import { MessageBoardContainer } from '~/components/message-board/MessageBoardContainer';
import { AppSidebar } from '~/components/app-sidebar';
import { SiteHeader } from '~/components/site-header';
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar';
import type { Route } from './+types/messages';

interface LoaderData {
  familyId: string;
  userId: string;
}

export async function loader({ request }: Route.LoaderArgs): Promise<LoaderData | Response> {
  const caller = await callTrpc(request);
  const { isSignedIn, user } = await caller.auth.me();

  if (!isSignedIn || !user?.id) {
    return redirect('/login');
  }

  // Get user's first family
  let familyId = '';
  try {
    const result = await caller.families.getAll({});
    if (result.families.length > 0) {
      familyId = result.families[0].id;
    }
  } catch (error) {
    console.error('Error fetching families:', error);
  }

  return {
    familyId,
    userId: user.id,
  };
}

export default function MessagesPage() {
  const loaderData = useLoaderData<LoaderData>();
  const { familyId, userId } = loaderData;

  if (!familyId) {
    return (
      <SidebarProvider
        style={{
          "--sidebar-width": "16rem",
          "--header-height": "3.5rem",
        } as React.CSSProperties}
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader title="Messages" />
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600">Loading message board...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
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
        <SiteHeader title="Message Board" />
        <div className="flex flex-1 flex-col p-6 bg-gradient-to-b from-orange-50 to-rose-50">
          <MessageBoardContainer
            familyId={familyId}
            currentUserId={userId}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
