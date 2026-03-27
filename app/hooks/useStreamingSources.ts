import { useState, useEffect, useCallback } from 'react';
import { trpc } from '~/utils/trpc';
import { type StreamingSource } from '~/db/schema/streaming';

interface UseStreamingSourcesOptions {
  initialSearchTerm?: string;
  initialGenre?: string;
}

export function useStreamingSources(options: UseStreamingSourcesOptions = {}) {
  const [searchTerm, setSearchTerm] = useState(options.initialSearchTerm || '');
  const [genre, setGenre] = useState(options.initialGenre || '');

  // Query with current filters
  const sourcesQuery = trpc.streaming.getSources.useQuery({
    searchTerm,
    genre,
    availability: 'all',
  });

  const sources = sourcesQuery.data || [];
  const loading = sourcesQuery.isLoading;
  const error = sourcesQuery.error;

  const handleSearchChange = useCallback((newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
  }, []);

  const handleGenreChange = useCallback((newGenre: string) => {
    setGenre(newGenre);
  }, []);

  return {
    sources,
    searchTerm,
    genre,
    loading,
    error,
    setSearchTerm: handleSearchChange,
    setGenre: handleGenreChange,
    refetch: sourcesQuery.refetch,
  };
}
