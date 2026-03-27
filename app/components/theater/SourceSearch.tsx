import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { type StreamingSource } from '~/db/schema/streaming';

interface SourceSearchProps {
  onSearchChange: (term: string) => void;
  onGenreChange: (genre: string) => void;
  sources: StreamingSource[];
}

export function SourceSearch({ onSearchChange, onGenreChange, sources }: SourceSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Get unique genres from sources
  const genres = Array.from(
    new Set(sources.map((s) => s.genre).filter(Boolean))
  ) as string[];

  // Debounced search handler
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      onSearchChange(searchTerm);
    }, 300); // 300ms debounce

    setDebounceTimer(timer);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [searchTerm, onSearchChange]);

  const handleClearSearch = () => {
    setSearchTerm("");
    onSearchChange("");
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedGenre("");
    onSearchChange("");
    onGenreChange("");
  };

  const handleGenreChange = (genre: string) => {
    setSelectedGenre(genre);
    onGenreChange(genre);
  };

  const hasActiveFilters = searchTerm || selectedGenre;

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          <Search className="h-5 w-5" />
        </div>
        <Input
          type="text"
          placeholder="Search streaming sources..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-slate-700 bg-slate-800 pl-10 text-white placeholder-slate-500 focus:border-purple-500 focus:ring-purple-500/20"
        />
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Section */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Genre Filter */}
        <div className="flex-1 min-w-[200px]">
          <Select value={selectedGenre || "all"} onValueChange={(value) => handleGenreChange(value === "all" ? "" : value)}>
            <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
              <SelectValue placeholder="Filter by genre..." />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-800">
              <SelectItem value="all">All Genres</SelectItem>
              {genres.map((genre) => (
                <SelectItem key={genre} value={genre}>
                  {genre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            onClick={handleClearFilters}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            size="sm"
          >
            <X className="mr-1 h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-400">Active filters:</span>
            {searchTerm && (
              <div className="flex items-center gap-2 rounded-full bg-purple-900/30 px-3 py-1">
                <span className="text-slate-300">
                  Search: <span className="font-semibold text-white">"{searchTerm}"</span>
                </span>
                <button
                  onClick={handleClearSearch}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {selectedGenre && (
              <div className="flex items-center gap-2 rounded-full bg-blue-900/30 px-3 py-1">
                <span className="text-slate-300">
                  Genre: <span className="font-semibold text-white">{selectedGenre}</span>
                </span>
                <button
                  onClick={() => handleGenreChange("")}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
