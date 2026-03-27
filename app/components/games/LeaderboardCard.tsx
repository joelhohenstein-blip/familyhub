import React from 'react';
import { Card } from '~/components/ui/card';
import { Trophy, Medal } from 'lucide-react';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  score: number;
}

export interface LeaderboardCardProps {
  title: string;
  entries: LeaderboardEntry[];
  period?: 'all-time' | 'monthly' | 'weekly';
}

/**
 * Leaderboard Display Component
 * Shows rankings with medal icons for top 3
 */
export const LeaderboardCard = React.memo(function LeaderboardCard({
  title,
  entries,
  period = 'all-time',
}: LeaderboardCardProps) {
  const getMedalIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'weekly':
        return 'This Week';
      case 'monthly':
        return 'This Month';
      default:
        return 'All Time';
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          {title}
        </h3>
        <p className="text-sm text-gray-500">{getPeriodLabel()}</p>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No scores yet. Play to get on the leaderboard!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={`${entry.userId}-${entry.rank}`}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                {/* Rank with Medal */}
                <div className="w-8 text-center font-bold">
                  {getMedalIcon(entry.rank) || (
                    <span className="text-gray-500">{entry.rank}</span>
                  )}
                </div>

                {/* Player Info */}
                <div className="flex-1">
                  {entry.avatar && (
                    <img
                      src={entry.avatar}
                      alt={entry.firstName}
                      className="w-8 h-8 rounded-full inline-block mr-2"
                    />
                  )}
                  <span className="font-medium">
                    {entry.firstName} {entry.lastName}
                  </span>
                </div>
              </div>

              {/* Score */}
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">
                  {entry.score.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">points</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
});

LeaderboardCard.displayName = 'LeaderboardCard';
