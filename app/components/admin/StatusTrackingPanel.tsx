'use client';

import React, { useState, useCallback } from 'react';
import { trpc } from '~/utils/trpc';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Textarea } from '~/components/ui/textarea';
import { Loader2, ChevronRight, Clock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

interface StatusTrackingPanelProps {
  orderId: string;
  currentStatus?: string;
}

type OrderStatus = 'inquiry_submitted' | 'quantity_verified' | 'payment_pending' | 'payment_confirmed' | 'in_processing' | 'completed' | 'cancelled';

const STATUS_STAGES: OrderStatus[] = [
  'inquiry_submitted',
  'quantity_verified',
  'payment_pending',
  'payment_confirmed',
  'completed',
];

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; border: string; dot: string; icon: string }> = {
  inquiry_submitted: {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-300',
    dot: 'bg-slate-400 border-slate-500',
    icon: 'text-slate-500',
  },
  quantity_verified: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-300',
    dot: 'bg-blue-500 border-blue-600',
    icon: 'text-blue-600',
  },
  payment_pending: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-300',
    dot: 'bg-amber-500 border-amber-600',
    icon: 'text-amber-600',
  },
  payment_confirmed: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    dot: 'bg-emerald-500 border-emerald-600',
    icon: 'text-emerald-600',
  },
  in_processing: {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-300',
    dot: 'bg-violet-500 border-violet-600',
    icon: 'text-violet-600',
  },
  completed: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-300',
    dot: 'bg-green-500 border-green-600',
    icon: 'text-green-600',
  },
  cancelled: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-300',
    dot: 'bg-red-500 border-red-600',
    icon: 'text-red-600',
  },
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  inquiry_submitted: 'Submitted',
  quantity_verified: 'Quantity Verified',
  payment_pending: 'Payment Pending',
  payment_confirmed: 'Payment Confirmed',
  in_processing: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function StatusTrackingPanel({ orderId, currentStatus = 'inquiry_submitted' }: StatusTrackingPanelProps) {
  const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<OrderStatus | null>(null);
  const [statusNotes, setStatusNotes] = useState('');

  // Fetch order history
  const { data: historyData, isLoading: isLoadingHistory, refetch: refetchHistory } = trpc.photoDigitization.getOrderHistory.useQuery(
    { orderId },
    { enabled: !!orderId }
  );

  // Update status mutation
  const updateStatusMutation = trpc.photoDigitization.updateOrderStatus.useMutation({
    onSuccess: () => {
      toast.success('Status updated successfully');
      setIsAdvanceDialogOpen(false);
      setStatusNotes('');
      setNextStatus(null);
      refetchHistory();
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  // Get next available status
  const getNextStatuses = useCallback((): OrderStatus[] => {
    const currentIndex = STATUS_STAGES.indexOf(currentStatus as OrderStatus);
    if (currentIndex === -1) return [];
    return STATUS_STAGES.slice(currentIndex + 1);
  }, [currentStatus]);

  // Handle status advancement
  const handleAdvanceStatus = useCallback(async () => {
    if (!nextStatus) {
      toast.error('Please select a status');
      return;
    }

    await updateStatusMutation.mutateAsync({
      orderId,
      newStatus: nextStatus,
      notes: statusNotes || undefined,
    });
  }, [orderId, nextStatus, statusNotes, updateStatusMutation]);

  const history = historyData || [];
  const currentIndex = currentStatus ? STATUS_STAGES.indexOf(currentStatus as OrderStatus) : -1;
  const completionPercentage = currentIndex >= 0 ? ((currentIndex + 1) / STATUS_STAGES.length) * 100 : 0;

  const colors = STATUS_COLORS[currentStatus as OrderStatus];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${colors.bg} border ${colors.border}`}>
            <Clock className={`h-6 w-6 ${colors.icon}`} />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Status Tracking</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Monitor order progress through each stage</p>
          </div>
        </div>
        <Button
          onClick={() => setIsAdvanceDialogOpen(true)}
          disabled={currentIndex === STATUS_STAGES.length - 1 || updateStatusMutation.isPending}
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          <ChevronRight className="h-4 w-4" />
          Advance Status
        </Button>
      </div>

      {/* Current Status Card - Enhanced */}
      <Card className="border-2 overflow-hidden">
        <div className={`h-1 ${colors.dot}`} />
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Current Status</CardTitle>
          <CardDescription>Order is currently in this stage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Badge */}
          <div className={`p-6 rounded-xl border-2 ${colors.bg} ${colors.border} transition-all duration-300 hover:shadow-md`}>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
                <CheckCircle2 className={`h-6 w-6 ${colors.icon}`} />
              </div>
              <div>
                <p className={`font-bold text-xl ${colors.text}`}>{STATUS_LABELS[currentStatus as OrderStatus]}</p>
                <p className="text-xs text-muted-foreground mt-1">Stage {currentIndex + 1} of {STATUS_STAGES.length}</p>
              </div>
            </div>
          </div>

          {/* Progress Bar - Enhanced */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Overall Progress</span>
              <span className="text-sm font-bold text-primary">{Math.round(completionPercentage)}%</span>
            </div>
            <div className="relative w-full h-4 bg-muted rounded-full overflow-hidden border border-border">
              <div
                className="h-full bg-gradient-to-r from-primary via-accent to-emerald-500 transition-all duration-500 ease-out rounded-full shadow-lg"
                style={{ width: `${completionPercentage}%` }}
              />
              <div className="absolute inset-0 bg-white/10 rounded-full" />
            </div>
          </div>

          {/* Stage Indicators */}
          <div className="pt-2">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Progress Timeline</p>
            <div className="flex gap-1.5">
              {STATUS_STAGES.map((stage, idx) => {
                const stageColors = STATUS_COLORS[stage];
                const isCompleted = idx <= currentIndex;
                const isCurrent = idx === currentIndex;
                return (
                  <div key={stage} className="flex-1">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isCompleted
                          ? `${stageColors.dot} shadow-md`
                          : 'bg-muted'
                      } ${isCurrent ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                      title={STATUS_LABELS[stage]}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Timeline</CardTitle>
          <CardDescription>Complete history of all status transitions and changes</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Loading timeline...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted mb-3" />
              <p className="text-sm text-muted-foreground">No status changes recorded yet</p>
              <p className="text-xs text-muted-foreground mt-1">Status updates will appear here</p>
            </div>
          ) : (
            <div className="space-y-0">
              {history.map((entry, idx) => {
                const entryColors = STATUS_COLORS[entry.newStatus as OrderStatus];
                const isLatest = idx === 0;
                return (
                  <div key={entry.id} className="relative">
                    {/* Timeline Line */}
                    {idx !== history.length - 1 && (
                      <div className="absolute left-6 top-16 h-8 w-0.5 bg-gradient-to-b from-border to-transparent" />
                    )}

                    {/* Timeline Item */}
                    <div className={`flex gap-4 pb-6 pt-2 px-4 rounded-lg transition-colors ${isLatest ? `${entryColors.bg} border ${entryColors.border}` : 'hover:bg-muted/50'}`}>
                      {/* Timeline Dot */}
                      <div className="flex flex-col items-center pt-1">
                        <div className={`w-4 h-4 rounded-full border-3 ${entryColors.dot} shadow-md transition-transform hover:scale-125`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <p className={`font-bold text-base ${entryColors.text}`}>
                              {STATUS_LABELS[entry.newStatus as OrderStatus]}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              From <span className="font-medium">{STATUS_LABELS[entry.previousStatus as OrderStatus]}</span>
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-semibold text-foreground whitespace-nowrap">
                              {format(new Date(entry.changedAt), 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(entry.changedAt), 'h:mm a')}
                            </p>
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="space-y-2 text-xs">
                          <p className="text-muted-foreground">
                            Changed by <span className="font-semibold text-foreground">{entry.changedBy}</span>
                            {' '}
                            <span className="text-muted-foreground">
                              {formatDistanceToNow(new Date(entry.changedAt), { addSuffix: true })}
                            </span>
                          </p>
                          {entry.notes && (
                            <div className={`mt-3 p-3 rounded-lg border ${entryColors.border} ${entryColors.bg}`}>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Notes:</p>
                              <p className={`text-sm ${entryColors.text} whitespace-pre-wrap break-words`}>
                                {entry.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advance Status Dialog */}
      <Dialog open={isAdvanceDialogOpen} onOpenChange={setIsAdvanceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-2xl">Advance Order Status</DialogTitle>
            <DialogDescription className="text-base">
              Select the next status to transition to. Only valid transitions are allowed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Status Display */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Status</label>
              <div className={`p-4 rounded-lg border-2 ${colors.bg} ${colors.border} flex items-center gap-3`}>
                <div className={`p-2 rounded-lg ${colors.bg} border ${colors.border}`}>
                  <CheckCircle2 className={`h-5 w-5 ${colors.icon}`} />
                </div>
                <div>
                  <p className={`font-bold text-lg ${colors.text}`}>{STATUS_LABELS[currentStatus as OrderStatus]}</p>
                  <p className="text-xs text-muted-foreground">Stage {currentIndex + 1} of {STATUS_STAGES.length}</p>
                </div>
              </div>
            </div>

            {/* Transition Arrow */}
            <div className="flex justify-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-px w-8 bg-border" />
                <ArrowRight className="h-4 w-4" />
                <div className="h-px w-8 bg-border" />
              </div>
            </div>

            {/* Next Status Options */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Next Status <span className="text-destructive">*</span>
              </label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
                {getNextStatuses().length === 0 ? (
                  <div className="flex items-start gap-3 text-sm bg-amber-50 border-2 border-amber-300 p-4 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900">Order Complete</p>
                      <p className="text-amber-800 text-xs mt-1">This order has reached its final status and cannot be advanced further.</p>
                    </div>
                  </div>
                ) : (
                  getNextStatuses().map((status) => {
                    const statusColor = STATUS_COLORS[status];
                    const isSelected = nextStatus === status;
                    return (
                      <button
                        key={status}
                        onClick={() => setNextStatus(status)}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                          isSelected
                            ? `${statusColor.bg} ${statusColor.border} ring-2 ring-primary ring-offset-2 shadow-md`
                            : `border-border hover:border-primary/50 hover:bg-muted/50`
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${statusColor.dot}`} />
                          <div className="flex-1">
                            <p className={`font-semibold ${statusColor.text}`}>{STATUS_LABELS[status]}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Transition from {STATUS_LABELS[currentStatus as OrderStatus]}
                            </p>
                          </div>
                          {isSelected && <CheckCircle2 className={`h-5 w-5 ${statusColor.icon}`} />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Notes Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Update Notes <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <Textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Add any notes about this status transition, such as reasons, details, or follow-up actions..."
                className="min-h-24 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => setIsAdvanceDialogOpen(false)}
                disabled={updateStatusMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdvanceStatus}
                disabled={!nextStatus || updateStatusMutation.isPending}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                {updateStatusMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {updateStatusMutation.isPending ? 'Updating...' : 'Update Status'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
