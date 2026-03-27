import React from 'react';
import { useLoaderData, redirect } from 'react-router';
import { v5 as uuidv5 } from 'uuid';
import { trpc } from '~/utils/trpc';
import { callTrpc } from '~/utils/trpc.server';
import MediaGallery from '~/components/media-gallery/MediaGallery';
import { AppSidebar } from '~/components/app-sidebar';
import { SiteHeader } from '~/components/site-header';
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar';
import type { Route } from './+types/media';

// Stable namespace for generating gallery IDs from family IDs
const GALLERY_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

interface LoaderData {
  userId: string;
}

export async function loader({ request }: Route.LoaderArgs): Promise<LoaderData | Response> {
  const caller = await callTrpc(request);
  const { isSignedIn, user } = await caller.auth.me();

  if (!isSignedIn || !user?.id) {
    return redirect('/login');
  }

  return {
    userId: user.id,
  };
}

export default function MediaPage() {
  const loaderData = useLoaderData<LoaderData>();
  const [familyId, setFamilyId] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(true);

  // Get user's families
  const userFamiliesQuery = trpc.families.getMyFamilies.useQuery();

  // Use first family
  React.useEffect(() => {
    if (userFamiliesQuery.data && userFamiliesQuery.data.length > 0) {
      const family = userFamiliesQuery.data[0];
      setFamilyId(family.id);
      setIsLoading(false);
    } else if (userFamiliesQuery.isLoading === false) {
      setIsLoading(false);
    }
  }, [userFamiliesQuery.data, userFamiliesQuery.isLoading]);

  if (isLoading || !familyId) {
    return (
      <SidebarProvider
        style={{
          "--sidebar-width": "16rem",
          "--header-height": "3.5rem",
        } as React.CSSProperties}
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader title="Media Gallery" />
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin inline-block">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
              <p className="text-gray-600 mt-4">Loading media gallery...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // Generate a stable gallery ID from the family ID
  const galleryId = uuidv5(familyId, GALLERY_NAMESPACE);

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "16rem",
        "--header-height": "3.5rem",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Media Gallery" />
        <div className="flex flex-1 flex-col p-6 bg-gradient-to-b from-orange-50 to-rose-50">
          <MediaGallery familyId={familyId} galleryId={galleryId} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
