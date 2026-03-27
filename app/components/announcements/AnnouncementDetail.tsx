import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Flame,
  Users,
  X,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Card } from '~/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { formatDistanceToNow, formatDate } from 'date-fns';

interface ReadReceipt {
  userId: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
  readAt: string | Date;
  acknowledged: boolean | null;
  acknowledgedAt: string | Date | null;
}

interface AnnouncementDetailProps {
  announcement: {
    id: string;
    title: string;
    content: string;
    category: string;
    isPinned: boolean;
    priority: number;
    createdAt: Date;
    createdBy: string;
  };
  isAdmin: boolean;
  isRead: boolean;
  isAcknowledged: boolean;
  readReceipts?: {
    totalMembers: number;
    readCount: number;
    acknowledgmentCount: number;
    receipts: ReadReceipt[];
    unreadMembers: any[];
  };
  onClose: () => void;
  onMarkAsRead: () => void;
  onAcknowledge: () => void;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'important':
      return 'bg-red-100 text-red-800';
    case 'events':
      return 'bg-blue-100 text-blue-800';
    case 'reminders':
      return 'bg-yellow-100 text-yellow-800';
    case 'milestones':
      return 'bg-purple-100 text-purple-800';
    case 'family_news':
    default:
      return 'bg-green-100 text-green-800';
  }
};

export function AnnouncementDetail({
  announcement,
  isAdmin,
  isRead,
  isAcknowledged,
  readReceipts,
  onClose,
  onMarkAsRead,
  onAcknowledge,
}: AnnouncementDetailProps) {
  const [showReadReceipts, setShowReadReceipts] = useState(false);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between pr-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute left-4 top-4"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <DialogTitle className="text-xl">{announcement.title}</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute right-4 top-4"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Badges and metadata */}
          <div className="flex flex-wrap gap-2">
            {announcement.isPinned && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                📌 Pinned
              </Badge>
            )}
            <Badge className={getCategoryColor(announcement.category)}>
              {announcement.category.replace(/_/g, ' ').toUpperCase()}
            </Badge>
            {announcement.priority >= 2 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Flame className="w-3 h-3" />
                URGENT
              </Badge>
            )}
            {announcement.priority === 1 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                High Priority
              </Badge>
            )}
          </div>

          {/* Content */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {announcement.content}
            </p>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>
                {formatDate(new Date(announcement.createdAt), 'PPP p')}
              </span>
            </div>
            <div>
              <span className="text-gray-700 font-medium">
                {formatDistanceToNow(new Date(announcement.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>

          {/* User actions */}
          {!isRead ? (
            <Button
              onClick={onMarkAsRead}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Mark as Read
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium bg-green-50 p-3 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              You have read this announcement
            </div>
          )}

          {isRead && !isAcknowledged && (
            <Button
              onClick={onAcknowledge}
              variant="outline"
              className="w-full"
            >
              Acknowledge Receipt
            </Button>
          )}

          {isAcknowledged && (
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium bg-green-50 p-3 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              You have acknowledged this announcement
            </div>
          )}

          {/* Read receipts for admins */}
          {isAdmin && readReceipts && (
            <Card className="border-slate-200 bg-gray-50 p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Family Response
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReadReceipts(!showReadReceipts)}
                    className="text-blue-600"
                  >
                    {showReadReceipts ? 'Hide' : 'Show'} Details
                  </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded border border-slate-200 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {readReceipts.readCount}/{readReceipts.totalMembers}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Read</div>
                  </div>
                  <div className="bg-white p-3 rounded border border-slate-200 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {readReceipts.acknowledgmentCount}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Acknowledged</div>
                  </div>
                  <div className="bg-white p-3 rounded border border-slate-200 text-center">
                    <div className="text-2xl font-bold text-amber-600">
                      {readReceipts.totalMembers - readReceipts.readCount}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Not Read</div>
                  </div>
                </div>

                {/* Detailed receipts */}
                {showReadReceipts && (
                  <div className="space-y-3 bg-white p-3 rounded border border-slate-200">
                    <div className="space-y-2">
                      <h5 className="text-sm font-semibold text-gray-900">
                        Read Receipts
                      </h5>
                      {readReceipts.receipts.length > 0 ? (
                        <div className="space-y-1">
                          {readReceipts.receipts.map((receipt) => (
                            <div
                              key={receipt.userId}
                              className="flex items-center justify-between text-sm py-1"
                            >
                              <span className="text-gray-700">
                                {receipt.user.firstName} {receipt.user.lastName}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                  {formatDistanceToNow(
                                    new Date(receipt.readAt),
                                    { addSuffix: true }
                                  )}
                                </span>
                                {receipt.acknowledged && (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">
                          No read receipts yet
                        </p>
                      )}
                    </div>

                    {readReceipts.unreadMembers.length > 0 && (
                      <div className="space-y-2 border-t border-slate-200 pt-3">
                        <h5 className="text-sm font-semibold text-gray-900">
                          Not Read Yet
                        </h5>
                        <div className="space-y-1">
                          {readReceipts.unreadMembers.map((member) => (
                            <div
                              key={member.id}
                              className="text-sm text-gray-600 py-1"
                            >
                              Awaiting response from{' '}
                              <span className="font-medium">
                                {member.userId}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
