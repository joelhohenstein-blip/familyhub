import React, { useState, useEffect } from 'react';
import { useLoaderData, redirect } from 'react-router';
import { History, Loader2 } from 'lucide-react';
import { trpc } from '~/utils/trpc';
import { callTrpc } from '~/utils/trpc.server';
import { AppSidebar } from '~/components/app-sidebar';
import { SiteHeader } from '~/components/site-header';
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar';
import { AddHighlightForm } from '~/components/timeline/AddHighlightForm';
import { TimelineView } from '~/components/timeline/TimelineView';
import { TimelineSharing } from '~/components/timeline/TimelineSharing';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';

interface LoaderData {
  userId: string;
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

export default function TimelinePage() {
  const loaderData = useLoaderData<LoaderData>();
  const [familyId, setFamilyId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('view');
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  // Get user's families
  const userFamiliesQuery = trpc.families.getMyFamilies.useQuery();

  // Subscribe to timeline updates
  trpc.timeline.onTimelineUpdate.useSubscription(
    { familyId },
    {
      enabled: !!familyId,
      onData: () => {
        // Refresh timeline when updates come in
        setRefreshKey((k) => k + 1);
      },
    }
  );

  useEffect(() => {
    if (userFamiliesQuery.data && userFamiliesQuery.data.length > 0) {
      setFamilyId(userFamiliesQuery.data[0].id as string);
    }
    // Always set isLoading to false after query completes (success or error)
    if (userFamiliesQuery.isLoading === false) {
      setIsLoading(false);
    }
  }, [userFamiliesQuery.data, userFamiliesQuery.isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading timeline...</p>
        </div>
      </div>
    );
  }

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
          <SiteHeader title="Dashboard" />
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600">
                You need to be part of a family to view the timeline.
              </p>
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
        <SiteHeader title="Dashboard" />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
          <div className="max-w-4xl mx-auto px-4 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
              <div className="flex items-center gap-3">
                <History className="w-8 h-8 text-amber-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Family Timeline</h1>
                  <p className="text-gray-600 mt-1">
                    Share and celebrate your family's special moments and memories
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="view">View Timeline</TabsTrigger>
                <TabsTrigger value="add">Add Highlight</TabsTrigger>
                <TabsTrigger value="share">Share</TabsTrigger>
              </TabsList>

              {/* View Timeline Tab */}
              <TabsContent value="view" className="space-y-6">
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-xl font-semibold text-gray-900">
                    Family Timeline
                  </h2>
                  <TimelineView
                    key={refreshKey}
                    familyId={familyId}
                    onShareClick={(highlightId) => {
                      setSelectedHighlightId(highlightId);
                      setActiveTab('share');
                    }}
                  />
                </div>
              </TabsContent>

              {/* Add Highlight Tab */}
              <TabsContent value="add" className="space-y-6">
                <AddHighlightForm
                  familyId={familyId}
                  onSuccess={() => {
                    setActiveTab('view');
                    setRefreshKey((k) => k + 1);
                  }}
                />
              </TabsContent>

              {/* Share Tab */}
              <TabsContent value="share" className="space-y-6">
                <TimelineSharing
                  familyId={familyId}
                  highlightId={selectedHighlightId}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
