'use client';

import { useState } from 'react';
import { trpc } from '~/utils/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Check, X, Loader2, AlertCircle } from 'lucide-react';
import type { FlaggedItem } from './ModerationQueuePanel';

interface FlaggedItemDetailProps {
  item: FlaggedItem;
  onReviewComplete: () => void;
}

export default function FlaggedItemDetail({ item, onReviewComplete }: FlaggedItemDetailProps) {
  const [reviewReason, setReviewReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reviewMutation = trpc.contentModeration.reviewFlaggedItem.useMutation({
    onSuccess: () => {
      setReviewReason('');
      setIsSubmitting(false);
      onReviewComplete();
    },
    onError: (error: any) => {
      console.error('Error reviewing item:', error);
      setIsSubmitting(false);
    },
  });

  const handleApprove = async () => {
    if (!reviewReason.trim()) {
      alert('Please provide a reason for approval');
      return;
    }
    setIsSubmitting(true);
    await reviewMutation.mutateAsync({
      itemId: item.id,
      itemType: item.type,
      decision: 'approved',
      reason: reviewReason,
    });
  };

  const handleReject = async () => {
    if (!reviewReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    setIsSubmitting(true);
    await reviewMutation.mutateAsync({
      itemId: item.id,
      itemType: item.type,
      decision: 'rejected',
      reason: reviewReason,
    });
  };

  const isAlreadyReviewed = item.reviewedAt !== null;

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg">Item Details</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status */}
        {isAlreadyReviewed && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Already reviewed by {item.reviewedBy} on{' '}
              {new Date(item.reviewedAt!).toLocaleDateString()}
            </AlertDescription>
          </Alert>
        )}

        {/* Content Type & Score */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Type & Score</p>
          <div className="flex items-center gap-2">
            <Badge>{item.type}</Badge>
            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-orange-500 h-full"
                style={{ width: `${item.score * 100}%` }}
              />
            </div>
            <span className="text-sm font-mono text-gray-700">
              {(item.score * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Content */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Content</p>
          <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 max-h-48 overflow-y-auto">
            {item.type === 'message' ? (
              <p className="whitespace-pre-wrap break-words">{item.content}</p>
            ) : (
              <p className="text-gray-500 italic">[Media Content - Image/Video]</p>
            )}
          </div>
        </div>

        {/* Violation Reasons */}
        {item.reasons.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Detected Issues</p>
            <div className="space-y-2">
              {item.reasons.map((reason, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-sm bg-red-50 p-2 rounded border border-red-200"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-red-700">{reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Creation Date */}
        <div>
          <p className="text-xs text-gray-500">
            Created: {new Date(item.createdAt).toLocaleString()}
          </p>
        </div>

        {/* Review Section */}
        {!isAlreadyReviewed && (
          <div className="space-y-3 pt-4 border-t">
            <div>
              <label htmlFor="reason" className="text-sm font-semibold text-gray-700 block mb-2">
                Review Decision
              </label>
              <Textarea
                id="reason"
                placeholder="Explain your decision to approve or reject this content..."
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                className="resize-none h-24"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleApprove}
                disabled={isSubmitting || !reviewReason.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </>
                )}
              </Button>
              <Button
                onClick={handleReject}
                disabled={isSubmitting || !reviewReason.trim()}
                variant="destructive"
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </>
                )}
              </Button>
            </div>

            {reviewMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Error: {reviewMutation.error?.message}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Already Reviewed Info */}
        {isAlreadyReviewed && item.reviewReason && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Decision Reason</p>
            <div className="bg-gray-50 p-3 rounded text-sm text-gray-700">
              {item.reviewReason}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
