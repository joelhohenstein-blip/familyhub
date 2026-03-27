import React from 'react';
import { Card } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Star, Lock } from 'lucide-react';

export interface Achievement {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  category: string;
  points: number;
  unlocked?: boolean;
  unlockedAt?: Date;
}

export interface AchievementGridProps {
  achievements: Achievement[];
  title?: string;
  showPoints?: boolean;
}

/**
 * Achievement Grid Display Component
 * Shows locked/unlocked achievements with badges
 */
export const AchievementGrid = React.memo(function AchievementGrid({
  achievements,
  title = 'Achievements',
  showPoints = true,
}: AchievementGridProps) {
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalPoints = achievements
    .filter(a => a.unlocked)
    .reduce((sum, a) => sum + a.points, 0);

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <div className="flex gap-4 text-sm">
          <div className="text-gray-600">
            <span className="font-semibold">{unlockedCount}</span> of{' '}
            <span className="font-semibold">{achievements.length}</span> unlocked
          </div>
          {showPoints && (
            <div className="text-gray-600">
              <span className="font-semibold">{totalPoints}</span> points earned
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`relative group ${!achievement.unlocked ? 'opacity-60' : ''}`}
          >
            <Card className={`p-4 text-center transition-all ${
              achievement.unlocked
                ? 'hover:shadow-lg bg-white'
                : 'bg-gray-50 grayscale'
            }`}>
              {/* Icon */}
              <div className="text-4xl mb-2 h-12 flex items-center justify-center">
                {achievement.icon || '⭐'}
              </div>

              {/* Lock Badge */}
              {!achievement.unlocked && (
                <div className="absolute top-2 right-2 bg-gray-400 rounded-full p-1">
                  <Lock className="w-3 h-3 text-white" />
                </div>
              )}

              {/* Name */}
              <h4 className="font-semibold text-sm mb-1 line-clamp-2">
                {achievement.name}
              </h4>

              {/* Points */}
              {showPoints && (
                <div className="flex items-center justify-center gap-1 text-xs text-yellow-600">
                  <Star className="w-3 h-3" />
                  {achievement.points} pts
                </div>
              )}

              {/* Unlocked Date */}
              {achievement.unlocked && achievement.unlockedAt && (
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(achievement.unlockedAt).toLocaleDateString()}
                </div>
              )}

              {/* Hover Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity">
                {achievement.description || achievement.name}
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
});

AchievementGrid.displayName = 'AchievementGrid';

/**
 * Individual Achievement Badge
 */
export const AchievementBadge = React.memo(function AchievementBadge({
  achievement,
  size = 'md',
}: {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'text-lg h-12 w-12',
    md: 'text-2xl h-16 w-16',
    lg: 'text-4xl h-24 w-24',
  };

  return (
    <div className="relative group">
      <div
        className={`${sizeClasses[size]} flex items-center justify-center bg-yellow-100 rounded-lg ${
          !achievement.unlocked ? 'grayscale opacity-50' : ''
        }`}
      >
        {achievement.icon || '⭐'}
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
        {achievement.name}
      </div>
    </div>
  );
});

AchievementBadge.displayName = 'AchievementBadge';
