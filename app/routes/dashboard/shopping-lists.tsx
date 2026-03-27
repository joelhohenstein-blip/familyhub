"use client"

import React, { useState } from 'react';
import { useLoaderData, redirect } from 'react-router';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { trpc } from '~/utils/trpc';
import { callTrpc } from '~/utils/trpc.server';
import { AppSidebar } from '~/components/app-sidebar';
import { SiteHeader } from '~/components/site-header';
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar';
import { ShoppingListsPage } from '~/components/shopping-lists/ShoppingListsPage';

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

export default function ShoppingListsPageRoute() {
  const loaderData = useLoaderData<LoaderData>();
  const [familyId, setFamilyId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Get user's families
  const userFamiliesQuery = trpc.families.getMyFamilies.useQuery();

  React.useEffect(() => {
    if (userFamiliesQuery.data && userFamiliesQuery.data.length > 0) {
      setFamilyId(userFamiliesQuery.data[0].id);
    }
    if (userFamiliesQuery.isLoading === false) {
      setIsLoading(false);
    }
  }, [userFamiliesQuery.data, userFamiliesQuery.isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading shopping lists...</p>
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
                You need to be part of a family to view shopping lists.
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
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-8 h-8 text-orange-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Shopping Lists
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Create and manage family shopping lists
                  </p>
                </div>
              </div>
            </div>

            {/* Shopping Lists Page */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <ShoppingListsPage familyId={familyId} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
