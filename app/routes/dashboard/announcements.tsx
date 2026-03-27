"use client"

import React, { useState } from 'react';
import { useLoaderData, redirect } from 'react-router';
import { Megaphone, Plus, Loader2 } from 'lucide-react';
import { trpc } from '~/utils/trpc';
import { callTrpc } from '~/utils/trpc.server';
import { AppSidebar } from '~/components/app-sidebar';
import { SiteHeader } from '~/components/site-header';
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar';
import { Button } from '~/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { AnnouncementList } from '~/components/announcements/AnnouncementList';
import { AnnouncementDetail } from '~/components/announcements/AnnouncementDetail';
import { CreateAnnouncementForm } from '~/components/announcements/CreateAnnouncementForm';

interface LoaderData {
  userId: string;
}

export async function loader({ request, context }: any): Promise<LoaderData | Response> {
  let user = context.user;

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

  return { userId: user.id };
}

export default function AnnouncementsPage() {
  const loaderData = useLoaderData<LoaderData>();
  const [familyId, setFamilyId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('announcements');
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Get user's families
  const userFamiliesQuery = trpc.families.getMyFamilies.useQuery();

  // Get family members to check role
  const familyMembersQuery = trpc.familyMembers.getMembers.useQuery(
    { familyId },
    { enabled: !!familyId }
  );

  // Get announcements
  const announcementsQuery = trpc.announcements.getForFamily.useQuery(
    { familyId },
    { enabled: !!familyId }
  );

  // Get read receipts for selected announcement (admin only)
  const readReceiptsQuery = trpc.announcements.getReadReceipts.useQuery(
    { announcementId: selectedAnnouncementId || '' },
    { enabled: !!selectedAnnouncementId && isAdmin }
  );

  React.useEffect(() => {
    if (userFamiliesQuery.data && userFamiliesQuery.data.length > 0) {
      setFamilyId(userFamiliesQuery.data[0].id);
    }
    if (userFamiliesQuery.isLoading === false) {
      setIsLoading(false);
    }
  }, [userFamiliesQuery.data, userFamiliesQuery.isLoading]);

  // Check if user is admin
  React.useEffect(() => {
    if (familyMembersQuery.data?.members && loaderData.userId) {
      const currentMember = familyMembersQuery.data.members.find(
        (member: any) => member.family_members?.userId === loaderData.userId
      );
      setIsAdmin(currentMember?.family_members?.role === 'admin');
    }
  }, [familyMembersQuery.data, loaderData.userId]);

  const markAsReadMutation = trpc.announcements.markAsRead.useMutation({
    onSuccess: () => {
      setRefreshKey((k) => k + 1);
    },
  });

  const acknowledgeMutation = trpc.announcements.acknowledge.useMutation({
    onSuccess: () => {
      setRefreshKey((k) => k + 1);
    },
  });

  const selectedAnnouncement = announcementsQuery.data?.find(
    (a: any) => a.id === selectedAnnouncementId
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading announcements...</p>
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
                You need to be part of a family to view announcements.
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
          <div className="max-w-6xl mx-auto px-4 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Megaphone className="w-8 h-8 text-blue-600" />
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      Family Announcements
                    </h1>
                    <p className="text-gray-600 mt-1">
                      Important updates from family admins
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    onClick={() => setActiveTab('create')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Announcement
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="announcements">Announcements</TabsTrigger>
                {isAdmin && <TabsTrigger value="create">Create</TabsTrigger>}
              </TabsList>

              {/* Announcements Tab */}
              <TabsContent value="announcements" className="space-y-6">
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <AnnouncementList
                    key={refreshKey}
                    announcements={(announcementsQuery.data || []) as any}
                    isLoading={announcementsQuery.isLoading}
                    onMarkAsRead={(announcementId) => {
                      markAsReadMutation.mutate({ announcementId });
                    }}
                    onAcknowledge={(announcementId) => {
                      acknowledgeMutation.mutate({ announcementId });
                    }}
                    onViewDetails={(announcementId) => {
                      setSelectedAnnouncementId(announcementId);
                    }}
                  />
                </div>
              </TabsContent>

              {/* Create Tab (Admin only) */}
              {isAdmin && (
                <TabsContent value="create" className="space-y-6">
                  <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-semibold text-gray-900">
                      Create New Announcement
                    </h2>
                    <CreateAnnouncementForm
                      familyId={familyId}
                      onSuccess={() => {
                        setActiveTab('announcements');
                        setRefreshKey((k) => k + 1);
                      }}
                    />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </SidebarInset>

      {/* Detail Modal */}
      {selectedAnnouncement && (
        <AnnouncementDetail
          announcement={{
            id: selectedAnnouncement.id,
            title: selectedAnnouncement.title,
            content: selectedAnnouncement.content,
            category: selectedAnnouncement.category,
            isPinned: selectedAnnouncement.isPinned || false,
            priority: selectedAnnouncement.priority || 0,
            createdAt: new Date(selectedAnnouncement.createdAt),
            createdBy: selectedAnnouncement.createdBy,
          }}
          isAdmin={isAdmin}
          isRead={selectedAnnouncement.isRead}
          isAcknowledged={selectedAnnouncement.isAcknowledged}
          readReceipts={readReceiptsQuery.data as any}
          onClose={() => setSelectedAnnouncementId(null)}
          onMarkAsRead={() => {
            markAsReadMutation.mutate({ announcementId: selectedAnnouncement.id });
          }}
          onAcknowledge={() => {
            acknowledgeMutation.mutate({ announcementId: selectedAnnouncement.id });
          }}
        />
      )}
    </SidebarProvider>
  );
}
