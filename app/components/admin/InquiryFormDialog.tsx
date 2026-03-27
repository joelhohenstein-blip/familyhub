'use client';

import React, { useState, useCallback } from 'react';
import { trpc } from '~/utils/trpc';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '~/components/ui/alert-dialog';
import { Loader2, Plus, Trash2, Edit2, Clock, FileText, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Status configuration
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  submitted: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  under_review: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  approved: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  completed: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  submitted: <Clock className="h-4 w-4" />,
  under_review: <AlertCircle className="h-4 w-4" />,
  approved: <CheckCircle2 className="h-4 w-4" />,
  rejected: <XCircle className="h-4 w-4" />,
  completed: <CheckCircle2 className="h-4 w-4" />,
};

const VALID_STATUSES = ['submitted', 'under_review', 'approved', 'rejected', 'completed'];

interface InquiryFormDialogProps {
  orderId: string;
  orderNumber?: string;
}

interface InquiryFormData {
  mediaType: string;
  quantity: number;
  customerEmail: string;
  notes?: string;
}

export function InquiryFormDialog({ orderId, orderNumber }: InquiryFormDialogProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<InquiryFormData>({
    mediaType: '',
    quantity: 1,
    customerEmail: '',
    notes: '',
  });
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [editingFormData, setEditingFormData] = useState<InquiryFormData>({
    mediaType: '',
    quantity: 1,
    customerEmail: '',
    notes: '',
  });
  const [selectedFormForDelete, setSelectedFormForDelete] = useState<string | null>(null);
  const [statusUpdatingFormId, setStatusUpdatingFormId] = useState<string | null>(null);

  // tRPC mutations and queries
  const { data: formsData, isLoading: isLoadingForms, refetch: refetchForms } = trpc.inquiry.getInquiryForms.useQuery(
    { orderId },
    { enabled: !!orderId }
  );

  const createFormMutation = trpc.inquiry.createInquiryForm.useMutation({
    onSuccess: () => {
      setFormData({
        mediaType: '',
        quantity: 1,
        customerEmail: '',
        notes: '',
      });
      setIsCreateDialogOpen(false);
      refetchForms();
    },
  });

  const updateFormMutation = trpc.inquiry.updateInquiryForm.useMutation({
    onSuccess: () => {
      setEditingFormId(null);
      setEditingFormData({
        mediaType: '',
        quantity: 1,
        customerEmail: '',
        notes: '',
      });
      setIsEditDialogOpen(false);
      refetchForms();
    },
  });

  const deleteFormMutation = trpc.inquiry.deleteInquiryForm.useMutation({
    onSuccess: () => {
      setSelectedFormForDelete(null);
      setIsDeleteDialogOpen(false);
      refetchForms();
    },
  });

  const updateStatusMutation = trpc.inquiry.updateInquiryFormStatus.useMutation({
    onSuccess: () => {
      setStatusUpdatingFormId(null);
      refetchForms();
    },
  });

  // Handlers
  const handleCreateForm = useCallback(async () => {
    if (!formData.mediaType.trim() || !formData.customerEmail.trim() || formData.quantity < 1) {
      return;
    }
    await createFormMutation.mutateAsync({
      orderId,
      mediaType: formData.mediaType,
      quantity: formData.quantity,
      customerEmail: formData.customerEmail,
      notes: formData.notes || undefined,
    });
  }, [formData, orderId, createFormMutation]);

  const handleEditForm = useCallback((formId: string, data: any) => {
    setEditingFormId(formId);
    setEditingFormData({
      mediaType: data.mediaType,
      quantity: data.quantity,
      customerEmail: data.customerEmail,
      notes: data.notes || '',
    });
    setIsEditDialogOpen(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingFormId || !editingFormData.mediaType.trim() || !editingFormData.customerEmail.trim() || editingFormData.quantity < 1) {
      return;
    }
    await updateFormMutation.mutateAsync({
      formId: editingFormId,
      mediaType: editingFormData.mediaType,
      quantity: editingFormData.quantity,
      customerEmail: editingFormData.customerEmail,
      notes: editingFormData.notes || undefined,
    });
  }, [editingFormId, editingFormData, updateFormMutation]);

  const handleDeleteForm = useCallback(async (formId: string) => {
    setSelectedFormForDelete(formId);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedFormForDelete) {
      return;
    }
    await deleteFormMutation.mutateAsync({
      formId: selectedFormForDelete,
    });
  }, [selectedFormForDelete, deleteFormMutation]);

  const handleStatusChange = useCallback(async (formId: string, newStatus: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'completed') => {
    setStatusUpdatingFormId(formId);
    await updateStatusMutation.mutateAsync({
      formId,
      status: newStatus,
    });
  }, [updateStatusMutation]);

  const forms = formsData?.forms || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-amber-600" />
            Inquiry Forms
          </h2>
          {orderNumber && (
            <p className="text-sm text-gray-600 mt-1">Order: {orderNumber}</p>
          )}
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="gap-2"
          disabled={createFormMutation.isPending}
        >
          <Plus className="h-4 w-4" />
          New Inquiry
        </Button>
      </div>

      {/* Description */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-800">
            <strong>Inquiry Forms:</strong> Submit and manage customer inquiry forms with media type, quantity, and contact information.
          </p>
        </CardContent>
      </Card>

      {/* Forms List */}
      {isLoadingForms ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : forms.length === 0 ? (
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500 text-center py-4">
              No inquiry forms yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {forms.map((form) => {
            const statusConfig = STATUS_COLORS[form.status] || STATUS_COLORS.inquiry_submitted;
            const statusLabel = STATUS_LABELS[form.status] || form.status;
            const statusIcon = STATUS_ICONS[form.status];
            
            return (
              <Card key={form.id} className={`overflow-hidden border-l-4 ${statusConfig.border}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-gray-900">{form.mediaType}</span>
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          Qty: {form.quantity}
                        </span>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
                          {statusIcon}
                          <span>{statusLabel}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <Clock className="h-3 w-3" />
                        <span>
                          Created {formatDistanceToNow(new Date(form.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        <strong>Email:</strong> {form.customerEmail}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditForm(form.id, form)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteForm(form.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={deleteFormMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {/* Status Update Section */}
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {form.notes && (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                        <strong>Notes:</strong> {form.notes}
                      </p>
                    )}
                    
                    {/* Status Progress Indicator */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Update Status
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {VALID_STATUSES.map((status) => {
                          const isCurrentStatus = form.status === status;
                          const config = STATUS_COLORS[status];
                          return (
                            <Button
                              key={status}
                              size="sm"
                              variant={isCurrentStatus ? "default" : "outline"}
                              onClick={() => handleStatusChange(form.id, status as 'submitted' | 'under_review' | 'approved' | 'rejected' | 'completed')}
                              disabled={statusUpdatingFormId === form.id || updateStatusMutation.isPending}
                              className={isCurrentStatus ? `${config.bg} ${config.text} border-0` : ''}
                            >
                              {statusUpdatingFormId === form.id && updateStatusMutation.isPending ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : null}
                              {STATUS_LABELS[status]}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Form Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Inquiry Form</DialogTitle>
            <DialogDescription>
              Submit a new inquiry form with media type, quantity, and customer contact information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Media Type <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g., Photos, Videos, Documents"
                value={formData.mediaType}
                onChange={(e) => setFormData({ ...formData, mediaType: e.target.value })}
                disabled={createFormMutation.isPending}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                disabled={createFormMutation.isPending}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                placeholder="customer@example.com"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                disabled={createFormMutation.isPending}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <Textarea
                placeholder="Additional notes or details..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="min-h-24 resize-none"
                disabled={createFormMutation.isPending}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={createFormMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateForm}
                disabled={
                  !formData.mediaType.trim() ||
                  !formData.customerEmail.trim() ||
                  formData.quantity < 1 ||
                  createFormMutation.isPending
                }
              >
                {createFormMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Form
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Form Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Inquiry Form</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Media Type <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g., Photos, Videos, Documents"
                value={editingFormData.mediaType}
                onChange={(e) => setEditingFormData({ ...editingFormData, mediaType: e.target.value })}
                disabled={updateFormMutation.isPending}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                value={editingFormData.quantity}
                onChange={(e) => setEditingFormData({ ...editingFormData, quantity: parseInt(e.target.value) || 1 })}
                disabled={updateFormMutation.isPending}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                placeholder="customer@example.com"
                value={editingFormData.customerEmail}
                onChange={(e) => setEditingFormData({ ...editingFormData, customerEmail: e.target.value })}
                disabled={updateFormMutation.isPending}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <Textarea
                placeholder="Additional notes or details..."
                value={editingFormData.notes}
                onChange={(e) => setEditingFormData({ ...editingFormData, notes: e.target.value })}
                className="min-h-24 resize-none"
                disabled={updateFormMutation.isPending}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingFormId(null);
                  setEditingFormData({
                    mediaType: '',
                    quantity: 1,
                    customerEmail: '',
                    notes: '',
                  });
                }}
                disabled={updateFormMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={
                  !editingFormData.mediaType.trim() ||
                  !editingFormData.customerEmail.trim() ||
                  editingFormData.quantity < 1 ||
                  updateFormMutation.isPending
                }
              >
                {updateFormMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
            <AlertDialogTitle>Delete Inquiry Form?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The inquiry form will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel disabled={deleteFormMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteFormMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteFormMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
