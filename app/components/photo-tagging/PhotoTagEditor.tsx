import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';

interface PhotoTagEditorProps {
  initialTags?: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  maxTagLength?: number;
}

/**
 * Lightweight tag editor component for managing photo tags
 * Supports adding/removing tags with validation for duplicates and max length
 */
export function PhotoTagEditor({
  initialTags = [],
  onChange,
  maxTags = 10,
  maxTagLength = 50,
}: PhotoTagEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddTag = () => {
    const trimmedInput = inputValue.trim().toLowerCase();

    // Validate input
    if (!trimmedInput) {
      setError('Tag cannot be empty');
      return;
    }

    if (trimmedInput.length > maxTagLength) {
      setError(`Tag cannot exceed ${maxTagLength} characters`);
      return;
    }

    if (tags.includes(trimmedInput)) {
      setError('This tag already exists');
      return;
    }

    if (tags.length >= maxTags) {
      setError(`Maximum ${maxTags} tags allowed`);
      return;
    }

    // Add tag
    const newTags = [...tags, trimmedInput];
    setTags(newTags);
    onChange(newTags);
    setInputValue('');
    setError(null);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    onChange(newTags);
    setError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Add a tag and press Enter"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError(null);
          }}
          onKeyPress={handleKeyPress}
          maxLength={maxTagLength}
          className="text-sm"
        />
        <Button
          onClick={handleAddTag}
          size="sm"
          variant="outline"
          disabled={!inputValue.trim() || tags.length >= maxTags}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="flex items-center gap-1 cursor-pointer hover:bg-secondary/80"
              onClick={() => handleRemoveTag(tag)}
            >
              {tag}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}

      {tags.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {tags.length} / {maxTags} tags
        </p>
      )}
    </div>
  );
}
