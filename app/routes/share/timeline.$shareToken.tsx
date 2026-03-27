import React, { useState, useEffect } from 'react';
import { useParams, redirect } from 'react-router';
import { AlertCircle, Loader2, Calendar, History, Eye } from 'lucide-react';
import { trpc } from '~/utils/trpc';
import { format } from 'date-fns';

export default function SharedTimelinePage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [shareInfo, setShareInfo] = useState<any>(null);

  // Validate share access
  const validateAccess = trpc.timeline.validateTimelineShareAccess.useQuery(
    { shareToken: shareToken || '' },
    {
      enabled: !!shareToken,
    }
  );

  // Fetch shared timeline content (only enabled after validation succeeds)
  const sharedContent = trpc.timeline.getSharedTimeline.useQuery(
    { shareToken: shareToken || '' },
    {
      enabled: !!shareToken && validateAccess.data?.valid === true,
    }
  );

  useEffect(() => {
    if (!shareToken) {
      setError('Invalid share link');
      setIsLoading(false);
      return;
    }

    if (validateAccess.isLoading) return;

    if (validateAccess.error) {
      setError('Failed to validate share link. Please try again later.');
      setIsLoading(false);
      return;
    }

    if (!validateAccess.data?.valid) {
      const reason = 'reason' in validateAccess.data ? validateAccess.data.reason : 'This share link is no longer valid.';
      setError(reason);
      setIsLoading(false);
      return;
    }

    // Share is valid, fetch content
    setShareInfo(validateAccess.data);

    // If shared content is loaded, populate highlights
    if (sharedContent.data?.highlights) {
      setHighlights(sharedContent.data.highlights);
    }

    // Set loading to false once we have the share info
    if (!sharedContent.isLoading) {
      setIsLoading(false);
    }
  }, [validateAccess.data, validateAccess.isLoading, validateAccess.error, sharedContent.data, sharedContent.isLoading, shareToken]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading shared timeline...</p>
        </div>
      </div>
    );
  }

  if (error || !shareInfo?.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Share Link Invalid</h1>
              <p className="text-gray-600">{error}</p>
              <p className="text-sm text-gray-500 mt-4">
                The share link may have expired or been removed.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <div className="flex items-center gap-3">
            <History className="w-8 h-8 text-amber-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Family Timeline</h1>
              <p className="text-gray-600 mt-1">
                Shared family memories and highlights
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Shared Highlights</h2>
          
          {highlights.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Timeline shared with you
              </h3>
              <p className="text-gray-600">
                {shareInfo?.shareType === 'highlight'
                  ? 'A family member shared a special moment with you.'
                  : 'A family member shared their timeline with you.'}
              </p>
              <p className="text-sm text-gray-500 mt-4">
                Shared timelines are displayed in read-only mode.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {highlights.map((highlight) => (
                <div
                  key={highlight.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{highlight.title}</h3>

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
                        {highlight.media.map((media: any) => (
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
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      Added {format(new Date(highlight.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>
            This is a shared preview. To contribute to the family timeline,{' '}
            <a href="/login" className="text-blue-600 hover:underline">
              sign in
            </a>{' '}
            or{' '}
            <a href="/signup" className="text-blue-600 hover:underline">
              create an account
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
