import { Calendar, MapPin, Tag, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import type { EventSuggestion } from '~/db/schema';
import { useState } from 'react';

interface EventSuggestionDetailProps {
  suggestion: EventSuggestion;
  familyId: string;
  hasConflict?: boolean;
  conflictingEvents?: string[];
  onConfirm?: (suggestionId: string) => Promise<void>;
  onReject?: (suggestionId: string) => Promise<void>;
}

const CATEGORY_LABELS: Record<string, string> = {
  activity: 'Activity',
  meal: 'Meal',
  game: 'Game',
  movie: 'Movie',
  outing: 'Outing',
  celebration: 'Celebration',
  other: 'Other',
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  activity: { bg: 'bg-blue-100', text: 'text-blue-800' },
  meal: { bg: 'bg-green-100', text: 'text-green-800' },
  game: { bg: 'bg-purple-100', text: 'text-purple-800' },
  movie: { bg: 'bg-red-100', text: 'text-red-800' },
  outing: { bg: 'bg-orange-100', text: 'text-orange-800' },
  celebration: { bg: 'bg-pink-100', text: 'text-pink-800' },
  other: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

export function EventSuggestionDetail({
  suggestion,
  familyId,
  hasConflict,
  conflictingEvents,
  onConfirm,
  onReject,
}: EventSuggestionDetailProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleConfirm = async () => {
    if (!onConfirm) return;
    setIsConfirming(true);
    try {
      await onConfirm(suggestion.id);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    setIsRejecting(true);
    try {
      await onReject(suggestion.id);
    } finally {
      setIsRejecting(false);
    }
  };

  const colors = CATEGORY_COLORS[suggestion.category as string] || CATEGORY_COLORS.other;
  const formattedTime = suggestion.suggestedTime
    ? new Date(suggestion.suggestedTime).toLocaleString()
    : 'Not specified';

  return (
    <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
      {/* Header */}
      <div>
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900">{suggestion.title}</h2>
          <div className={`rounded-full px-3 py-1 text-sm font-semibold ${colors.bg} ${colors.text}`}>
            {CATEGORY_LABELS[suggestion.category as string]}
          </div>
        </div>
      </div>

      {/* Conflict Warning */}
      {hasConflict && (
        <div className="flex gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900">Time Conflict</h3>
            <p className="mt-1 text-sm text-yellow-800">
              {conflictingEvents && conflictingEvents.length > 0
                ? `This event conflicts with: ${conflictingEvents.join(', ')}`
                : 'This event may conflict with other scheduled activities'}
            </p>
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-gray-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Calendar className="h-4 w-4" />
            Suggested Date & Time
          </div>
          <p className="text-gray-700">{formattedTime}</p>
        </div>

        {suggestion.location && (
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <MapPin className="h-4 w-4" />
              Location
            </div>
            <p className="text-gray-700">{suggestion.location}</p>
          </div>
        )}
      </div>

      {/* Rationale */}
      {suggestion.rationale && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Why We Suggest This</h3>
          <p className="text-gray-700">{suggestion.rationale}</p>
        </div>
      )}

      {/* Description */}
      {suggestion.description && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Description</h3>
          <p className="text-gray-700">{suggestion.description}</p>
        </div>
      )}

      {/* Status Badge */}
      {suggestion.status !== 'pending' && (
        <div className="rounded-lg bg-blue-50 px-3 py-2">
          <p className="text-sm text-blue-900">
            Status: <span className="font-semibold capitalize">{suggestion.status}</span>
            {suggestion.confirmedAt && (
              <span className="ml-2 text-xs text-blue-800">
                on {new Date(suggestion.confirmedAt).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Actions */}
      {suggestion.status === 'pending' && (
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleConfirm}
            disabled={isConfirming || isRejecting}
            className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
          >
            {isConfirming && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm & Schedule
          </Button>
          <Button
            onClick={handleReject}
            disabled={isRejecting || isConfirming}
            variant="outline"
            className="flex-1 gap-2"
          >
            {isRejecting && <Loader2 className="h-4 w-4 animate-spin" />}
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
