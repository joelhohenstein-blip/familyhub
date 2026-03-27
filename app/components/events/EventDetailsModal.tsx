import React, { useEffect, useState } from 'react';
import { trpc } from '~/utils/trpc';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Loader2, MapPin, Clock, Users } from 'lucide-react';
import { useToast } from '~/hooks/use-toast';
import type { CalendarEvent } from '~/db/schema';

interface EventDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent;
  familyId: string;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  isOpen,
  onOpenChange,
  event,
  familyId,
}) => {
  const { toast } = useToast();
  const [rsvpStatus, setRsvpStatus] = useState<'attending' | 'maybe' | 'not_attending' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get event details
  const { data: eventDetails, isLoading: isLoadingDetails } =
    trpc.calendarEvents.getEventDetails.useQuery(
      { eventId: event.id, familyId },
      { enabled: isOpen }
    );

  // Mutations
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

  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
          <DialogDescription>
            {startTime.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </DialogDescription>
        </DialogHeader>

        {isLoadingDetails ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Event Details */}
            <div className="space-y-3">
              {/* Time */}
              <div className="flex gap-3 items-start">
                <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {startTime.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    -{' '}
                    {endTime.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    Duration:{' '}
                    {Math.round(
                      (endTime.getTime() - startTime.getTime()) / (1000 * 60)
                    )}{' '}
                    minutes
                  </p>
                </div>
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex gap-3 items-start">
                  <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{event.location}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              {event.description && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">{event.description}</p>
                </div>
              )}

              {/* Visibility */}
              {event.visibility && (
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Visibility:
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      event.visibility === 'public'
                        ? 'bg-green-100 text-green-700'
                        : event.visibility === 'family'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {event.visibility.charAt(0).toUpperCase() + event.visibility.slice(1)}
                  </span>
                </div>
              )}
            </div>

            {/* RSVP Section */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Your Response</h3>
              <div className="flex gap-2">
                <Button
                  variant={rsvpStatus === 'attending' ? 'default' : 'outline'}
                  onClick={() => handleRsvp('attending')}
                  disabled={isLoading}
                  className={
                    rsvpStatus === 'attending' ? 'bg-green-600 hover:bg-green-700' : ''
                  }
                >
                  {rsvpStatus === 'attending' && '✓ '}Attending
                </Button>
                <Button
                  variant={rsvpStatus === 'maybe' ? 'default' : 'outline'}
                  onClick={() => handleRsvp('maybe')}
                  disabled={isLoading}
                  className={
                    rsvpStatus === 'maybe' ? 'bg-yellow-600 hover:bg-yellow-700' : ''
                  }
                >
                  {rsvpStatus === 'maybe' && '✓ '}Maybe
                </Button>
                <Button
                  variant={rsvpStatus === 'not_attending' ? 'default' : 'outline'}
                  onClick={() => handleRsvp('not_attending')}
                  disabled={isLoading}
                  className={
                    rsvpStatus === 'not_attending' ? 'bg-red-600 hover:bg-red-700' : ''
                  }
                >
                  {rsvpStatus === 'not_attending' && '✓ '}Not Attending
                </Button>
              </div>
            </div>

            {/* RSVP Stats */}
            <div className="border-t pt-4 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Attendees</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.attending}</p>
                  <p className="text-xs text-gray-600">Attending</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{stats.maybe}</p>
                  <p className="text-xs text-gray-600">Maybe</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{stats.notAttending}</p>
                  <p className="text-xs text-gray-600">Not Attending</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
