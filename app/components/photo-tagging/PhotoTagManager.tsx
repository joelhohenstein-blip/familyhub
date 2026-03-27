import React, { useEffect, useState } from 'react';
import { Wand2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { PhotoTagEditor } from './PhotoTagEditor';
import { usePhotoTags } from '~/hooks/usePhotoTags';

interface PhotoTagManagerProps {
  mediaId: string;
  familyId: string;
  photoUrl: string;
  initialTags?: string[];
  onTagsUpdated?: (tags: string[]) => void;
}

/**
 * UI component for managing tags on a photo
 * Displays existing tags, allows manual editing, and provides auto-tagging via Vision API
 */
export function PhotoTagManager({
  mediaId,
  familyId,
  photoUrl,
  initialTags = [],
  onTagsUpdated,
}: PhotoTagManagerProps) {
  const { tags, isLoading, error, getTags, autoTagPhoto, addTags, removeTags } = usePhotoTags();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editedTags, setEditedTags] = useState<string[]>(initialTags);
  const [isAutoTagging, setIsAutoTagging] = useState(false);
  const [autoTagError, setAutoTagError] = useState<string | null>(null);

  // Load tags when component mounts or mediaId changes
  useEffect(() => {
    if (isDialogOpen) {
      loadTags();
    }
  }, [mediaId, isDialogOpen]);

  const loadTags = async () => {
    try {
      await getTags(mediaId);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  const handleAutoTag = async () => {
    setIsAutoTagging(true);
    setAutoTagError(null);

    try {
      const newTags = await autoTagPhoto(mediaId, photoUrl);
      setEditedTags(newTags);
      onTagsUpdated?.(newTags);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to auto-tag photo';
      setAutoTagError(errorMessage);
      console.error('Auto-tagging error:', err);
    } finally {
      setIsAutoTagging(false);
    }
  };

  const handleSaveTags = async () => {
    try {
      await addTags(mediaId, editedTags);
      setIsDialogOpen(false);
      onTagsUpdated?.(editedTags);
    } catch (err) {
      console.error('Failed to save tags:', err);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setEditedTags(newTags);

    try {
      await removeTags(mediaId, [tagToRemove]);
      onTagsUpdated?.(newTags);
    } catch (err) {
      console.error('Failed to remove tag:', err);
      // Revert the change
      setEditedTags(tags);
    }
  };

  return (
    <>
      {/* Display existing tags */}
      <div className="space-y-2">
        {tags.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Tags</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="flex items-center gap-2 cursor-pointer hover:bg-secondary/80"
                  onClick={() => handleRemoveTag(tag)}
                >
                  {tag}
                  <span className="text-xs">✕</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {tags.length === 0 && !isDialogOpen && (
          <p className="text-sm text-muted-foreground italic">No tags yet</p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDialogOpen(true)}
        >
          {tags.length > 0 ? 'Edit Tags' : 'Add Tags'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleAutoTag}
          disabled={isAutoTagging}
          className="gap-2"
        >
          {isAutoTagging ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Tagging...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Auto Tag
            </>
          )}
        </Button>
      </div>

      {/* Auto-tag error alert */}
      {autoTagError && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{autoTagError}</AlertDescription>
        </Alert>
      )}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage Photo Tags</DialogTitle>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <PhotoTagEditor
              initialTags={editedTags}
              onChange={setEditedTags}
              maxTags={10}
              maxTagLength={50}
            />

            {editedTags.length === 0 && tags.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tags yet. Add tags manually or use Auto Tag to generate them.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setEditedTags(tags);
              }}
            >
              Cancel
            </Button>

            <Button
              onClick={handleSaveTags}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Tags'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
