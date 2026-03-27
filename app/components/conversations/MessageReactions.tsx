import React, { useState, useCallback } from "react";
import { EmojiPickerComponent } from "../ui/emoji-picker";
import { ReactionBadges } from "./ReactionBadges";
import { ReactionSummaryModal } from "./ReactionSummaryModal";
import { trpc } from "~/utils/trpc";

interface MessageReactionsProps {
  messageId: string;
  reactionsCount: Record<string, number>;
  onReactionsUpdated?: (reactions: Record<string, number>) => void;
  className?: string;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactionsCount,
  onReactionsUpdated,
  className = "",
}) => {
  const [isReactionSummaryOpen, setIsReactionSummaryOpen] = useState(false);
  const [localReactionsCount, setLocalReactionsCount] =
    useState(reactionsCount);

  const addReactionMutation = trpc.reactions.addReaction.useMutation({
    onSuccess: (_: any, variables: any) => {
      // Optimistically update UI
      setLocalReactionsCount((prev) => ({
        ...prev,
        [variables.emoji]: (prev[variables.emoji] || 0) + 1,
      }));
      onReactionsUpdated?.(localReactionsCount);
    },
    onError: (error: any) => {
      console.error("Failed to add reaction:", error);
    },
  });

  const removeReactionMutation = trpc.reactions.removeReaction.useMutation({
    onSuccess: (_: any, variables: any) => {
      // Optimistically update UI
      setLocalReactionsCount((prev) => {
        const updated = { ...prev };
        if (updated[variables.emoji] > 1) {
          updated[variables.emoji]--;
        } else {
          delete updated[variables.emoji];
        }
        return updated;
      });
      onReactionsUpdated?.(localReactionsCount);
    },
    onError: (error: any) => {
      console.error("Failed to remove reaction:", error);
    },
  });

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      // Check if user already reacted with this emoji
      if (localReactionsCount[emoji]) {
        // Remove the reaction
        removeReactionMutation.mutate({ messageId, emoji });
      } else {
        // Add the reaction
        addReactionMutation.mutate({ messageId, emoji });
      }
    },
    [messageId, localReactionsCount, addReactionMutation, removeReactionMutation]
  );

  // Update local state when prop changes
  React.useEffect(() => {
    setLocalReactionsCount(reactionsCount);
  }, [reactionsCount]);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-1">
        <ReactionBadges
          reactionsCount={localReactionsCount}
          onBadgeClick={() => setIsReactionSummaryOpen(true)}
          className="flex-1"
        />
        <EmojiPickerComponent
          onEmojiSelect={handleEmojiSelect}
          triggerClassName="h-7 w-7 p-0"
        />
      </div>

      <ReactionSummaryModal
        isOpen={isReactionSummaryOpen}
        onOpenChange={setIsReactionSummaryOpen}
        messageId={messageId}
        reactionsCount={localReactionsCount}
      />
    </div>
  );
};

export default MessageReactions;
