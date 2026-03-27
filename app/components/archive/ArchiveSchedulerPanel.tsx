import React, { useState } from 'react';
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
import { Label } from '~/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Loader2, Clock, Calendar, AlertCircle, X, CheckCircle2, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ArchiveSchedulerPanelProps {
  familyId: string;
  conversationId?: string;
  isAdmin?: boolean;
}

export const ArchiveSchedulerPanel: React.FC<ArchiveSchedulerPanelProps> = ({
  familyId,
  conversationId,
  isAdmin = false,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [scheduleToCancel, setScheduleToCancel] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch scheduled archives
  const { data: scheduledData, isLoading: scheduledLoading, refetch } = trpc.archive.getScheduledArchives.useQuery(
    { familyId },
    { enabled: !!familyId && isAdmin }
  );

  // Schedule archive mutation
  const scheduleMutation = trpc.archive.scheduleArchive.useMutation({
    onSuccess: () => {
      setSelectedDate('');
      setSelectedTime('');
      setSuccessMessage('Archive scheduled successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      refetch();
    },
    onError: (error) => {
      console.error('Failed to schedule archive:', error);
    },
  });

  // Cancel schedule mutation
  const cancelMutation = trpc.archive.cancelArchiveSchedule.useMutation({
    onSuccess: () => {
      setCancelConfirmOpen(false);
      setScheduleToCancel(null);
      refetch();
    },
  });

  const handleScheduleArchive = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !selectedTime || !conversationId) {
      alert('Please fill in all fields');
      return;
    }

    // Combine date and time
    const dateTimeString = `${selectedDate}T${selectedTime}`;
    const scheduledTime = new Date(dateTimeString);

    if (isNaN(scheduledTime.getTime())) {
      alert('Invalid date/time format');
      return;
    }

    if (scheduledTime <= new Date()) {
      alert('Scheduled time must be in the future');
      return;
    }

    try {
      await scheduleMutation.mutateAsync({
        conversationId,
        scheduledForTime: scheduledTime,
      });
    } catch (error) {
      console.error('Error scheduling archive:', error);
    }
  };

  const handleCancelClick = (scheduleId: string) => {
    setScheduleToCancel(scheduleId);
    setCancelConfirmOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!scheduleToCancel) return;
    try {
      await cancelMutation.mutateAsync({
        scheduleId: scheduleToCancel,
      });
    } catch (error) {
      console.error('Failed to cancel schedule:', error);
    }
  };

  // Get minimum date/time for input (now)
  const now = new Date();
  const minDate = format(new Date(now.getTime() + 60000), 'yyyy-MM-dd');
  const minTime = format(now, 'HH:mm');

  const schedules = scheduledData || [];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="schedule">Schedule Archive</TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled Archives
            {schedules.length > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {schedules.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Archive</CardTitle>
              <CardDescription>
                Schedule when this conversation should be archived
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isAdmin ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-semibold">Admin access required</p>
                    <p>Only family admins can schedule message archival.</p>
                  </div>
                </div>
              ) : !conversationId ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-700">
                    <p className="font-semibold">No conversation selected</p>
                    <p>Open a conversation to schedule its archival.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleScheduleArchive} className="space-y-4">
                  {successMessage && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-green-700">{successMessage}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="archive-date">Date</Label>
                    <Input
                      id="archive-date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={minDate}
                      required
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">Select a future date</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="archive-time">Time</Label>
                    <Input
                      id="archive-time"
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      required
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">Archives during low-traffic periods recommended</p>
                  </div>

                  {selectedDate && selectedTime && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900">
                          Archives in{' '}
                          {formatDistanceToNow(new Date(`${selectedDate}T${selectedTime}`), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={scheduleMutation.isPending || !selectedDate || !selectedTime}
                  >
                    {scheduleMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Archive
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Archives</CardTitle>
              <CardDescription>
                View and manage pending archive schedules
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isAdmin ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-semibold">Admin access required</p>
                    <p>Only family admins can view scheduled archives.</p>
                  </div>
                </div>
              ) : scheduledLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-2" />
                  <p className="text-gray-600">Loading scheduled archives...</p>
                </div>
              ) : schedules.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
                  <p className="text-gray-900 font-semibold">No scheduled archives</p>
                  <p className="text-gray-600 text-sm mt-1">
                    Archives you schedule will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {schedules.map((item: any) => (
                    <div
                      key={item.schedule.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition flex items-start justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {item.conversation?.id ? `Thread ${item.conversation.id.slice(0, 8)}...` : 'Unknown thread'}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 text-xs text-gray-600">
                          <div>
                            <span className="font-medium">Scheduled for:</span>{' '}
                            {format(new Date(item.schedule.scheduledForTime), 'MMM d, yyyy h:mm a')}
                          </div>
                          <div>
                            <span className="font-medium">In:</span>{' '}
                            {formatDistanceToNow(new Date(item.schedule.scheduledForTime), {
                              addSuffix: true,
                            })}
                          </div>
                          <div>
                            <span className="font-medium">Status:</span>{' '}
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {item.schedule.status === 'pending' ? 'Pending' : item.schedule.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancelClick(item.schedule.id)}
                          disabled={cancelMutation.isPending}
                          className="whitespace-nowrap"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Cancel Schedule</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel this archive schedule? The thread will remain active.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel onClick={() => setCancelConfirmOpen(false)}>
              Keep Schedule
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Schedule
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
