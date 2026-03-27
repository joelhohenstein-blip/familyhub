import { useState, useEffect } from 'react';
import { trpc } from '~/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { Input } from '~/components/ui/input';
import { AlertCircle, CheckCircle2, Loader2, Clock, Trash2, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';

interface ReminderFormData {
  reminderTime: string;
  channels: ('in-app' | 'email' | 'push')[];
  timezone: string;
  enabled: boolean;
}

const DEFAULT_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

export function DailyReminderSettings({ familyId }: { familyId: string }) {
  const [reminders, setReminders] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ReminderFormData>({
    reminderTime: '09:00',
    channels: ['in-app', 'email'],
    timezone: 'UTC',
    enabled: true,
  });

  // Get reminders
  const { data: remindersData, isLoading, refetch } = trpc.reminders.getReminders.useQuery({
    familyId,
  });

  useEffect(() => {
    if (remindersData?.items) {
      setReminders(remindersData.items);
    }
  }, [remindersData]);

  // Create reminder mutation
  const createReminderMutation = trpc.reminders.createReminder.useMutation({
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Reminder created successfully!' });
      setShowForm(false);
      resetForm();
      refetch();
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error: any) => {
      setMessage({ type: 'error', text: error.message || 'Failed to create reminder' });
    },
  });

  // Update reminder mutation
  const updateReminderMutation = trpc.reminders.updateReminder.useMutation({
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Reminder updated successfully!' });
      setEditingId(null);
      resetForm();
      refetch();
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error: any) => {
      setMessage({ type: 'error', text: error.message || 'Failed to update reminder' });
    },
  });

  // Delete reminder mutation
  const deleteReminderMutation = trpc.reminders.deleteReminder.useMutation({
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Reminder deleted successfully!' });
      refetch();
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error: any) => {
      setMessage({ type: 'error', text: error.message || 'Failed to delete reminder' });
    },
  });

  // Toggle reminder mutation
  const toggleReminderMutation = trpc.reminders.toggleReminder.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error: any) => {
      setMessage({ type: 'error', text: error.message || 'Failed to toggle reminder' });
    },
  });

  const resetForm = () => {
    setFormData({
      reminderTime: '09:00',
      channels: ['in-app', 'email'],
      timezone: 'UTC',
      enabled: true,
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      await updateReminderMutation.mutateAsync({
        id: editingId,
        ...formData,
      });
    } else {
      await createReminderMutation.mutateAsync({
        familyId,
        ...formData,
      });
    }
  };

  const handleEdit = (reminder: any) => {
    setFormData({
      reminderTime: reminder.reminderTime,
      channels: reminder.channels,
      timezone: reminder.timezone,
      enabled: reminder.enabled,
    });
    setEditingId(reminder.id);
    setShowForm(true);
  };

  const toggleChannelSelection = (channel: 'in-app' | 'email' | 'push') => {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-orange-600" />
            Daily Reminders
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Set up reminders to stay connected with your family
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={() => {
              setShowForm(true);
              resetForm();
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Reminder
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Reminder' : 'Create New Reminder'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Time Selection */}
              <div className="space-y-2">
                <Label htmlFor="time" className="font-medium text-gray-900">
                  Reminder Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.reminderTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      reminderTime: e.target.value,
                    }))
                  }
                  required
                  className="max-w-xs"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Reminders will be sent at this time each day
                </p>
              </div>

              {/* Timezone Selection */}
              <div className="space-y-2">
                <Label htmlFor="timezone" className="font-medium text-gray-900">
                  Timezone
                </Label>
                <select
                  id="timezone"
                  value={formData.timezone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      timezone: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {DEFAULT_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              {/* Channel Selection */}
              <div className="space-y-3">
                <Label className="font-medium text-gray-900">Notification Channels</Label>
                <div className="space-y-2">
                  {(['in-app', 'email', 'push'] as const).map((channel) => (
                    <div
                      key={channel}
                      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <input
                        type="checkbox"
                        id={`channel-${channel}`}
                        checked={formData.channels.includes(channel)}
                        onChange={() => toggleChannelSelection(channel)}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                      <label
                        htmlFor={`channel-${channel}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div>
                          <p className="font-medium text-gray-900 capitalize">
                            {channel} Notifications
                          </p>
                          <p className="text-xs text-gray-600">
                            {channel === 'in-app' && 'Receive notifications in the app'}
                            {channel === 'email' && 'Receive reminder emails'}
                            {channel === 'push' && 'Receive push notifications'}
                          </p>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Select at least one channel to receive reminders
                </p>
              </div>

              {/* Enabled Toggle */}
              <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                <Label htmlFor="enabled" className="cursor-pointer flex-1">
                  <div>
                    <p className="font-medium text-gray-900">Enable Reminder</p>
                    <p className="text-xs text-gray-600">This reminder is currently {formData.enabled ? 'enabled' : 'disabled'}</p>
                  </div>
                </Label>
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      enabled: checked,
                    }))
                  }
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={createReminderMutation.isPending || updateReminderMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {createReminderMutation.isPending || updateReminderMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingId ? 'Updating...' : 'Creating...'}
                    </>
                  ) : editingId ? (
                    'Update Reminder'
                  ) : (
                    'Create Reminder'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="flex-1 border-slate-300"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reminders List */}
      {reminders.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Your Reminders ({reminders.length})</h3>
          {reminders.map((reminder) => (
            <Card key={reminder.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span className="font-semibold text-gray-900">{reminder.reminderTime}</span>
                      <Badge variant="outline" className="ml-2">
                        {reminder.timezone}
                      </Badge>
                      {!reminder.enabled && (
                        <Badge variant="outline" className="bg-gray-100 text-gray-700">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {reminder.channels.map((channel: string) => (
                        <Badge
                          key={channel}
                          variant="secondary"
                          className="text-xs capitalize"
                        >
                          {channel}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Switch
                      checked={reminder.enabled}
                      onCheckedChange={() =>
                        toggleReminderMutation.mutate({ id: reminder.id })
                      }
                      disabled={toggleReminderMutation.isPending}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(reminder)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteReminderMutation.mutate({ id: reminder.id })}
                      disabled={deleteReminderMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {deleteReminderMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !showForm ? (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No reminders set yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Create a reminder to stay connected with your family
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
