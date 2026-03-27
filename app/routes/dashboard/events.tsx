import React, { useState, useEffect } from 'react';
import { useLoaderData, redirect } from 'react-router';
import { Calendar, Loader2 } from 'lucide-react';
import { trpc } from '~/utils/trpc';
import { callTrpc } from '~/utils/trpc.server';
import { AppSidebar } from '~/components/app-sidebar';
import { SiteHeader } from '~/components/site-header';
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar';
import { EventSuggestionsGenerator } from '~/components/events/EventSuggestionsGenerator';
import { EventSuggestionsList } from '~/components/events/EventSuggestionsList';
import { CalendarSyncPanel } from '~/components/events/CalendarSyncPanel';
import { CreateEventForm } from '~/components/events/CreateEventForm';
import { CalendarView } from '~/components/events/CalendarView';
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

export default function EventsPage() {
  const loaderData = useLoaderData<LoaderData>();
  const [familyId, setFamilyId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');
  const [refreshKey, setRefreshKey] = useState(0);

  // Get user's families
  const userFamiliesQuery = trpc.families.getMyFamilies.useQuery();

  // Get current user's role in the family
  const familyMembersQuery = trpc.familyMembers.getMembers.useQuery(
    { familyId },
    { enabled: !!familyId }
  );

  // Get event suggestions
  const suggestionsQuery = trpc.eventSuggestions.viewSuggestions.useQuery(
    { familyId, status: 'pending' },
    { enabled: !!familyId }
  );

  useEffect(() => {
    if (userFamiliesQuery.data && userFamiliesQuery.data.length > 0) {
      setFamilyId(userFamiliesQuery.data[0].id);
    }
    // Always set isLoading to false after query completes (success or error)
    if (userFamiliesQuery.isLoading === false) {
      setIsLoading(false);
    }
  }, [userFamiliesQuery.data, userFamiliesQuery.isLoading]);

  // Check if user is admin
  useEffect(() => {
    if (familyMembersQuery.data?.members && loaderData.userId) {
      const currentMember = familyMembersQuery.data.members.find(
        (member: any) => member.family_members?.userId === loaderData.userId
      );
      setIsAdmin(currentMember?.family_members?.role === 'admin');
    }
  }, [familyMembersQuery.data, loaderData.userId]);

  const handleSuggestionsSuccess = () => {
    // Refresh the suggestions list
    setRefreshKey((k) => k + 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading events...</p>
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
              <p className="text-gray-600">You need to be part of a family to view events.</p>
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
                <Calendar className="w-8 h-8 text-purple-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Family Events</h1>
                  <p className="text-gray-600 mt-1">
                    AI-generated event suggestions and calendar synchronization
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
                <TabsTrigger value="create">Create Event</TabsTrigger>
                <TabsTrigger value="suggest">Suggestions</TabsTrigger>
                {isAdmin && <TabsTrigger value="sync">Calendar Sync</TabsTrigger>}
              </TabsList>

              {/* Calendar Tab */}
              <TabsContent value="calendar" className="space-y-6">
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-xl font-semibold text-gray-900">Family Calendar</h2>
                  <CalendarView familyId={familyId} />
                </div>
              </TabsContent>

              {/* Create Event Tab */}
              <TabsContent value="create" className="space-y-6">
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-xl font-semibold text-gray-900">Create New Event</h2>
                  <CreateEventForm
                    familyId={familyId}
                    onSuccess={() => {
                      setActiveTab('calendar');
                      setRefreshKey((k) => k + 1);
                    }}
                  />
                </div>
              </TabsContent>

              {/* Suggestions Tab */}
              <TabsContent value="suggest" className="space-y-6">
                {/* Generator */}
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-xl font-semibold text-gray-900">Generate Suggestions</h2>
                  <EventSuggestionsGenerator
                    familyId={familyId}
                    onSuccess={handleSuggestionsSuccess}
                  />
                </div>

                {/* Suggestions List */}
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-xl font-semibold text-gray-900">
                    Pending Suggestions ({suggestionsQuery.data?.count || 0})
                  </h2>
                  <EventSuggestionsList
                    familyId={familyId}
                    suggestions={(suggestionsQuery.data?.suggestions as any) || []}
                    isLoading={suggestionsQuery.isLoading}
                  />
                </div>
              </TabsContent>

              {/* Sync Tab (Admin only) */}
              {isAdmin && (
                <TabsContent value="sync" className="space-y-4">
                  <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-semibold text-gray-900">Calendar Integration</h2>
                    <CalendarSyncPanel familyId={familyId} />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
