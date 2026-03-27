import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useTypingIndicators } from '~/hooks/useTypingIndicators';

interface TypingIndicatorsProps {
  conversationId: string;
  className?: string;
  variant?: 'minimal' | 'expanded';
}

/**
 * Component to display typing indicators in conversations
 * Shows:
 * - Animated typing indicator
 * - Names of users currently typing
 * - Supports 1-on-1 and group conversations
 * - Handles multiple concurrent typers gracefully
 */
export const TypingIndicators: React.FC<TypingIndicatorsProps> = ({
  conversationId,
  className = '',
  variant = 'minimal',
}) => {
  const { typers, getTypingMessage, error } = useTypingIndicators({
    conversationId,
    debounceMs: 500,
  });

  // Only show if there are active typers
  if (typers.length === 0) {
    return null;
  }

  if (variant === 'minimal') {
    return <MinimalTypingIndicator message={getTypingMessage()} className={className} />;
  }

  return <ExpandedTypingIndicator typers={typers} message={getTypingMessage()} className={className} />;
};

/**
 * Minimal typing indicator - just the animated dots and message
 */
interface MinimalTypingIndicatorProps {
  message: string;
  className?: string;
}

const MinimalTypingIndicator: React.FC<MinimalTypingIndicatorProps> = ({
  message,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 text-gray-500 text-sm py-2 ${className}`}>
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="italic text-xs">{message}</span>
    </div>
  );
};

/**
 * Expanded typing indicator - shows user avatars and animated status
 */
interface ExpandedTypingIndicatorProps {
  typers: any[];
  message: string;
  className?: string;
}

const ExpandedTypingIndicator: React.FC<ExpandedTypingIndicatorProps> = ({
  typers,
  message,
  className = '',
}) => {
  const displayTypers = typers.slice(0, 3);
  const moreCount = Math.max(0, typers.length - 3);

  return (
    <div
      className={`bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-3 ${className}`}
    >
      {/* Animated typing indicator */}
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>

      {/* Typer info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900">{message}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex gap-1">
            {displayTypers.map((typer) => {
              const displayName = typer.userName
                ? typer.userName.split(' ')[0]
                : (typer.firstName || 'User');
              return (
                <span
                  key={typer.userId}
                  className="text-xs bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full"
                >
                  {displayName}
                </span>
              );
            })}
            {moreCount > 0 && (
              <span className="text-xs bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full">
                +{moreCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicators;
