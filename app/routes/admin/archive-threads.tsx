import { redirect, useLoaderData } from "react-router";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { callTrpc } from "../../utils/trpc.server";
import { trpc } from "../../utils/trpc";
import { ArchivedThreadsView } from "../../components/archive/ArchivedThreadsView";
import { ArchiveSchedulerPanel } from "../../components/archive/ArchiveSchedulerPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

interface LoaderData {
  userId: string;
}

export async function loader({ request }: { request: Request }): Promise<LoaderData | Response> {
  const caller = await callTrpc(request);
  const { isSignedIn, user } = await caller.auth.me();

  if (!isSignedIn) {
    return redirect("/login");
  }

  if (!user?.id) {
    return redirect("/login");
  }

  return { userId: user.id };
}

export default function ArchiveThreadsPage() {
  const { userId } = useLoaderData<LoaderData>();
  const [familyId, setFamilyId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Get user's families
  const userFamiliesQuery = trpc.families.getMyFamilies.useQuery(undefined, {
    retry: 1,
  });

  // Use first family
  useEffect(() => {
    if (userFamiliesQuery.data && userFamiliesQuery.data.length > 0) {
      setFamilyId(userFamiliesQuery.data[0].id);
      setIsLoading(false);
    } else if (!userFamiliesQuery.isLoading && userFamiliesQuery.error) {
      // Error fetching families
      setIsLoading(false);
    } else if (!userFamiliesQuery.isLoading && userFamiliesQuery.data?.length === 0) {
      // No families
      setIsLoading(false);
    }
  }, [userFamiliesQuery.data, userFamiliesQuery.isLoading, userFamiliesQuery.error]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading archive management...</p>
        </div>
      </div>
    );
  }

  if (!familyId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Family Found</h2>
          <p className="text-gray-600 mb-6">
            You don't have access to any families. Please contact an administrator.
          </p>
          <a href="/dashboard" className="text-blue-600 hover:text-blue-700">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Thread Archive Management</h1>
          <p className="text-gray-600 mt-2">
            Schedule, view, and restore archived conversation threads
          </p>
        </div>

        <Tabs defaultValue="archived" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="archived">Archived Threads</TabsTrigger>
            <TabsTrigger value="scheduler">Schedule Archive</TabsTrigger>
          </TabsList>

          <TabsContent value="archived" className="mt-6">
            <ArchivedThreadsView
              familyId={familyId}
              currentUserId={userId}
              isAdmin={true}
            />
          </TabsContent>

          <TabsContent value="scheduler" className="mt-6">
            <ArchiveSchedulerPanel
              familyId={familyId}
              isAdmin={true}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
