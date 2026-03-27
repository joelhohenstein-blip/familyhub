import { useState, useCallback, useEffect } from 'react';
import { trpc } from '~/utils/trpc';

export type MediaType = 'image' | 'video' | 'all';

interface MediaFilters {
  type: MediaType;
}

interface UseMediaGalleryReturn {
  items: any[];
  albums: any[];
  gallery: any | null;
  loading: boolean;
  error: Error | null;
  filters: MediaFilters;
  hasMore: boolean;
  offset: number;
  
  // Actions
  setFilter: (type: MediaType) => void;
  uploadMedia: (
    galleryId: string,
    file: File,
    metadata?: { thumbnailUrl?: string; duration?: number }
  ) => Promise<any>;
  deleteMedia: (mediaId: string) => Promise<void>;
  moveMediaToAlbum: (mediaId: string, albumId: string | null) => Promise<void>;
  createAlbum: (
    galleryId: string,
    name: string,
    description?: string
  ) => Promise<any>;
  updateAlbumName: (albumId: string, name: string) => Promise<void>;
  loadMore: () => void;
  refetch: () => void;
}

/**
 * Custom hook for managing media gallery state and operations
 */
export function useMediaGallery(
  familyId: string,
  galleryId: string
): UseMediaGalleryReturn {
  const [filters, setFilters] = useState<MediaFilters>({ type: 'all' });
  const [items, setItems] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // tRPC mutations
  const uploadMediaMutation = trpc.media.uploadMedia.useMutation();
  const deleteMediaMutation = trpc.media.deleteMedia.useMutation();
  const moveMediaToAlbumMutation = trpc.media.moveMediaToAlbum.useMutation();
  const createAlbumMutation = trpc.media.createAlbum.useMutation();
  const updateAlbumNameMutation = trpc.media.updateAlbumName.useMutation();

  // tRPC queries
  const getMediaItemsQuery = trpc.media.getMediaItems.useQuery(
    {
      familyId,
      galleryId,
      type: filters.type,
      limit: 20,
      offset,
    },
    {
      enabled: !!familyId && !!galleryId,
    }
  );

  const getAlbumsQuery = trpc.media.getAlbums.useQuery(
    {
      familyId,
      galleryId,
    },
    {
      enabled: !!familyId && !!galleryId,
    }
  );

  // Update local state when queries change
  useEffect(() => {
    if (getMediaItemsQuery.data) {
      if (offset === 0) {
        setItems(getMediaItemsQuery.data.items);
      } else {
        setItems((prev) => [...prev, ...getMediaItemsQuery.data!.items]);
      }
      setHasMore(getMediaItemsQuery.data.hasMore);
    }
  }, [getMediaItemsQuery.data, offset]);

  useEffect(() => {
    if (getAlbumsQuery.data) {
      setAlbums(getAlbumsQuery.data);
    }
  }, [getAlbumsQuery.data]);

  // Sync loading and error states
  useEffect(() => {
    setLoading(getMediaItemsQuery.isLoading);
  }, [getMediaItemsQuery.isLoading]);

  useEffect(() => {
    if (getMediaItemsQuery.error) {
      setError(new Error(getMediaItemsQuery.error.message || 'Failed to load media'));
    }
  }, [getMediaItemsQuery.error]);

  // Filter change handler
  const setFilter = useCallback((type: MediaType) => {
    setFilters({ type });
    setOffset(0); // Reset pagination when filter changes
    setItems([]); // Clear items when filter changes
  }, []);

  // Upload media handler
  const uploadMedia = useCallback(
    async (
      gallId: string,
      file: File,
      metadata?: { thumbnailUrl?: string; duration?: number }
    ) => {
      try {
        // In a real implementation, you'd upload to S3 first
        // For now, we'll simulate it with a data URL
        const url = URL.createObjectURL(file);

        const result = await uploadMediaMutation.mutateAsync({
          familyId,
          galleryId: gallId,
          url,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          fileName: file.name,
          fileSize: file.size,
          duration: metadata?.duration,
          thumbnailUrl: metadata?.thumbnailUrl,
        });

        // Add to local items
        setItems((prev) => [result, ...prev]);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Upload failed'));
        throw err;
      }
    },
    [familyId, uploadMediaMutation]
  );

  // Delete media handler
  const deleteMedia = useCallback(
    async (mediaId: string) => {
      try {
        await deleteMediaMutation.mutateAsync({ mediaId });
        setItems((prev) => prev.filter((item) => item.id !== mediaId));
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Delete failed'));
        throw err;
      }
    },
    [deleteMediaMutation]
  );

  // Move media handler
  const moveMediaToAlbum = useCallback(
    async (mediaId: string, albumId: string | null) => {
      try {
        const result = await moveMediaToAlbumMutation.mutateAsync({
          mediaId,
          albumId,
        });

        // Update local items
        setItems((prev) =>
          prev.map((item) => (item.id === mediaId ? result : item))
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Move failed'));
        throw err;
      }
    },
    [moveMediaToAlbumMutation]
  );

  // Create album handler
  const createAlbum = useCallback(
    async (gallId: string, name: string, description?: string) => {
      try {
        const result = await createAlbumMutation.mutateAsync({
          familyId,
          galleryId: gallId,
          name,
          description,
        });

        // Add to local albums
        setAlbums((prev) => [result, ...prev]);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Album creation failed'));
        throw err;
      }
    },
    [familyId, createAlbumMutation]
  );

  // Update album name handler
  const updateAlbumName = useCallback(
    async (albumId: string, name: string) => {
      try {
        const result = await updateAlbumNameMutation.mutateAsync({
          albumId,
          name,
        });

        // Update local albums
        setAlbums((prev) =>
          prev.map((album) => (album.id === albumId ? result : album))
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Update failed'));
        throw err;
      }
    },
    [updateAlbumNameMutation]
  );

  // Load more handler (pagination)
  const loadMore = useCallback(() => {
    if (hasMore) {
      setOffset((prev) => prev + 20);
    }
  }, [hasMore]);

  // Refetch handler
  const refetch = useCallback(() => {
    setOffset(0);
    getMediaItemsQuery.refetch();
    getAlbumsQuery.refetch();
  }, [getMediaItemsQuery, getAlbumsQuery]);

  return {
    items,
    albums,
    gallery,
    loading,
    error,
    filters,
    hasMore,
    offset,
    setFilter,
    uploadMedia,
    deleteMedia,
    moveMediaToAlbum,
    createAlbum,
    updateAlbumName,
    loadMore,
    refetch,
  };
}
