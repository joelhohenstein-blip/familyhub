import { useState } from 'react';
import { trpc } from '~/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { AlertCircle, CheckCircle2, Loader2, Bell, Trash2, Check } from 'lucide-react';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';

interface NotificationsListProps {
  familyId: string;
  onlyUnread?: boolean;
}

const typeColors: Record<string, { bg: string; text: string; icon: string }> = {
  info: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '📘' },
  warning: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '⚠️' },
  error: { bg: 'bg-red-100', text: 'text-red-700', icon: '❌' },
  success: { bg: 'bg-green-100', text: 'text-green-700', icon: '✅' },
};

export function NotificationsList({ familyId, onlyUnread = false }: NotificationsListProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const limit = 10;

  // Get notifications
  const { data, isLoading, refetch } = trpc.notifications.getNotifications.useQuery({
    familyId,
    limit,
    offset: currentPage * limit,
    onlyUnread,
  });

  // Mark as read mutation
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = trpc.notifications.deleteNotification.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12">
            <Bell className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No notifications yet</p>
            <p className="text-sm text-gray-400 mt-1">
              {onlyUnread ? 'All notifications marked as read' : 'You are all caught up!'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions Header */}
      {items.some((n) => !n.read) && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate({ familyId })}
            disabled={markAllAsReadMutation.isPending}
            className="border-slate-300"
          >
            {markAllAsReadMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Marking...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Mark All as Read
              </>
            )}
          </Button>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {items.map((notification) => (
          <Card
            key={notification.id}
            className={`relative border-l-4 transition-all ${
              notification.read
                ? 'border-l-gray-300 bg-gray-50'
                : 'border-l-blue-500 bg-white shadow-md'
            }`}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex gap-4">
                {/* Type Badge */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full ${typeColors[notification.type as keyof typeof typeColors]?.bg || typeColors.info.bg} flex items-center justify-center text-lg`}
                >
                  {typeColors[notification.type as keyof typeof typeColors]?.icon || '📘'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 break-words">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <Badge
                      variant={notification.read ? 'outline' : 'default'}
                      className={notification.read ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'}
                    >
                      {notification.read ? 'Read' : 'New'}
                    </Badge>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsReadMutation.mutate({ id: notification.id })}
                      disabled={markAsReadMutation.isPending}
                      title="Mark as read"
                      className="h-8 w-8 p-0"
                    >
                      {markAsReadMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 text-gray-600 hover:text-gray-900" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNotificationMutation.mutate({ id: notification.id })}
                    disabled={deleteNotificationMutation.isPending}
                    title="Delete"
                    className="h-8 w-8 p-0"
                  >
                    {deleteNotificationMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-gray-600 hover:text-red-600" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-600">
            Showing {currentPage * limit + 1}-{Math.min((currentPage + 1) * limit, total)} of {total}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="border-slate-300"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="border-slate-300"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
