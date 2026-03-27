import React from 'react';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Megaphone,
  Flame,
} from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'family_news' | 'events' | 'reminders' | 'important' | 'milestones';
  isPinned: boolean;
  priority: number;
  createdAt: Date;
  createdBy: string;
  isRead: boolean;
  isAcknowledged: boolean;
}

interface AnnouncementListProps {
  announcements: Announcement[];
  isLoading: boolean;
  onMarkAsRead: (announcementId: string) => void;
  onAcknowledge: (announcementId: string) => void;
  onViewDetails: (announcementId: string) => void;
}

const getCategoryColor = (
  category: 'family_news' | 'events' | 'reminders' | 'important' | 'milestones'
) => {
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

const getCategoryLabel = (
  category: 'family_news' | 'events' | 'reminders' | 'important' | 'milestones'
) => {
  const labels = {
    family_news: 'Family News',
    events: 'Events',
    reminders: 'Reminder',
    important: 'Important',
    milestones: 'Milestone',
  };
  return labels[category];
};

const getPriorityIcon = (priority: number) => {
  if (priority >= 2) {
    return <Flame className="w-4 h-4 text-red-600" />;
  }
  if (priority === 1) {
    return <AlertCircle className="w-4 h-4 text-orange-600" />;
  }
  return null;
};

export function AnnouncementList({
  announcements,
  isLoading,
  onMarkAsRead,
  onAcknowledge,
  onViewDetails,
}: AnnouncementListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Megaphone className="w-8 h-8 text-gray-400 mx-auto mb-3 animate-pulse" />
          <p className="text-gray-600">Loading announcements...</p>
        </div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">No announcements yet</p>
          <p className="text-gray-500 text-sm">
            Important updates from family admins will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <Card
          key={announcement.id}
          className={`overflow-hidden transition-all ${
            !announcement.isRead
              ? 'border-l-4 border-l-blue-500 bg-blue-50 border-slate-200'
              : 'border-slate-200'
          } ${
            announcement.isPinned ? 'ring-2 ring-amber-400' : ''
          }`}
        >
          <div className="p-5 sm:p-6">
            {/* Header with badge and title */}
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {announcement.isPinned && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                      📌 Pinned
                    </Badge>
                  )}
                  <Badge className={getCategoryColor(announcement.category)}>
                    {getCategoryLabel(announcement.category)}
                  </Badge>
                  {getPriorityIcon(announcement.priority) && (
                    <div className="flex items-center gap-1">
                      {getPriorityIcon(announcement.priority)}
                      <span className="text-xs font-semibold text-gray-700">
                        {announcement.priority >= 2 ? 'Urgent' : 'High Priority'}
                      </span>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {announcement.title}
                </h3>
              </div>
              
              {/* Read status indicator */}
              <div className="flex-shrink-0">
                {!announcement.isRead && (
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                )}
              </div>
            </div>

            {/* Content preview */}
            <p className="text-gray-700 mb-4 line-clamp-3">
              {announcement.content}
            </p>

            {/* Footer with timestamp and actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    {formatDistanceToNow(new Date(announcement.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Read/Unread button */}
                {!announcement.isRead ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMarkAsRead(announcement.id)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Mark Read
                  </Button>
                ) : (
                  <div className="flex items-center gap-1 px-3 py-2 text-sm text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Read
                  </div>
                )}

                {/* Acknowledge button */}
                {announcement.isRead && !announcement.isAcknowledged && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAcknowledge(announcement.id)}
                    className="text-gray-700"
                  >
                    Acknowledge
                  </Button>
                )}

                {announcement.isAcknowledged && (
                  <div className="flex items-center gap-1 px-3 py-2 text-sm text-green-700 bg-green-50 rounded">
                    <CheckCircle2 className="w-4 h-4" />
                    Acknowledged
                  </div>
                )}

                {/* View details button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetails(announcement.id)}
                >
                  View
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
