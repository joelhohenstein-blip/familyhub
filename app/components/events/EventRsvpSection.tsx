import React, { useEffect, useState } from 'react';
import { trpc } from '~/utils/trpc';
import { Loader2, Users, Check, HelpCircle, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { useToast } from '~/hooks/use-toast';
import type { CalendarEvent } from '~/db/schema';

interface EventRsvpSectionProps {
  event: CalendarEvent;
  familyId: string;
  onRsvpChange?: () => void;
}

export const EventRsvpSection: React.FC<EventRsvpSectionProps> = ({
  event,
  familyId,
  onRsvpChange,
}) => {
  const { toast } = useToast();
  const [rsvpStatus, setRsvpStatus] = useState<'attending' | 'maybe' | 'not_attending' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get event details
  const { data: eventDetails, isLoading: isLoadingDetails } =
    trpc.calendarEvents.getEventDetails.useQuery({
      eventId: event.id,
      familyId,
    });

  // Mutation
  const rsvpMutation = trpc.calendarEvents.rsvpEvent.useMutation();

  useEffect(() => {
    // Get current user's RSVP status from event details
    if (eventDetails?.event?.userRsvp) {
      setRsvpStatus(eventDetails.event.userRsvp.status);
    } else {
      setRsvpStatus(null);
    }
  }, [eventDetails]);

  const handleRsvp = async (status: 'attending' | 'maybe' | 'not_attending') => {
    setIsLoading(true);
    try {
      await rsvpMutation.mutateAsync({
        eventId: event.id,
        familyId,
        status,
      });

      setRsvpStatus(status);
      toast({
        title: 'Success',
        description: `RSVP marked as ${status}`,
      });
      onRsvpChange?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to RSVP',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stats = eventDetails?.stats || {
    attending: 0,
    maybe: 0,
    notAttending: 0,
    total: 0,
  };

  if (isLoadingDetails) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Your RSVP Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Your Response</h4>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={rsvpStatus === 'attending' ? 'default' : 'outline'}
            onClick={() => handleRsvp('attending')}
            disabled={isLoading}
            className={
              rsvpStatus === 'attending'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'text-gray-700'
            }
          >
            <Check className="w-4 h-4 mr-2" />
            Attending
          </Button>
          <Button
            size="sm"
            variant={rsvpStatus === 'maybe' ? 'default' : 'outline'}
            onClick={() => handleRsvp('maybe')}
            disabled={isLoading}
            className={
              rsvpStatus === 'maybe'
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : 'text-gray-700'
            }
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Maybe
          </Button>
          <Button
            size="sm"
            variant={rsvpStatus === 'not_attending' ? 'default' : 'outline'}
            onClick={() => handleRsvp('not_attending')}
            disabled={isLoading}
            className={
              rsvpStatus === 'not_attending'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'text-gray-700'
            }
          >
            <X className="w-4 h-4 mr-2" />
            Not Attending
          </Button>
        </div>
      </div>

      {/* Attendance Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-gray-600" />
          <h4 className="font-semibold text-gray-900">Attendance Summary</h4>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Attending */}
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-2xl font-bold text-green-600">{stats.attending}</p>
            <p className="text-xs text-gray-600 mt-1">Attending</p>
          </div>

          {/* Maybe */}
          <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-2xl font-bold text-yellow-600">{stats.maybe}</p>
            <p className="text-xs text-gray-600 mt-1">Maybe</p>
          </div>

          {/* Not Attending */}
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-2xl font-bold text-red-600">{stats.notAttending}</p>
            <p className="text-xs text-gray-600 mt-1">Not Attending</p>
          </div>
        </div>

        {/* Total */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{stats.total}</span> total responses
          </p>
        </div>
      </div>

      {/* Response Rate */}
      {stats.total > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">
              {Math.round(((stats.attending + stats.maybe) / stats.total) * 100)}%
            </span>{' '}
            likely attending
          </p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{
                width: `${((stats.attending + stats.maybe) / stats.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
