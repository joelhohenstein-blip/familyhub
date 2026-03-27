import { useState, useCallback } from 'react';
import { trpc } from '~/utils/trpc';

/**
 * Custom hook for managing photo tags
 * Provides functions to fetch, auto-tag, add, and remove tags from photos
 */
export function usePhotoTags() {
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // tRPC mutations and queries
  const autoTagMutation = trpc.photoTags.autoTagPhoto.useMutation();
  const updateTagsMutation = trpc.photoTags.updateTags.useMutation();
  const deleteTagsMutation = trpc.photoTags.deleteTags.useMutation();

  /**
   * Fetch existing tags for a media item
   */
  const getTags = useCallback(async (mediaId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Tags are loaded when viewing a photo and initialized with existing tags from the component
      // This callback is a placeholder for manual fetch if needed
      setTags([]);
      return [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tags';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Auto-tag a photo using Vision API
   */
  const autoTagPhoto = useCallback(async (mediaId: string, photoUrl: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await autoTagMutation.mutateAsync({ mediaId, photoUrl });
      setTags(result.tags);
      return result.tags;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to auto-tag photo';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [autoTagMutation]);

  /**
   * Add or update tags for a photo
   */
  const addTags = useCallback(async (mediaId: string, newTags: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      // Combine existing and new tags, removing duplicates
      const combinedTags = [...new Set([...tags, ...newTags])];
      const result = await updateTagsMutation.mutateAsync({
        mediaId,
        tags: combinedTags,
      });
      setTags(result.tags);
      return result.tags;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add tags';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [tags, updateTagsMutation]);

  /**
   * Remove tags from a photo
   */
  const removeTags = useCallback(async (mediaId: string, tagsToRemove: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await deleteTagsMutation.mutateAsync({
        mediaId,
        tagTexts: tagsToRemove.map(tag => tag.toLowerCase()),
      });
      setTags(result.remainingTags);
      return result.remainingTags;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove tags';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [deleteTagsMutation]);

  return {
    tags,
    isLoading,
    error,
    getTags,
    autoTagPhoto,
    addTags,
    removeTags,
  };
}
