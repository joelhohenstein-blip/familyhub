import { useState, useEffect } from 'react';
import { trpc } from '~/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { AlertCircle, CheckCircle2, Loader2, Lock, Eye, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '~/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';

interface PrivacySettings {
  profileVisibility: 'public' | 'family' | 'private';
  allowMessageRequests: boolean;
  allowMediaSharing: boolean;
  allowLocationSharing: boolean;
  allowActivityStatus: boolean;
  twoFactorEnabled: boolean;
  blockNonFamilyMessages: boolean;
}

export function PrivacySecuritySection() {
  const [settings, setSettings] = useState<PrivacySettings>({
    profileVisibility: 'family',
    allowMessageRequests: true,
    allowMediaSharing: true,
    allowLocationSharing: false,
    allowActivityStatus: true,
    twoFactorEnabled: false,
    blockNonFamilyMessages: true,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  // Get privacy settings
  const { data: fetchedSettings, isLoading } = trpc.privacySettings.getSettings.useQuery();

  useEffect(() => {
    if (fetchedSettings) {
      setSettings(fetchedSettings);
    }
  }, [fetchedSettings]);

  // Update settings mutation
  const updateSettingsMutation = trpc.privacySettings.updateSettings.useMutation({
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Privacy settings updated!' });
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

  // Delete account mutation
  const deleteAccountMutation = trpc.users.deleteAccount.useMutation({
    onSuccess: () => {
      // Redirect to login or home
      window.location.href = '/login';
    },
    onError: (error: any) => {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to delete account',
      });
    },
  });

  const handleToggle = (key: keyof PrivacySettings, value?: any) => {
    if (typeof value === 'string') {
      setSettings((prev) => ({
        ...prev,
        [key]: value,
      }));
    } else {
      setSettings((prev) => ({
        ...prev,
        [key]: !(prev[key] as any),
      }));
    }
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updateSettingsMutation.mutateAsync(settings);
  };

  const handleDeleteAccount = async () => {
    await deleteAccountMutation.mutateAsync();
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

      {/* Profile Privacy */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-600" />
            <div>
              <CardTitle>Profile Privacy</CardTitle>
              <CardDescription>Control who can see your profile</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {[
              { value: 'public' as const, label: 'Public', desc: 'Anyone can view your profile' },
              { value: 'family' as const, label: 'Family Only', desc: 'Only family members can view' },
              { value: 'private' as const, label: 'Private', desc: 'No one can view your profile' },
            ].map((option) => (
              <label
                key={option.value}
                className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  settings.profileVisibility === option.value
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="profileVisibility"
                  value={option.value}
                  checked={settings.profileVisibility === option.value}
                  onChange={(e) => handleToggle('profileVisibility', e.target.value)}
                  className="w-4 h-4"
                />
                <div className="ml-3 flex-1">
                  <p className="font-medium text-slate-900">{option.label}</p>
                  <p className="text-sm text-slate-600">{option.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Communication Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Communication & Sharing</CardTitle>
          <CardDescription>Control how others can contact and share with you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Label htmlFor="msgRequests" className="cursor-pointer flex-1">
              <div>
                <p className="font-medium text-slate-900">Allow Message Requests</p>
                <p className="text-sm text-slate-600">Let family members start conversations</p>
              </div>
            </Label>
            <Switch
              id="msgRequests"
              checked={settings.allowMessageRequests}
              onCheckedChange={() => handleToggle('allowMessageRequests')}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Label htmlFor="mediaSharing" className="cursor-pointer flex-1">
              <div>
                <p className="font-medium text-slate-900">Allow Media Sharing</p>
                <p className="text-sm text-slate-600">Let others share photos/videos with you</p>
              </div>
            </Label>
            <Switch
              id="mediaSharing"
              checked={settings.allowMediaSharing}
              onCheckedChange={() => handleToggle('allowMediaSharing')}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Label htmlFor="blockNonFamily" className="cursor-pointer flex-1">
              <div>
                <p className="font-medium text-slate-900">Block Non-Family Messages</p>
                <p className="text-sm text-slate-600">Only receive messages from family members</p>
              </div>
            </Label>
            <Switch
              id="blockNonFamily"
              checked={settings.blockNonFamilyMessages}
              onCheckedChange={() => handleToggle('blockNonFamilyMessages')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Location & Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Location & Activity</CardTitle>
          <CardDescription>Control what information is shared with your family</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Label htmlFor="locationSharing" className="cursor-pointer flex-1">
              <div>
                <p className="font-medium text-slate-900">Location Sharing</p>
                <p className="text-sm text-slate-600">Share your location with family</p>
              </div>
            </Label>
            <Switch
              id="locationSharing"
              checked={settings.allowLocationSharing}
              onCheckedChange={() => handleToggle('allowLocationSharing')}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Label htmlFor="activityStatus" className="cursor-pointer flex-1">
              <div>
                <p className="font-medium text-slate-900">Activity Status</p>
                <p className="text-sm text-slate-600">Show when you're online and typing</p>
              </div>
            </Label>
            <Switch
              id="activityStatus"
              checked={settings.allowActivityStatus}
              onCheckedChange={() => handleToggle('allowActivityStatus')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            <div>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">
                  {settings.twoFactorEnabled ? '✓ Enabled' : 'Not Enabled'}
                </p>
                <p className="text-sm text-slate-600">
                  {settings.twoFactorEnabled
                    ? 'You have 2FA enabled on your account'
                    : 'Enhance your account security with 2FA'}
                </p>
              </div>
            </div>
          </div>
          <Button
            variant={settings.twoFactorEnabled ? 'outline' : 'default'}
            className="w-full"
          >
            {settings.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
          </Button>
        </CardContent>
      </Card>

      {/* Data & Account */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-800">
              Deleting your account will permanently remove all your data from FamilyHub. This action cannot be undone.
            </p>
          </div>
          <Button
            variant="destructive"
            className="w-full bg-red-600 hover:bg-red-700"
            onClick={() => setDeleteAccountOpen(true)}
          >
            Delete Account
          </Button>
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
              'Save Changes'
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

      {/* Delete Account Confirmation */}
      <AlertDialog open={deleteAccountOpen}>
        <AlertDialogContent>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            Delete Account
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>This action is permanent and cannot be undone.</p>
            <p className="font-semibold text-slate-900">All your data will be deleted, including:</p>
            <ul className="list-disc list-inside text-slate-700 text-sm">
              <li>Messages and conversations</li>
              <li>Photos and videos</li>
              <li>Calendar events</li>
              <li>All personal information</li>
            </ul>
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel onClick={() => setDeleteAccountOpen(false)}>
              Keep Account
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteAccountMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteAccountMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
