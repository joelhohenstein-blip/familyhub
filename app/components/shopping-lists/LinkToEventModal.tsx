import { useState, useEffect } from "react";
import { trpc } from "~/utils/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Calendar } from "lucide-react";

type TaskList = any;

interface LinkToEventModalProps {
  list: TaskList;
  familyId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LinkToEventModal({
  list,
  familyId,
  isOpen,
  onClose,
  onSuccess,
}: LinkToEventModalProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  });

  // Fetch calendar events
  const { data: eventsData, isLoading: eventsLoading } =
    trpc.calendarEvents.getCalendarEvents.useQuery(
      {
        familyId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      { enabled: isOpen }
    );

  const linkMutation = trpc.shoppingLists.linkListToEvent.useMutation({
    onSuccess: () => {
      setError("");
      setSuccess(true);
      setSelectedEventId("");
      setTimeout(() => {
        setSuccess(false);
        onClose();
        onSuccess?.();
      }, 2000);
    },
    onError: (err) => {
      setError(err.message || "Failed to link list to event");
    },
  });

  const handleLink = async () => {
    if (!selectedEventId) {
      setError("Please select an event");
      return;
    }

    try {
      await linkMutation.mutateAsync({
        listId: list.id,
        eventId: selectedEventId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const events = eventsData?.events || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link to Calendar Event</DialogTitle>
          <DialogDescription>
            Link "{list.title}" to a calendar event for reminders and context
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            List linked to event successfully!
          </div>
        )}

        <div className="space-y-4">
          {/* Date Range Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Show events for the next 30 days
            </label>
            <p className="text-xs text-gray-500">
              {dateRange.startDate.toLocaleDateString()} -{" "}
              {dateRange.endDate.toLocaleDateString()}
            </p>
          </div>

          {/* Events List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {eventsLoading ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Loading events...
              </p>
            ) : events.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No upcoming events found
              </p>
            ) : (
              events.map((event) => {
                const isSelected = selectedEventId === event.id;
                const eventDate = new Date(event.startTime);

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() =>
                      setSelectedEventId(
                        isSelected ? "" : event.id
                      )
                    }
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 bg-white hover:border-orange-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {eventDate.toLocaleDateString()} at{" "}
                          {eventDate.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {event.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLink}
            disabled={linkMutation.isPending || !selectedEventId}
            className="px-4 py-2 text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {linkMutation.isPending ? "Linking..." : "Link Event"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
