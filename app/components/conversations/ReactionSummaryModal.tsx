import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { trpc } from "~/utils/trpc";
import { Loader2 } from "lucide-react";

interface ReactionSummaryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string;
  reactionsCount: Record<string, number>;
}

export const ReactionSummaryModal: React.FC<ReactionSummaryModalProps> = ({
  isOpen,
  onOpenChange,
  messageId,
  reactionsCount,
}) => {
  const { data: reactionsData, isLoading } = trpc.reactions.getReactions.useQuery(
    { messageId },
    {
      enabled: isOpen,
    }
  );

  const sortedEmojis = Object.entries(reactionsCount).sort(
    ([, countA], [, countB]) => countB - countA
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reactions</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          </div>
        ) : sortedEmojis.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No reactions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedEmojis.map(([emoji, count]) => (
              <div
                key={emoji}
                className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{emoji}</span>
                  <div>
                    <p className="font-medium text-sm">
                      {reactionsData?.reactionsByEmoji[emoji]?.users?.length || count} {count === 1 ? "person" : "people"}
                    </p>
                    <p className="text-xs text-gray-500">reacted</p>
                  </div>
                </div>
                <Badge variant="outline">{count}</Badge>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-500 text-center pt-2 border-t">
          Total reactions: {Object.values(reactionsCount).reduce((a, b) => a + b, 0)}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReactionSummaryModal;
