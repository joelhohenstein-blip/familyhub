import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { usePresence, type PresenceStatus } from '~/hooks/usePresence';

interface PresenceDisplayProps {
  familyId: string;
  showLastSeen?: boolean;
  compact?: boolean;
  maxVisible?: number;
}

/**
 * Component to display online/offline status for family members
 * Shows:
 * - Online users with green indicator
 * - Offline users with gray indicator
 * - Last-seen timestamp for offline users
 * - Count of online users
 */
export const PresenceDisplay: React.FC<PresenceDisplayProps> = ({
  familyId,
  showLastSeen = true,
  compact = false,
  maxVisible = 5,
}) => {
  const { presenceList, isLoading, error } = usePresence({
    familyId,
    autoHeartbeat: true,
  });

  const { onlineUsers, offlineUsers, onlineCount, totalCount } = useMemo(() => {
    const online = presenceList.filter((p) => p.status === 'online');
    const offline = presenceList.filter((p) => p.status === 'offline');
    return {
      onlineUsers: online,
      offlineUsers: offline,
      onlineCount: online.length,
      totalCount: presenceList.length,
    };
  }, [presenceList]);

  const displayOnlineUsers = useMemo(() => {
    return onlineUsers.slice(0, maxVisible);
  }, [onlineUsers, maxVisible]);

  const moreOfflineCount = useMemo(() => {
    return Math.max(0, offlineUsers.length - maxVisible);
  }, [offlineUsers, maxVisible]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="text-sm text-gray-500">Loading presence...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-3">
        <p className="text-sm text-red-700">Failed to load presence: {error}</p>
      </div>
    );
  }

  if (compact) {
    // Compact mode: just show count and abbreviated list
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span className="text-sm font-medium text-gray-700">
            {onlineCount} {onlineCount === 1 ? 'person' : 'people'} online
          </span>
        </div>

        {displayOnlineUsers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {displayOnlineUsers.map((user) => (
              <span key={user.userId} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                {user.userName}
              </span>
            ))}
            {onlineUsers.length > maxVisible && (
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                +{onlineUsers.length - maxVisible}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full mode: detailed list with status indicators
  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Family Members ({totalCount})
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          {onlineCount} {onlineCount === 1 ? 'member' : 'members'} online
        </p>
      </div>

      {/* Members list */}
      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {/* Online users */}
        {onlineUsers.length > 0 && (
          <>
            <div className="px-4 py-2 bg-green-50 border-b border-green-100">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                Online ({onlineCount})
              </p>
            </div>
            {displayOnlineUsers.map((user) => (
              <PresenceItem key={user.userId} user={user} showLastSeen={false} />
            ))}
            {onlineUsers.length > maxVisible && (
              <div className="px-4 py-3 bg-green-50 text-center border-t border-green-100">
                <p className="text-xs text-green-700 font-medium">
                  +{onlineUsers.length - maxVisible} more online
                </p>
              </div>
            )}
          </>
        )}

        {/* Offline users */}
        {offlineUsers.length > 0 && (
          <>
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Offline ({offlineUsers.length})
              </p>
            </div>
            {offlineUsers.slice(0, maxVisible).map((user) => (
              <PresenceItem key={user.userId} user={user} showLastSeen={showLastSeen} />
            ))}
            {moreOfflineCount > 0 && (
              <div className="px-4 py-3 bg-gray-50 text-center border-t border-gray-100">
                <p className="text-xs text-gray-700 font-medium">
                  +{moreOfflineCount} more offline
                </p>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {presenceList.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-500">No members yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Individual presence item component
 */
interface PresenceItemProps {
  user: PresenceStatus;
  showLastSeen?: boolean;
}

const PresenceItem: React.FC<PresenceItemProps> = ({ user, showLastSeen = true }) => {
  const isOnline = user.status === 'online';

  return (
    <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Status indicator */}
        <div
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
            isOnline ? 'bg-blue-500' : 'bg-gray-400'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />

        {/* User info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{user.userName}</p>
          {user.userEmail && (
            <p className="text-xs text-gray-500 truncate">{user.userEmail}</p>
          )}
        </div>
      </div>

      {/* Last seen or status */}
      {showLastSeen && !isOnline && (
        <div className="ml-2 flex items-center gap-1 flex-shrink-0 text-gray-500">
          <Clock className="w-3 h-3" />
          <span className="text-xs whitespace-nowrap">
            {formatDistanceToNow(user.lastSeenAt, { addSuffix: true })}
          </span>
        </div>
      )}

      {isOnline && (
        <div className="ml-2 flex-shrink-0 text-xs font-medium text-green-600">
          Active
        </div>
      )}
    </div>
  );
};

export default PresenceDisplay;
