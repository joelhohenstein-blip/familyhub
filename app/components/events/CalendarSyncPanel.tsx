import { useState } from 'react';
import {
  Calendar,
  Check,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { trpc } from '~/utils/trpc';

interface CalendarSyncPanelProps {
  familyId: string;
}

export function CalendarSyncPanel({ familyId }: CalendarSyncPanelProps) {
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);
  const [disconnectingProvider, setDisconnectingProvider] = useState<string | null>(null);

  const googleStatusQuery = trpc.calendarSync.getSyncStatus.useQuery({
    familyId,
    provider: 'google',
  });

  const outlookStatusQuery = trpc.calendarSync.getSyncStatus.useQuery({
    familyId,
    provider: 'outlook',
  });

  const syncHistoryQuery = trpc.calendarSync.getSyncHistory.useQuery({
    familyId,
    limit: 10,
  });

  const setupGoogleMutation = trpc.calendarSync.setupGoogleCalendar.useMutation({
    onSuccess: () => {
      googleStatusQuery.refetch();
    },
  });

  const setupOutlookMutation = trpc.calendarSync.setupOutlookCalendar.useMutation({
    onSuccess: () => {
      outlookStatusQuery.refetch();
    },
  });

  const disconnectGoogleMutation = trpc.calendarSync.disconnectCalendar.useMutation({
    onSuccess: () => {
      googleStatusQuery.refetch();
    },
  });

  const disconnectOutlookMutation = trpc.calendarSync.disconnectCalendar.useMutation({
    onSuccess: () => {
      outlookStatusQuery.refetch();
    },
  });

  const forceSyncMutation = trpc.calendarSync.forceSyncNow.useMutation();

  const handleSetupGoogle = async () => {
    setSyncingProvider('google');
    try {
      // In production, this would initiate OAuth flow
      // For now, simulate with a dummy auth code
      await setupGoogleMutation.mutateAsync({
        familyId,
        authCode: 'auth_code_' + Date.now(),
      });
    } finally {
      setSyncingProvider(null);
    }
  };

  const handleSetupOutlook = async () => {
    setSyncingProvider('outlook');
    try {
      await setupOutlookMutation.mutateAsync({
        familyId,
        authCode: 'auth_code_' + Date.now(),
      });
    } finally {
      setSyncingProvider(null);
    }
  };

  const handleDisconnectGoogle = async () => {
    setDisconnectingProvider('google');
    try {
      await disconnectGoogleMutation.mutateAsync({
        familyId,
        provider: 'google',
      });
    } finally {
      setDisconnectingProvider(null);
    }
  };

  const handleDisconnectOutlook = async () => {
    setDisconnectingProvider('outlook');
    try {
      await disconnectOutlookMutation.mutateAsync({
        familyId,
        provider: 'outlook',
      });
    } finally {
      setDisconnectingProvider(null);
    }
  };

  const handleForceSync = async (provider: 'google' | 'outlook') => {
    setSyncingProvider(`force_${provider}`);
    try {
      await forceSyncMutation.mutateAsync({
        familyId,
        provider,
      });
    } finally {
      setSyncingProvider(null);
    }
  };

  const googleStatus = (googleStatusQuery.data as any)?.status;
  const outlookStatus = (outlookStatusQuery.data as any)?.status;
  const syncHistory = (syncHistoryQuery.data as any)?.history || [];

  return (
    <div className="space-y-6">
      {/* Calendar Integrations Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Connected Calendars</h3>

        {/* Google Calendar */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Google Calendar</h4>
                <p className="text-xs text-gray-600">
                  {googleStatus?.isActive ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Check className="h-3 w-3" /> Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-600">
                      <X className="h-3 w-3" /> Not connected
                    </span>
                  )}
                </p>
              </div>
            </div>
            {googleStatus?.lastSyncAt && (
              <div className="text-right text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last synced
                </div>
                {new Date(googleStatus.lastSyncAt).toLocaleDateString()}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!googleStatus?.isActive ? (
              <Button
                onClick={handleSetupGoogle}
                disabled={syncingProvider === 'google'}
                size="sm"
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {syncingProvider === 'google' ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ExternalLink className="h-3 w-3" />
                )}
                Connect
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => handleForceSync('google')}
                  disabled={syncingProvider === 'force_google'}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  {syncingProvider === 'force_google' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Sync Now
                </Button>
                <Button
                  onClick={handleDisconnectGoogle}
                  disabled={disconnectingProvider === 'google'}
                  size="sm"
                  variant="ghost"
                  className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {disconnectingProvider === 'google' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  Disconnect
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Outlook Calendar */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Outlook / Microsoft 365</h4>
                <p className="text-xs text-gray-600">
                  {outlookStatus?.isActive ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Check className="h-3 w-3" /> Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-600">
                      <X className="h-3 w-3" /> Not connected
                    </span>
                  )}
                </p>
              </div>
            </div>
            {outlookStatus?.lastSyncAt && (
              <div className="text-right text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last synced
                </div>
                {new Date(outlookStatus.lastSyncAt).toLocaleDateString()}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!outlookStatus?.isActive ? (
              <Button
                onClick={handleSetupOutlook}
                disabled={syncingProvider === 'outlook'}
                size="sm"
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {syncingProvider === 'outlook' ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ExternalLink className="h-3 w-3" />
                )}
                Connect
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => handleForceSync('outlook')}
                  disabled={syncingProvider === 'force_outlook'}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  {syncingProvider === 'force_outlook' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Sync Now
                </Button>
                <Button
                  onClick={handleDisconnectOutlook}
                  disabled={disconnectingProvider === 'outlook'}
                  size="sm"
                  variant="ghost"
                  className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {disconnectingProvider === 'outlook' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  Disconnect
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sync History Section */}
      {syncHistory.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Recent Sync Activity</h3>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="space-y-2">
              {syncHistory.slice(0, 5).map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between border-b border-gray-100 py-2 last:border-b-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {log.provider === 'google' ? '📅' : '📆'} {log.provider.toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-600">
                      {new Date(log.lastSyncedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {log.status === 'synced' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                        <Check className="h-3 w-3" />
                        Synced
                      </span>
                    )}
                    {log.status === 'failed' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                        <AlertCircle className="h-3 w-3" />
                        Failed
                      </span>
                    )}
                    {log.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="rounded-lg bg-blue-50 p-4">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold">Calendar Integration Tips</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Connect your calendars to automatically sync scheduled events</li>
              <li>• Events are synced securely using OAuth authentication</li>
              <li>• Use "Sync Now" for immediate synchronization</li>
              <li>• Regular automatic syncs occur in the background</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
