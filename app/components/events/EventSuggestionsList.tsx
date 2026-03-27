import { useState } from 'react';
import { Calendar, MapPin, Tag, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { trpc } from '~/utils/trpc';
import type { EventSuggestion } from '~/db/schema';

interface EventSuggestionsListProps {
  familyId: string;
  suggestions?: EventSuggestion[];
  isLoading?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  activity: 'bg-blue-100 text-blue-800',
  meal: 'bg-green-100 text-green-800',
  game: 'bg-purple-100 text-purple-800',
  movie: 'bg-red-100 text-red-800',
  outing: 'bg-orange-100 text-orange-800',
  celebration: 'bg-pink-100 text-pink-800',
  other: 'bg-gray-100 text-gray-800',
};

export function EventSuggestionsList({ familyId, suggestions, isLoading }: EventSuggestionsListProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const confirmMutation = trpc.eventSuggestions.confirmSuggestion.useMutation();
  const rejectMutation = trpc.eventSuggestions.rejectSuggestion.useMutation();

  const handleConfirm = async (suggestionId: string) => {
    setConfirmingId(suggestionId);
    try {
      await confirmMutation.mutateAsync({
        suggestionId,
        familyId,
      });
    } finally {
      setConfirmingId(null);
    }
  };

  const handleReject = async (suggestionId: string) => {
    setRejectingId(suggestionId);
    try {
      await rejectMutation.mutateAsync({
        suggestionId,
        familyId,
      });
    } finally {
      setRejectingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-12">
        <AlertCircle className="mb-3 h-12 w-12 text-gray-400" />
        <h3 className="mb-1 text-lg font-semibold text-gray-900">No suggestions yet</h3>
        <p className="mb-4 text-sm text-gray-600">Generate AI-curated event suggestions for your family</p>
        <p className="text-xs text-gray-500">Click "Generate Event Suggestions" above to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
        >
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="mb-1 truncate text-lg font-semibold text-gray-900">{suggestion.title}</h3>
              <p className="line-clamp-2 text-sm text-gray-600">{suggestion.rationale}</p>
            </div>
            <Tag className={`mt-0.5 h-5 w-5 flex-shrink-0 rounded-full p-0.5 ${CATEGORY_COLORS[suggestion.category as string] || CATEGORY_COLORS.other}`} />
          </div>

          <div className="mb-4 flex flex-wrap gap-3 text-sm text-gray-600">
            {suggestion.suggestedTime && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(suggestion.suggestedTime).toLocaleDateString()}</span>
                <span className="text-gray-500">
                  {new Date(suggestion.suggestedTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {suggestion.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{suggestion.location}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleConfirm(suggestion.id)}
              disabled={confirmingId === suggestion.id || rejectingId !== null}
              className="gap-1 bg-green-600 hover:bg-green-700"
            >
              {confirmingId === suggestion.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleReject(suggestion.id)}
              disabled={rejectingId === suggestion.id || confirmingId !== null}
              className="gap-1"
            >
              {rejectingId === suggestion.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <X className="h-3 w-3" />
              )}
              Reject
            </Button>
          </div>

          {suggestion.status !== 'pending' && (
            <div className="mt-3 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
              Status: {suggestion.status}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
