import React from "react";
import { Badge } from "../ui/badge";

interface ReactionBadgesProps {
  reactionsCount: Record<string, number>;
  onBadgeClick?: () => void;
  className?: string;
}

export const ReactionBadges: React.FC<ReactionBadgesProps> = ({
  reactionsCount,
  onBadgeClick,
  className = "",
}) => {
  if (!reactionsCount || Object.keys(reactionsCount).length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1.5 mt-2 ${className}`}>
      {Object.entries(reactionsCount).map(([emoji, count]) => (
        <Badge
          key={emoji}
          variant="secondary"
          className="cursor-pointer hover:bg-secondary/80 transition-colors text-xs px-2 py-0.5 gap-1 flex items-center"
          onClick={onBadgeClick}
          title={`${count} reaction${count > 1 ? "s" : ""}`}
        >
          <span>{emoji}</span>
          <span className="text-xs font-semibold">{count}</span>
        </Badge>
      ))}
    </div>
  );
};

export default ReactionBadges;
