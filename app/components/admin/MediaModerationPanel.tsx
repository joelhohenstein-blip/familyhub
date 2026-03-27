import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { trpc } from "~/utils/trpc";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Check, X, Trash2, AlertCircle } from "lucide-react";

export function MediaModerationPanel() {
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState<string | null>(null);

  // Fetch media queue
  const { data: queueData, isLoading } = trpc.moderation.getMediaQueue.useQuery({
    status: "pending",
    limit: 50,
  });

  // Fetch audit log
  const { data: auditData } = trpc.moderation.getAuditLog.useQuery({
    actionType: "APPROVE_MEDIA",
    limit: 10,
  });

  // Approve mutation
  const approveMutation = trpc.moderation.approveMedia.useMutation();

  // Reject mutation
  const rejectMutation = trpc.moderation.rejectMedia.useMutation();

  // Delete mutation
  const deleteMutation = trpc.moderation.deleteMedia.useMutation();

  const handleApprove = async (mediaId: string) => {
    try {
      await approveMutation.mutateAsync({ mediaId });
      setSelectedMediaId(null);
    } catch (error) {
      console.error("Failed to approve media:", error);
    }
  };

  const handleReject = async (mediaId: string) => {
    try {
      await rejectMutation.mutateAsync({ mediaId, reason: rejectReason || undefined });
      setSelectedMediaId(null);
      setRejectReason(null);
    } catch (error) {
      console.error("Failed to reject media:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedMediaId) return;
    try {
      await deleteMutation.mutateAsync({
        mediaId: selectedMediaId,
        confirmed: true,
      });
      setSelectedMediaId(null);
      setDeleteConfirmOpen(false);
    } catch (error) {
      console.error("Failed to delete media:", error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading media queue...</div>;
  }

  const items = queueData?.items || [];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="queue" className="w-full">
        <TabsList>
          <TabsTrigger value="queue">Media Queue</TabsTrigger>
          <TabsTrigger value="logs">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Media for Review</CardTitle>
              <CardDescription>
                Approve, reject, or delete user-uploaded media
              </CardDescription>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No pending media to moderate
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item: any) => (
                    <div
                      key={item.media_moderation.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">
                            {item.media_items.fileName || "Untitled"}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Type: {item.media_items.type}
                          </p>
                          <p className="text-xs text-gray-500">
                            Uploaded:{" "}
                            {new Date(item.media_items.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {item.media_moderation.contentFlags && (
                          <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1 rounded-full">
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                            <span className="text-xs text-yellow-700">
                              Flags detected
                            </span>
                          </div>
                        )}
                      </div>

                      {item.media_moderation.moderationNotes && (
                        <div className="bg-blue-50 p-2 rounded text-sm text-blue-700">
                          Notes: {item.media_moderation.moderationNotes}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApprove(item.media_items.id)}
                          disabled={approveMutation.isPending}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedMediaId(item.media_items.id)}
                          disabled={rejectMutation.isPending}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedMediaId(item.media_items.id);
                            setDeleteConfirmOpen(true);
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Moderation Audit Log</CardTitle>
              <CardDescription>Recent moderation actions</CardDescription>
            </CardHeader>
            <CardContent>
              {!auditData || auditData.logs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No moderation actions recorded
                </div>
              ) : (
                <div className="space-y-3">
                  {auditData.logs.map((log: any) => (
                    <div
                      key={log.id}
                      className="border rounded p-3 text-sm space-y-1"
                    >
                      <div className="font-semibold">{log.actionType}</div>
                      <div className="text-gray-600">{log.description}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <AlertDialog open={selectedMediaId !== null && !deleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Reject Media</AlertDialogTitle>
          <AlertDialogDescription>
            <div className="space-y-4">
              <p>Are you sure you want to reject this media?</p>
              <textarea
                className="w-full border rounded p-2 text-sm text-gray-900"
                placeholder="Optional: Reason for rejection..."
                value={rejectReason || ""}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
              />
            </div>
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel onClick={() => setSelectedMediaId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedMediaId) {
                  handleReject(selectedMediaId);
                }
              }}
            >
              Reject
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Media Permanently</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The media will be permanently deleted from
            the system.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Permanently
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
