import { useState } from 'react';
import { trpc } from '~/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Bell, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { NotificationsList } from '../NotificationsList';

interface NotificationsPageProps {
  familyId: string;
}

export function NotificationsPage({ familyId }: NotificationsPageProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Get unread count
  const { data: unreadData, refetch } = trpc.notifications.getUnreadCount.useQuery({
    familyId,
  });

  const unreadCount = unreadData?.unreadCount || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="w-8 h-8 text-blue-600" />
          Notifications
        </h1>
        <p className="text-gray-600 mt-1">
          Stay updated with important family hub events and activities
        </p>
      </div>

      {/* Messages */}
      {message && (
        <Alert
          variant={message.type === 'success' ? 'default' : 'destructive'}
          className={message.type === 'success' ? 'bg-green-50 border-green-200' : ''}
        >
          {message.type === 'success' ? (
            <AlertCircle className="w-4 h-4 text-green-600" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : ''}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex-1">
                <p className="text-sm text-gray-600 font-medium">Unread Notifications</p>
                <p className="text-3xl font-bold text-blue-600">{unreadCount}</p>
              </div>
              <Bell className="w-8 h-8 text-blue-300" />
            </div>

            <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
              <div className="flex-1">
                <p className="text-sm text-gray-600 font-medium">Category</p>
                <p className="text-lg font-semibold text-orange-600">All Activity Types</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-300" />
            </div>

            <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-100">
              <div className="flex-1">
                <p className="text-sm text-gray-600 font-medium">Status</p>
                <p className="text-lg font-semibold text-green-600">Active</p>
              </div>
              <div className="w-4 h-4 bg-green-600 rounded-full animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Feed</CardTitle>
          <CardDescription>View and manage your notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="all">
                All Notifications
              </TabsTrigger>
              <TabsTrigger value="unread">
                Unread {unreadCount > 0 && <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">{unreadCount}</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <NotificationsList familyId={familyId} onlyUnread={false} />
            </TabsContent>

            <TabsContent value="unread" className="space-y-4">
              <NotificationsList familyId={familyId} onlyUnread={true} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>About Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>
            You'll receive notifications for important family hub events including:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>New messages in family conversations</li>
            <li>Incoming video call requests</li>
            <li>Photo and video uploads from family members</li>
            <li>Event reminders and calendar updates</li>
            <li>Mention alerts when someone tags you</li>
          </ul>
          <p className="mt-4">
            You can customize your notification preferences in the{' '}
            <a href="/dashboard/settings" className="text-blue-600 hover:underline font-medium">
              settings page
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
