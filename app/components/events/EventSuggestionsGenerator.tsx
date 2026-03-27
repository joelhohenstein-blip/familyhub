import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Loader2, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { trpc } from '~/utils/trpc';

interface EventSuggestionsGeneratorProps {
  familyId: string;
  onSuccess?: () => void;
}

export function EventSuggestionsGenerator({ familyId, onSuccess }: EventSuggestionsGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const suggestEventsMutation = trpc.eventSuggestions.suggestEvents.useMutation({
    onSuccess: (data: any) => {
      setIsLoading(false);
      if (data.success) {
        setSuccess(true);
        setError(null);
        setTimeout(() => setSuccess(false), 3000);
        onSuccess?.();
      } else {
        setError(data.message || 'Failed to generate suggestions');
      }
    },
    onError: (error: any) => {
      setIsLoading(false);
      setError(error.message || 'An error occurred');
    },
  });

  const handleGenerateSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await suggestEventsMutation.mutateAsync({
        familyId,
      });
    } catch (err) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : 'Failed to generate suggestions';
      setError(message);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-4">
        <Button
          onClick={handleGenerateSuggestions}
          disabled={isLoading}
          className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating Suggestions...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Event Suggestions
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">{error}</p>
            <p className="text-xs text-red-800">Try again or check your family settings</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900">Suggestions generated successfully!</p>
            <p className="text-xs text-green-800">Check the list below to view your suggestions</p>
          </div>
        </div>
      )}
    </div>
  );
}
