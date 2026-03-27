import React, { useState, useEffect } from 'react';
import { trpc } from '~/utils/trpc';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { EventDetailsModal } from './EventDetailsModal';
import type { CalendarEvent } from '~/db/schema';

interface CalendarViewProps {
  familyId: string;
}

// Note: Calendar events can come from database with string dates
type CalendarEventWithStrings = any;

export const CalendarView: React.FC<CalendarViewProps> = ({ familyId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithStrings | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Calculate month boundaries
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const { data: eventsData, isLoading } = trpc.calendarEvents.getCalendarEvents.useQuery({
    familyId,
    startDate: monthStart,
    endDate: monthEnd,
  });

  const events = eventsData?.events || [];

  // Get days in month
  const daysInMonth = monthEnd.getDate();
  const firstDayOfWeek = monthStart.getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => null);

  // Get events for a specific day
  const getEventsForDay = (day: number) => {
    return events.filter((event) => {
      const eventDate = typeof event.startTime === 'string' 
        ? new Date(event.startTime)
        : event.startTime;
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const monthName = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevMonth}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <h2 className="text-lg font-semibold text-gray-900">{monthName}</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            className="gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden bg-white">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0 border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-3 text-center font-semibold text-gray-700 bg-gray-50 border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-0">
            {emptyDays.map((_, idx) => (
              <div key={`empty-${idx}`} className="p-3 bg-gray-50 border-r border-b last:border-r-0 min-h-24" />
            ))}
            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isToday =
                day === new Date().getDate() &&
                currentDate.getMonth() === new Date().getMonth() &&
                currentDate.getFullYear() === new Date().getFullYear();

              return (
                <div
                  key={day}
                  className={`p-3 border-r border-b last:border-r-0 min-h-24 ${
                    isToday ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className={`font-semibold mb-2 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <button
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className="w-full text-left text-xs p-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 truncate"
                      >
                        {event.title}
                      </button>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500 px-1">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Event count */}
        <div className="text-sm text-gray-600">
          Total events: {events.length}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          event={selectedEvent}
          familyId={familyId}
        />
      )}
    </>
  );
};
