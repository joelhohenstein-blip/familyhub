import React, { useState } from "react";
import EmojiPicker from "emoji-picker-react";
import { EmojiClickData } from "emoji-picker-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { Smile } from "lucide-react";

interface EmojiPickerComponentProps {
  onEmojiSelect: (emoji: string) => void;
  triggerClassName?: string;
  contentClassName?: string;
  showRecentlyUsed?: boolean;
  searchEnabled?: boolean;
}

export const EmojiPickerComponent: React.FC<EmojiPickerComponentProps> = ({
  onEmojiSelect,
  triggerClassName = "",
  contentClassName = "",
  showRecentlyUsed = true,
  searchEnabled = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("recentlyUsedEmojis");
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const emoji = emojiData.emoji;
    onEmojiSelect(emoji);

    // Update recently used emojis
    const updated = [
      emoji,
      ...recentlyUsed.filter((e) => e !== emoji),
    ].slice(0, 12);
    setRecentlyUsed(updated);
    localStorage.setItem("recentlyUsedEmojis", JSON.stringify(updated));

    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={triggerClassName}
          title="Add emoji"
        >
          <Smile className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={`w-80 p-0 border-0 ${contentClassName}`}
        align="end"
      >
        <div className="rounded-lg overflow-hidden">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            autoFocusSearch={searchEnabled}
            previewConfig={{
              showPreview: false,
            }}
            searchPlaceHolder={searchEnabled ? "Search emojis..." : undefined}
            height={350}
            width="100%"
            lazyLoadEmojis={true}
          />
        </div>

        {showRecentlyUsed && recentlyUsed.length > 0 && (
          <div className="border-t p-3 bg-white">
            <p className="text-xs font-semibold text-gray-600 mb-2 dark:text-gray-400">
              Recently Used
            </p>
            <div className="flex flex-wrap gap-1">
              {recentlyUsed.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick({ emoji } as EmojiClickData)}
                  className="text-xl hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-1 cursor-pointer transition-colors"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPickerComponent;
