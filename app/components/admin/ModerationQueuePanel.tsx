'use client';

import { useState, useEffect } from 'react';
import { trpc } from '~/utils/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import FlaggedItemDetail from './FlaggedItemDetail';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

type ContentType = 'message' | 'media' | 'all';
type ReviewStatus = 'pending_review' | 'flagged_auto' | 'approved' | 'rejected';

export interface FlaggedItem {
  id: string;
  type: 'message' | 'media';
  content: string;
  score: number;
  reasons: string[];
  flagged: boolean;
  status: string;
  createdAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  reviewReason: string | null;
}

export default function ModerationQueuePanel() {
  const [selectedType, setSelectedType] = useState<ContentType>('all');
  const [selectedStatus, setSelectedStatus] = useState<ReviewStatus | 'all'>('pending_review');
  const [selectedItem, setSelectedItem] = useState<FlaggedItem | null>(null);
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch } = trpc.contentModeration.getFlaggedQueue.useQuery({
    type: selectedType === 'all' ? undefined : selectedType,
    status: selectedStatus === 'all' ? undefined : (selectedStatus as ReviewStatus),
    limit: 50,
    offset: page * 50,
  });

  const items = data?.items || [];
  const total = data?.total || 0;

  const handleReviewComplete = () => {
    setSelectedItem(null);
    refetch();
  };

  const getStatusIcon = (status: string) => {
    if (status.includes('approved')) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status.includes('rejected')) return <XCircle className="w-4 h-4 text-red-500" />;
    return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      approved: 'secondary',
      rejected: 'destructive',
      pending_review: 'default',
      flagged_auto: 'default',
    };
    return variants[status] || 'default';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Queue Panel */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Moderation Queue</CardTitle>
            <div className="flex gap-4 mt-4">
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as ContentType)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="message">Messages</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as ReviewStatus | 'all')}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="flagged_auto">Auto Flagged</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Loading items...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">No flagged items to review</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {items.map((item: FlaggedItem) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`w-full text-left p-4 border rounded-lg transition-colors ${
                        selectedItem?.id === item.id
                          ? 'bg-blue-50 border-blue-300'
                          : 'hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(item.status)}
                            <Badge variant={getStatusBadge(item.status)}>
                              {item.status}
                            </Badge>
                            <Badge variant="outline">{item.type}</Badge>
                            <span className="text-xs text-gray-500">
                              {item.score.toFixed(2)} confidence
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 truncate">
                            {item.type === 'message'
                              ? item.content.substring(0, 100)
                              : '[Media Content]'}
                          </p>
                          {item.reasons.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              {item.reasons[0]}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-gray-600">
                    Showing {page * 50 + 1}-{Math.min((page + 1) * 50, total)} of {total}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={(page + 1) * 50 >= total}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Panel */}
      {selectedItem && (
        <div className="lg:col-span-1">
          <FlaggedItemDetail item={selectedItem} onReviewComplete={handleReviewComplete} />
        </div>
      )}
    </div>
  );
}
