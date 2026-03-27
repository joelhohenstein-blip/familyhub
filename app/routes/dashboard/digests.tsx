import React, { useState, useEffect } from 'react';
import { useLoaderData, redirect } from 'react-router';
import { BookOpen, Loader2 } from 'lucide-react';
import { trpc } from '~/utils/trpc';
import { callTrpc } from '~/utils/trpc.server';
import { AppSidebar } from '~/components/app-sidebar';
import { SiteHeader } from '~/components/site-header';
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar';
import { DigestGenerator } from '~/components/digest/DigestGenerator';
import { DigestViewer } from '~/components/digest/DigestViewer';
import { DigestSharing } from '~/components/digest/DigestSharing';
import { SubscriptionManager } from '~/components/digest/SubscriptionManager';
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

export default function DigestsPage() {
  const loaderData = useLoaderData<LoaderData>();
  const [familyId, setFamilyId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');

  // Get user's families
  const userFamiliesQuery = trpc.families.getMyFamilies.useQuery();

  // Get current user's role in the family
  const familyMembersQuery = trpc.familyMembers.getMembers.useQuery(
    { familyId },
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading digests...</p>
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
              <p className="text-gray-600">You need to be part of a family to view digests.</p>
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
                <BookOpen className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Family Digests</h1>
                  <p className="text-gray-600 mt-1">
                    AI-powered summaries of your family conversations and activities
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="generate">Generate</TabsTrigger>
                <TabsTrigger value="view">View</TabsTrigger>
                <TabsTrigger value="share">Share</TabsTrigger>
                {isAdmin && <TabsTrigger value="manage">Manage</TabsTrigger>}
              </TabsList>

              {/* Generate Tab */}
              <TabsContent value="generate" className="space-y-4">
                <DigestGenerator
                  familyId={familyId}
                  onDigestGenerated={() => {
                    // Optionally switch to view tab
                  }}
                />
              </TabsContent>

              {/* View Tab */}
              <TabsContent value="view" className="space-y-4">
                <DigestViewer familyId={familyId} />
              </TabsContent>

              {/* Share Tab */}
              <TabsContent value="share" className="space-y-4">
                <DigestSharing familyId={familyId} />
              </TabsContent>

              {/* Manage Tab (Admin only) */}
              {isAdmin && (
                <TabsContent value="manage" className="space-y-4">
                  <SubscriptionManager familyId={familyId} />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
