import React, { useState } from 'react';
import { trpc } from '~/utils/trpc';
import { Button } from '~/components/ui/button';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Textarea } from '~/components/ui/textarea';
import { Loader2, Lock, Users, Globe, History } from 'lucide-react';
import { useToast } from '~/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import type { CalendarEvent } from '~/db/schema';

interface VisibilityManagerProps {
  event: CalendarEvent;
  familyId: string;
  onSuccess?: () => void;
}

export const VisibilityManager: React.FC<VisibilityManagerProps> = ({
  event,
  familyId,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'family' | 'private'>(
    (event.visibility as 'public' | 'family' | 'private') || 'family'
  );
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  // Get audit trail
  const { data: auditData, isLoading: isLoadingAudit } =
    trpc.calendarEvents.getVisibilityAudit.useQuery(
      { eventId: event.id, familyId },
      { enabled: showAudit }
    );

  // Mutation
  const updateMutation = trpc.calendarEvents.updateVisibility.useMutation();

  const handleUpdateVisibility = async () => {
    if (visibility === event.visibility && !reason) {
      toast({
        title: 'No changes',
        description: 'Please change the visibility or add a reason',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await updateMutation.mutateAsync({
        eventId: event.id,
        familyId,
        visibility,
        reason: reason || undefined,
      });

      toast({
        title: 'Success',
        description: 'Event visibility updated successfully',
      });

      setIsOpen(false);
      setReason('');
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update visibility',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const visibilityOptions = [
    {
      value: 'private' as const,
      label: 'Private',
      description: 'Only you can see this event',
      icon: Lock,
    },
    {
      value: 'family' as const,
      label: 'Family',
      description: 'Family members can see this event',
      icon: Users,
    },
    {
      value: 'public' as const,
      label: 'Public',
      description: 'Everyone can see this event',
      icon: Globe,
    },
  ];

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Lock className="w-4 h-4" />
        Manage Visibility
      </Button>

      {/* Main Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Event Visibility</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Visibility Options */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-3 block">
                Event Visibility
              </label>
              <RadioGroup value={visibility} onValueChange={(value: any) => setVisibility(value)}>
                <div className="space-y-3">
                  {visibilityOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <label
                        key={option.value}
                        className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <RadioGroupItem value={option.value} id={option.value} />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {option.label}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">{option.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>

            {/* Reason */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-1 block">
                Reason for Change (Optional)
              </label>
              <Textarea
                placeholder="Why are you changing the visibility?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isLoading}
                rows={3}
              />
            </div>

            {/* Audit History */}
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAudit(!showAudit)}
                className="gap-2 text-gray-600 hover:text-gray-900"
              >
                <History className="w-4 h-4" />
                View Change History
              </Button>

              {showAudit && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                  {isLoadingAudit ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  ) : auditData?.audit && auditData.audit.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {auditData.audit.map((entry) => (
                        <div
                          key={entry.id}
                          className="text-xs border-b border-gray-200 pb-2 last:border-b-0"
                        >
                          <p className="font-medium text-gray-900">
                            {entry.oldVisibility || 'unknown'} → {entry.newVisibility}
                          </p>
                          <p className="text-gray-600">
                            {typeof entry.changedAt === 'string'
                              ? new Date(entry.changedAt).toLocaleString()
                              : (entry.changedAt as any)?.toLocaleString?.() || ''}
                          </p>
                          {entry.reason && (
                            <p className="text-gray-500 italic mt-1">{entry.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600">No change history</p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateVisibility}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  'Update Visibility'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
