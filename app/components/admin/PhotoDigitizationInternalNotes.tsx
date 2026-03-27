'use client';

import React, { useState, useCallback } from 'react';
import { trpc } from '~/utils/trpc';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '~/components/ui/alert-dialog';
import { Loader2, Plus, Trash2, Edit2, Clock, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface InternalNotesProps {
  orderId: string;
  orderNumber?: string;
}

export function PhotoDigitizationInternalNotes({ orderId, orderNumber }: InternalNotesProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [selectedNoteForDelete, setSelectedNoteForDelete] = useState<string | null>(null);
  const [selectedNoteForAudit, setSelectedNoteForAudit] = useState<string | null>(null);

  // tRPC mutations and queries
  const { data: notesData, isLoading: isLoadingNotes, refetch: refetchNotes } = trpc.photoDigitization.getInternalNotes.useQuery(
    { orderId },
    { enabled: !!orderId }
  );

  const createNoteMutation = trpc.photoDigitization.createInternalNote.useMutation({
    onSuccess: () => {
      setNewNoteContent('');
      setIsCreateDialogOpen(false);
      refetchNotes();
    },
  });

  const updateNoteMutation = trpc.photoDigitization.updateInternalNote.useMutation({
    onSuccess: () => {
      setEditingNoteId(null);
      setEditingNoteContent('');
      setIsEditDialogOpen(false);
      refetchNotes();
    },
  });

  const deleteNoteMutation = trpc.photoDigitization.deleteInternalNote.useMutation({
    onSuccess: () => {
      setSelectedNoteForDelete(null);
      setIsDeleteDialogOpen(false);
      refetchNotes();
    },
  });

  const { data: auditLogData, isLoading: isLoadingAudit } = trpc.photoDigitization.getAccessLog.useQuery(
    { noteId: selectedNoteForAudit || '' },
    { enabled: !!selectedNoteForAudit }
  );

  // Handlers
  const handleCreateNote = useCallback(async () => {
    if (!newNoteContent.trim()) {
      return;
    }
    await createNoteMutation.mutateAsync({
      orderId,
      content: newNoteContent,
    });
  }, [newNoteContent, orderId, createNoteMutation]);

  const handleEditNote = useCallback((noteId: string, content: string) => {
    setEditingNoteId(noteId);
    setEditingNoteContent(content);
    setIsEditDialogOpen(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingNoteId || !editingNoteContent.trim()) {
      return;
    }
    await updateNoteMutation.mutateAsync({
      noteId: editingNoteId,
      content: editingNoteContent,
    });
  }, [editingNoteId, editingNoteContent, updateNoteMutation]);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    setSelectedNoteForDelete(noteId);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedNoteForDelete) {
      return;
    }
    await deleteNoteMutation.mutateAsync({
      noteId: selectedNoteForDelete,
    });
  }, [selectedNoteForDelete, deleteNoteMutation]);

  const handleViewAuditLog = useCallback((noteId: string) => {
    setSelectedNoteForAudit(noteId);
    setIsAuditDialogOpen(true);
  }, []);

  const notes = notesData?.notes || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lock className="h-6 w-6 text-amber-600" />
            Internal Storage
          </h2>
          {orderNumber && (
            <p className="text-sm text-gray-600 mt-1">Order: {orderNumber}</p>
          )}
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="gap-2"
          disabled={createNoteMutation.isPending}
        >
          <Plus className="h-4 w-4" />
          New Note
        </Button>
      </div>

      {/* Description */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <p className="text-sm text-amber-800">
            <strong>Admin Only:</strong> This section is for internal use only. All access is logged and audited for security purposes.
          </p>
        </CardContent>
      </Card>

      {/* Notes List */}
      {isLoadingNotes ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : notes.length === 0 ? (
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500 text-center py-4">
              No internal notes yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <Clock className="h-3 w-3" />
                      <span>
                        Created by {note.createdBy} {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {note.updatedAt && note.updatedAt !== note.createdAt && (
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>Updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewAuditLog(note.id)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditNote(note.id, note.content)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={deleteNoteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap break-words text-gray-700">
                  {note.content}
                </p>
                {note.attachmentUrls && note.attachmentUrls.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Attachments:</p>
                    <div className="space-y-1">
                      {note.attachmentUrls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline block truncate"
                        >
                          {url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Note Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Internal Note</DialogTitle>
            <DialogDescription>
              Add sensitive information, internal communications, or notes related to this job. Only visible to admins.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter your internal note..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              className="min-h-32 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={createNoteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateNote}
                disabled={!newNoteContent.trim() || createNoteMutation.isPending}
              >
                {createNoteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Internal Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter your internal note..."
              value={editingNoteContent}
              onChange={(e) => setEditingNoteContent(e.target.value)}
              className="min-h-32 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingNoteId(null);
                  setEditingNoteContent('');
                }}
                disabled={updateNoteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={!editingNoteContent.trim() || updateNoteMutation.isPending}
              >
                {updateNoteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Internal Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The note will be permanently deleted, but the deletion will be logged in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel disabled={deleteNoteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteNoteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteNoteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Audit Log Dialog */}
      <Dialog open={isAuditDialogOpen} onOpenChange={setIsAuditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Access Audit Log</DialogTitle>
            <DialogDescription>
              Complete history of all access and modifications to this internal note.
            </DialogDescription>
          </DialogHeader>
          {isLoadingAudit ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : !auditLogData?.log || auditLogData.log.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No audit log entries found.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {auditLogData.log.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200 text-sm"
                >
                  <div>
                    <p className="font-medium text-gray-900">{entry.accessedBy}</p>
                    <p className="text-xs text-gray-600">
                      {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    {entry.accessType}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
