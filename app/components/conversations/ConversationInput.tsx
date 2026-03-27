import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { trpc } from '~/utils/trpc';
import { useTypingIndicators } from '~/hooks/useTypingIndicators';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { EmojiPickerComponent } from '~/components/ui/emoji-picker';

interface ConversationInputProps {
  conversationId: string;
  onMessageSent?: () => void;
}

export const ConversationInput: React.FC<ConversationInputProps> = ({
  conversationId,
  onMessageSent,
}) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Typing indicators hook
  const { setIsTyping, clearTyping } = useTypingIndicators({
    conversationId,
    debounceMs: 500,
  });

  const sendMessageMutation = trpc.conversations.sendMessage.useMutation({
    onSuccess: () => {
      setMessage('');
      setError(null);
      clearTyping(); // Clear typing indicator when message is sent
      onMessageSent?.();
      inputRef.current?.focus();
    },
    onError: (err) => {
      setError(err.message || 'Failed to send message');
    },
  });

  // Cleanup typing indicator on unmount
  useEffect(() => {
    return () => {
      clearTyping();
    };
  }, [clearTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError('Message cannot be empty');
      return;
    }

    if (trimmedMessage.length > 5000) {
      setError('Message must be less than 5000 characters');
      return;
    }

    setIsLoading(true);
    try {
      await sendMessageMutation.mutateAsync({
        conversationId,
        content: trimmedMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const newMessage = message + emoji;
    setMessage(newMessage);
    inputRef.current?.focus();
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-2">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            // Signal typing to other users
            if (e.target.value.length > 0) {
              setIsTyping();
            }
          }}
          onBlur={clearTyping}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          maxLength={5000}
          className="flex-1"
        />
        <EmojiPickerComponent
          onEmojiSelect={handleEmojiSelect}
          triggerClassName="h-10 w-10 p-0"
        />
        <Button
          type="submit"
          disabled={isLoading || !message.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>

      <p className="text-xs text-gray-500 text-right">
        {message.length}/5000
      </p>
    </div>
  );
};
