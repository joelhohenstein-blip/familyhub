'use client';

import React, { useState, useCallback } from 'react';
import { trpc } from '~/utils/trpc';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '~/components/ui/alert-dialog';
import { Loader2, Plus, Lock, Unlock, Eye, Trash2, Clock, Shield, CheckCircle2, AlertCircle, FileText, User, Calendar } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

interface SecureFolderManagerProps {
  orderId: string;
  orderNumber?: string;
}

export function SecureFolderManager({ orderId, orderNumber }: SecureFolderManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [isLockDialogOpen, setIsLockDialogOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [lockReason, setLockReason] = useState('');

  // Fetch folders for order
  const { data: foldersData, isLoading: isLoadingFolders, refetch: refetchFolders } = trpc.photoDigitization.getFoldersForOrder.useQuery(
    { orderId },
    { enabled: !!orderId }
  );

  // Fetch folder access log
  const { data: auditLogData, isLoading: isLoadingAudit } = trpc.photoDigitization.getFolderAccessLog.useQuery(
    { folderId: selectedFolderId || '' },
    { enabled: !!selectedFolderId && isAuditDialogOpen }
  );

  // Create folder mutation
  const createFolderMutation = trpc.photoDigitization.createPrivateFolder.useMutation({
    onSuccess: () => {
      toast.success('Secure folder created');
      setNewFolderName('');
      setNewFolderDescription('');
      setIsCreateDialogOpen(false);
      refetchFolders();
    },
    onError: (error) => {
      toast.error(`Failed to create folder: ${error.message}`);
    },
  });

  // Lock folder mutation
  const lockFolderMutation = trpc.photoDigitization.lockPrivateFolder.useMutation({
    onSuccess: () => {
      toast.success('Folder locked successfully');
      setIsLockDialogOpen(false);
      setLockReason('');
      setSelectedFolderId(null);
      refetchFolders();
    },
    onError: (error) => {
      toast.error(`Failed to lock folder: ${error.message}`);
    },
  });

  // Unlock folder mutation
  const unlockFolderMutation = trpc.photoDigitization.unlockPrivateFolder.useMutation({
    onSuccess: () => {
      toast.success('Folder unlocked successfully');
      refetchFolders();
    },
    onError: (error) => {
      toast.error(`Failed to unlock folder: ${error.message}`);
    },
  });

  // Handlers
  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name is required');
      return;
    }

    await createFolderMutation.mutateAsync({
      orderId,
      folderName: newFolderName,
      description: newFolderDescription || undefined,
    });
  }, [orderId, newFolderName, newFolderDescription, createFolderMutation]);

  const handleLockFolder = useCallback(async () => {
    if (!selectedFolderId || !lockReason.trim()) {
      toast.error('Please provide a reason for locking');
      return;
    }

    await lockFolderMutation.mutateAsync({
      folderId: selectedFolderId,
      reason: lockReason,
    });
  }, [selectedFolderId, lockReason, lockFolderMutation]);

  const handleUnlockFolder = useCallback(async (folderId: string) => {
    await unlockFolderMutation.mutateAsync({
      folderId,
    });
  }, [unlockFolderMutation]);

  const folders = foldersData?.folders || [];
  const auditLog = auditLogData?.log || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            Secure Folder Vault
          </h2>
          {orderNumber && (
            <p className="text-sm text-muted-foreground">Order: <span className="font-semibold text-foreground">{orderNumber}</span></p>
          )}
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="gap-2 h-10"
          disabled={createFolderMutation.isPending}
        >
          {createFolderMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          New Folder
        </Button>
      </div>

      {/* Security Notice */}
      <Card className="bg-accent/10 border-accent/30">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
            <div className="text-sm text-foreground">
              <p><strong>🔐 Admin Only Vault:</strong> This secure folder stores sensitive project materials and client data.</p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <span className="text-xs">End-to-end encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <span className="text-xs">Full audit trail</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <span className="text-xs">Access controlled</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Folders List */}
      {isLoadingFolders ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : folders.length === 0 ? (
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500 text-center py-4">
              No secure folders yet. Create one to organize sensitive project materials.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {folders.map((folder: any) => (
            <Card key={folder.id} className={`overflow-hidden transition-all ${folder.isLocked ? 'bg-muted/50 border-destructive/30' : 'hover:border-primary/50'}`}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Folder Name & Status */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-lg text-foreground">{folder.folderName}</h3>
                      <div className="flex items-center gap-2">
                        {folder.isLocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/15 text-destructive text-xs font-semibold border border-destructive/30">
                            <Lock className="h-3 w-3" />
                            Locked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/15 text-accent text-xs font-semibold border border-accent/30">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold border border-primary/30">
                          <Shield className="h-3 w-3" />
                          Encrypted
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {folder.description && (
                      <p className="text-sm text-muted-foreground">{folder.description}</p>
                    )}

                    {/* Lock Reason Alert */}
                    {folder.isLocked && folder.lockedReason && (
                      <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-destructive">
                          <p className="font-semibold">Lock Reason:</p>
                          <p className="mt-1">{folder.lockedReason}</p>
                        </div>
                      </div>
                    )}

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">Created</p>
                        <div className="flex items-center gap-1.5 text-xs text-foreground">
                          <Calendar className="h-3 w-3 text-primary" />
                          <span>{formatDistanceToNow(new Date(folder.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                      {folder.lastAccessedAt && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-medium">Last Accessed</p>
                          <div className="flex items-center gap-1.5 text-xs text-foreground">
                            <Eye className="h-3 w-3 text-primary" />
                            <span>{formatDistanceToNow(new Date(folder.lastAccessedAt), { addSuffix: true })}</span>
                          </div>
                        </div>
                      )}
                      {folder.contentCount && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-medium">Items</p>
                          <div className="flex items-center gap-1.5 text-xs text-foreground">
                            <FileText className="h-3 w-3 text-primary" />
                            <span>{folder.contentCount} file(s)</span>
                          </div>
                        </div>
                      )}
                      {folder.lastModifiedBy && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-medium">Modified</p>
                          <div className="flex items-center gap-1.5 text-xs text-foreground">
                            <Clock className="h-3 w-3 text-primary" />
                            <span>{formatDistanceToNow(new Date(folder.updatedAt), { addSuffix: true })}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedFolderId(folder.id);
                        setIsAuditDialogOpen(true);
                      }}
                      className="gap-1.5"
                      title="View access audit log"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">Audit</span>
                    </Button>
                    {!folder.isLocked ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFolderId(folder.id);
                          setIsLockDialogOpen(true);
                        }}
                        className="gap-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        title="Lock folder"
                      >
                        <Lock className="h-4 w-4" />
                        <span className="hidden sm:inline">Lock</span>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnlockFolder(folder.id)}
                        disabled={unlockFolderMutation.isPending}
                        className="gap-1.5 text-accent hover:text-accent hover:bg-accent/10"
                        title="Unlock folder"
                      >
                        {unlockFolderMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Unlock className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">Unlock</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Create Folder Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Create New Secure Folder
            </DialogTitle>
            <DialogDescription>
              Create a new folder for storing sensitive project materials and client data. Access is encrypted and fully audited.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 flex gap-2">
              <Shield className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-xs text-accent">
                All folders are automatically encrypted with end-to-end encryption and protected with admin-only access controls.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Folder Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g., Client Contracts, Payment Receipts, Project Assets"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Description <span className="text-muted-foreground">(Optional)</span>
              </label>
              <Textarea
                placeholder="Describe what this folder will contain and its purpose..."
                value={newFolderDescription}
                onChange={(e) => setNewFolderDescription(e.target.value)}
                className="min-h-20 resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setNewFolderName('');
                  setNewFolderDescription('');
                }}
                disabled={createFolderMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || createFolderMutation.isPending}
                className="gap-2"
              >
                {createFolderMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Plus className="h-4 w-4" />
                Create Folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lock Folder Dialog */}
      <Dialog open={isLockDialogOpen} onOpenChange={setIsLockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-destructive" />
              Lock Secure Folder
            </DialogTitle>
            <DialogDescription>
              Lock this folder to prevent modifications while maintaining read access for authorized users.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">
                Locking this folder will prevent all modifications. Only admins can unlock it.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Lock Reason <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Explain why this folder is being locked (e.g., Awaiting client approval, Under legal review, etc.)"
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                className="min-h-20 resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This reason will be visible to all admins who access this folder.
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsLockDialogOpen(false);
                  setLockReason('');
                  setSelectedFolderId(null);
                }}
                disabled={lockFolderMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLockFolder}
                disabled={!lockReason.trim() || lockFolderMutation.isPending}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {lockFolderMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Lock Folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Audit Log Dialog */}
      <Dialog open={isAuditDialogOpen} onOpenChange={setIsAuditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Folder Access Audit Log
            </DialogTitle>
            <DialogDescription>
              Complete audit trail of all access and modifications to this secure folder. All actions are encrypted and timestamped.
            </DialogDescription>
          </DialogHeader>
          {isLoadingAudit ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Loading audit trail...</p>
              </div>
            </div>
          ) : !auditLog || auditLog.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">No audit log entries found.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-0 max-h-[500px] overflow-y-auto border rounded-lg divide-y divide-border">
              {auditLog.map((entry: any, index: number) => {
                const accessTypeColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
                  'READ': { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400', icon: <Eye className="h-3 w-3" /> },
                  'WRITE': { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', icon: <FileText className="h-3 w-3" /> },
                  'DELETE': { bg: 'bg-destructive/10', text: 'text-destructive', icon: <Trash2 className="h-3 w-3" /> },
                  'LOCK': { bg: 'bg-destructive/10', text: 'text-destructive', icon: <Lock className="h-3 w-3" /> },
                  'UNLOCK': { bg: 'bg-accent/10', text: 'text-accent', icon: <Unlock className="h-3 w-3" /> },
                };
                const typeConfig = accessTypeColors[entry.accessType] || { bg: 'bg-muted', text: 'text-muted-foreground', icon: <FileText className="h-3 w-3" /> };

                return (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <p className="font-semibold text-foreground">{entry.accessedBy || 'Unknown User'}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${typeConfig.bg} ${typeConfig.text}`}>
                          {typeConfig.icon}
                          {entry.accessType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <time dateTime={new Date(entry.timestamp).toISOString()}>
                          {format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                        </time>
                        <span className="text-muted-foreground">({formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })})</span>
                      </div>
                      {entry.details && (
                        <p className="text-xs text-muted-foreground italic">{entry.details}</p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground text-right flex-shrink-0">
                      #{index + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Total entries: <span className="font-semibold">{auditLog?.length || 0}</span>
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAuditDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
