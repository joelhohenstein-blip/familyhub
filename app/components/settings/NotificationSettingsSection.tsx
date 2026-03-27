import { useState, useEffect } from 'react';
import { trpc } from '~/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { AlertCircle, CheckCircle2, Loader2, Bell } from 'lucide-react';
import { Alert, AlertDescription } from '~/components/ui/alert';

interface NotificationSettings {
  messageNotifications: boolean;
  messageEmailNotifications: boolean;
  calendarReminders: boolean;
  calendarEmailReminders: boolean;
  mediaNotifications: boolean;
  mediaEmailNotifications: boolean;
  mentionNotifications: boolean;
  mentionEmailNotifications: boolean;
  dailyDigest: boolean;
  weeklyDigest: boolean;
}

export function NotificationSettingsSection() {
  const [settings, setSettings] = useState<NotificationSettings>({
    messageNotifications: true,
    messageEmailNotifications: false,
    calendarReminders: true,
    calendarEmailReminders: true,
    mediaNotifications: true,
    mediaEmailNotifications: false,
    mentionNotifications: true,
    mentionEmailNotifications: false,
    dailyDigest: false,
    weeklyDigest: true,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Get notification settings
  const { data: fetchedSettings, isLoading } = trpc.notificationSettings.getSettings.useQuery();

  useEffect(() => {
    if (fetchedSettings) {
      setSettings(fetchedSettings);
    }
  }, [fetchedSettings]);

  // Update settings mutation
  const updateSettingsMutation = trpc.notificationSettings.updateSettings.useMutation({
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Notification preferences updated!' });
      setHasChanges(false);
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error: any) => {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to update settings',
      });
    },
  });

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updateSettingsMutation.mutateAsync(settings);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {message && (
        <Alert
          variant={message.type === 'success' ? 'default' : 'destructive'}
          className={message.type === 'success' ? 'bg-green-50 border-green-200' : ''}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : ''}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Message Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle>Message Notifications</CardTitle>
              <CardDescription>Control how you receive message alerts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Label htmlFor="messageNotif" className="cursor-pointer flex-1">
              <div>
                <p className="font-medium text-slate-900">In-App Notifications</p>
                <p className="text-sm text-slate-600">Get notified within the app</p>
              </div>
            </Label>
            <Switch
              id="messageNotif"
              checked={settings.messageNotifications}
              onCheckedChange={() => handleToggle('messageNotifications')}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Label htmlFor="messageEmail" className="cursor-pointer flex-1">
              <div>
                <p className="font-medium text-slate-900">Email Notifications</p>
                <p className="text-sm text-slate-600">Receive message digests via email</p>
              </div>
            </Label>
            <Switch
              id="messageEmail"
              checked={settings.messageEmailNotifications}
              onCheckedChange={() => handleToggle('messageEmailNotifications')}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Label htmlFor="mentionNotif" className="cursor-pointer flex-1">
              <div>
                <p className="font-medium text-slate-900">Mention Alerts</p>
                <p className="text-sm text-slate-600">Alert when someone mentions you</p>
              </div>
            </Label>
            <Switch
              id="mentionNotif"
              checked={settings.mentionNotifications}
              onCheckedChange={() => handleToggle('mentionNotifications')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Calendar Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Calendar & Events</CardTitle>
          <CardDescription>Manage event reminders and calendar alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Label htmlFor="calendarReminders" className="cursor-pointer flex-1">
              <div>
                <p className="font-medium text-slate-900">Event Reminders</p>
                <p className="text-sm text-slate-600">Get reminded before events start</p>
              </div>
            </Label>
            <Switch
              id="calendarReminders"
              checked={settings.calendarReminders}
              onCheckedChange={() => handleToggle('calendarReminders')}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Label htmlFor="calendarEmail" className="cursor-pointer flex-1">
              <div>
                <p className="font-medium text-slate-900">Email Reminders</p>
                <p className="text-sm text-slate-600">Receive event reminders via email</p>
              </div>
            </Label>
            <Switch
              id="calendarEmail"
              checked={settings.calendarEmailReminders}
              onCheckedChange={() => handleToggle('calendarEmailReminders')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Media Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Media Uploads</CardTitle>
          <CardDescription>Get notified about photo and video uploads</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Label htmlFor="mediaNotif" className="cursor-pointer flex-1">
              <div>
                <p className="font-medium text-slate-900">Upload Notifications</p>
                <p className="text-sm text-slate-600">Get notified of new photos/videos</p>
              </div>
            </Label>
            <Switch
              id="mediaNotif"
              checked={settings.mediaNotifications}
              onCheckedChange={() => handleToggle('mediaNotifications')}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Label htmlFor="mediaEmail" className="cursor-pointer flex-1">
              <div>
                <p className="font-medium text-slate-900">Email Digests</p>
                <p className="text-sm text-slate-600">Get media summaries via email</p>
              </div>
            </Label>
            <Switch
              id="mediaEmail"
              checked={settings.mediaEmailNotifications}
              onCheckedChange={() => handleToggle('mediaEmailNotifications')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Digest Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Family Digests</CardTitle>
          <CardDescription>Choose how often you receive family activity summaries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Label htmlFor="dailyDigest" className="cursor-pointer flex-1">
              <div>
                <p className="font-medium text-slate-900">Daily Digest</p>
                <p className="text-sm text-slate-600">Summary of daily family activity</p>
              </div>
            </Label>
            <Switch
              id="dailyDigest"
              checked={settings.dailyDigest}
              onCheckedChange={() => handleToggle('dailyDigest')}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Label htmlFor="weeklyDigest" className="cursor-pointer flex-1">
              <div>
                <p className="font-medium text-slate-900">Weekly Digest</p>
                <p className="text-sm text-slate-600">Summary of weekly highlights</p>
              </div>
            </Label>
            <Switch
              id="weeklyDigest"
              checked={settings.weeklyDigest}
              onCheckedChange={() => handleToggle('weeklyDigest')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {updateSettingsMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSettings(fetchedSettings || settings);
              setHasChanges(false);
            }}
            className="flex-1 border-slate-300"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
