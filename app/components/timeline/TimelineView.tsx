import { useQueryClient } from '@tanstack/react-query';
import { trpc } from '~/utils/trpc';
import { Button } from '~/components/ui/button';
import {
  Calendar,
  MapPin,
  Share2,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface TimelineViewProps {
  familyId: string;
  onShareClick?: (highlightId: string) => void;
}

export function TimelineView({ familyId, onShareClick }: TimelineViewProps) {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error, isFetching } = trpc.timeline.getTimelineHighlights.useQuery(
    { familyId, limit: 50 },
    {
      enabled: !!familyId,
      refetchOnWindowFocus: false,
    }
  );

  const deleteHighlight = trpc.timeline.deleteHighlight.useMutation({
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: [['timeline', 'getTimelineHighlights']],
      });
    },
  });

  const highlights = data?.highlights || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-700 mb-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-semibold">Error loading timeline</span>
        </div>
        <p className="text-red-600 text-sm">{error.message}</p>
      </div>
    );
  }

  if (highlights.length === 0) {
    return (
      <div className="py-12 text-center">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No highlights yet</h3>
        <p className="text-gray-600 mb-6">
          Create your first highlight to get started sharing your family memories.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {highlights.map((highlight) => (
        <div
          key={highlight.id}
          className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xl font-bold text-gray-900">{highlight.title}</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onShareClick?.(highlight.id)}
                  title="Share this highlight"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteHighlight.mutate({ highlightId: highlight.id })}
                  disabled={deleteHighlight.isPending}
                  title="Delete this highlight"
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(highlight.date), 'MMMM d, yyyy')}</span>
            </div>
          </div>

          {/* Description */}
          {highlight.description && (
            <div className="p-6 bg-gray-50">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {highlight.description}
              </p>
            </div>
          )}

          {/* Media Grid */}
          {highlight.media && highlight.media.length > 0 && (
            <div className="p-6 bg-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {highlight.media.map((media) => (
                  <div
                    key={media.id}
                    className="aspect-square bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center"
                  >
                    <Eye className="w-5 h-5 text-gray-400" />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-600">
                {highlight.media.length} media item{highlight.media.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center gap-4">
            <span className="text-xs text-gray-500">
              Added {format(new Date(highlight.createdAt), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
      ))}

      {/* Load More Button */}
      {highlights.length >= 50 && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            disabled={isFetching}
          >
            {isFetching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
