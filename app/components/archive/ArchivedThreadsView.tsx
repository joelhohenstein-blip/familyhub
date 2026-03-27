import React, { useState, useMemo } from 'react';
import { trpc } from '~/utils/trpc';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Checkbox } from '~/components/ui/checkbox';
import { Loader2, Archive, RotateCcw, Trash2, Search, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ArchivedThreadsViewProps {
  familyId: string;
  currentUserId: string;
  isAdmin?: boolean;
}

export const ArchivedThreadsView: React.FC<ArchivedThreadsViewProps> = ({
  familyId,
  currentUserId,
  isAdmin = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set());
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [threadToRestore, setThreadToRestore] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Fetch archived threads
  const { data: archivedData, isLoading: archivedLoading, refetch } = trpc.archive.getArchivedThreads.useQuery(
    {
      familyId,
      limit,
      offset,
      searchQuery: searchQuery || undefined,
    },
    { enabled: !!familyId }
  );

  // Fetch archive stats
  const { data: statsData } = trpc.archive.getArchiveStats.useQuery(
    { familyId },
    { enabled: !!familyId }
  );

  // Restore thread mutation
  const restoreMutation = trpc.archive.restoreThread.useMutation({
    onSuccess: () => {
      setThreadToRestore(null);
      setRestoreConfirmOpen(false);
      refetch();
    },
  });

  const threads = archivedData?.threads || [];
  const hasMore = archivedData?.hasMore || false;

  // Handle thread selection
  const handleSelectThread = (threadId: string) => {
    const newSelected = new Set(selectedThreads);
    if (newSelected.has(threadId)) {
      newSelected.delete(threadId);
    } else {
      newSelected.add(threadId);
    }
    setSelectedThreads(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedThreads.size === threads.length && threads.length > 0) {
      setSelectedThreads(new Set());
    } else {
      setSelectedThreads(new Set(threads.map(t => t.id)));
    }
  };

  const handleRestoreClick = (threadId: string) => {
    setThreadToRestore(threadId);
    setRestoreConfirmOpen(true);
  };

  const handleRestoreConfirm = async () => {
    if (!threadToRestore) return;
    try {
      await restoreMutation.mutateAsync({
        conversationId: threadToRestore,
      });
    } catch (error) {
      console.error('Failed to restore thread:', error);
    }
  };

  // Filter threads based on search (client-side for now)
  const filteredThreads = useMemo(() => {
    if (!searchQuery) return threads;
    const query = searchQuery.toLowerCase();
    return threads.filter((thread: any) => {
      // Search in participant names would require more data
      return thread.id.toLowerCase().includes(query);
    });
  }, [threads, searchQuery]);

  if (archivedLoading && threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-gray-600">Loading archived threads...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Active Threads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statsData.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Archived Threads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{statsData.archived}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Scheduled Archives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{statsData.scheduled}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Archived Threads List */}
      <Card>
        <CardHeader>
          <CardTitle>Archived Threads</CardTitle>
          <CardDescription>
            View and manage archived conversation threads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search archived threads..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setOffset(0);
              }}
              className="pl-10"
            />
          </div>

          {filteredThreads.length === 0 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <Archive className="w-12 h-12 text-blue-400 mx-auto mb-3 opacity-50" />
              <p className="text-blue-900 font-semibold">No archived threads</p>
              <p className="text-blue-700 text-sm mt-1">
                Archived threads will appear here. You can restore them anytime.
              </p>
            </div>
          ) : (
            <>
              {/* Selection controls */}
              {isAdmin && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <Checkbox
                    checked={selectedThreads.size === filteredThreads.length && filteredThreads.length > 0}
                    onCheckedChange={handleSelectAll}
                    id="select-all"
                  />
                  <label
                    htmlFor="select-all"
                    className="text-sm font-medium text-gray-700 flex-1 cursor-pointer"
                  >
                    Select all ({filteredThreads.length})
                  </label>
                  {selectedThreads.size > 0 && (
                    <div className="text-sm text-gray-600">
                      {selectedThreads.size} selected
                    </div>
                  )}
                </div>
              )}

              {/* Threads List */}
              <div className="space-y-3">
                {filteredThreads.map((thread: any) => (
                  <div
                    key={thread.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      {isAdmin && (
                        <Checkbox
                          checked={selectedThreads.has(thread.id)}
                          onCheckedChange={() => handleSelectThread(thread.id)}
                          id={`thread-${thread.id}`}
                          className="mt-1"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Archive className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            Thread {thread.id.slice(0, 8)}...
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 text-xs text-gray-600">
                          <div>
                            <span className="font-medium">Archived:</span> {format(new Date(thread.updatedAt), 'MMM d, yyyy h:mm a')}
                          </div>
                          <div>
                            <span className="font-medium">Status:</span>{' '}
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              Archived
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestoreClick(thread.id)}
                        disabled={restoreMutation.isPending}
                        className="whitespace-nowrap"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Restore
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Showing {threads.length} of {offset + threads.length}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOffset(offset + limit)}
                    disabled={!hasMore}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Restore Thread</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to restore this archived thread? It will become active again and participants will be able to send messages.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel onClick={() => setRestoreConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreConfirm}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Restore
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
