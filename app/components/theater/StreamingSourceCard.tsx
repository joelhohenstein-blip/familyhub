import { Button } from '~/components/ui/button';
import { Lock, Trash2, Play } from 'lucide-react';
import { type StreamingSource } from '~/db/schema/streaming';
import { trpc } from '~/utils/trpc';
import { useState } from "react";

interface StreamingSourceCardProps {
  source: StreamingSource & { isRestricted?: boolean };
  onSelect: () => void;
  onRemove: () => void;
  isAdmin: boolean;
}

export function StreamingSourceCard({
  source,
  onSelect,
  onRemove,
  isAdmin,
}: StreamingSourceCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const removeSourceMutation = trpc.streaming.removeSource.useMutation({
    onSuccess: () => {
      onRemove();
    },
    onError: (error) => {
      console.error("Failed to remove source:", error);
      alert("Failed to remove source");
    },
  });

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to remove "${source.name}"?`)) return;

    setIsDeleting(true);
    await removeSourceMutation.mutateAsync({ sourceId: source.id });
    setIsDeleting(false);
  };

  const getAgeRatingLabel = (rating: number | null | undefined) => {
    if (!rating) return "All Ages";
    if (rating === 13) return "13+";
    if (rating === 16) return "16+";
    if (rating === 18) return "18+";
    return `${rating}+`;
  };

  return (
    <div className="group relative overflow-hidden rounded-lg border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 transition-all duration-300 hover:border-slate-600 hover:shadow-lg hover:shadow-purple-500/20">
      {/* Thumbnail */}
      <div className="relative h-40 w-full overflow-hidden bg-slate-700 sm:h-48">
        {source.thumbnail ? (
          <img
            src={source.thumbnail}
            alt={source.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
            <svg
              className="h-12 w-12 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <Button
            onClick={onSelect}
            disabled={source.isRestricted}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-600 disabled:to-slate-600"
          >
            <Play className="h-4 w-4" />
            Watch Now
          </Button>
        </div>

        {/* Parental Lock Badge */}
        {source.isRestricted && (
          <div className="absolute right-2 top-2 rounded-lg bg-red-500/90 px-2 py-1 backdrop-blur-sm">
            <div className="flex items-center gap-1">
              <Lock className="h-4 w-4 text-white" />
              <span className="text-xs font-semibold text-white">Restricted</span>
            </div>
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute left-2 top-2 rounded-lg bg-slate-900/80 px-2 py-1 backdrop-blur-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {source.type}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="line-clamp-1 text-lg font-bold text-white">{source.name}</h3>

        {source.description && (
          <p className="mb-3 line-clamp-2 text-sm text-slate-400">{source.description}</p>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          {source.genre && (
            <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
              {source.genre}
            </span>
          )}
          <span className="rounded-full bg-purple-900/50 px-3 py-1 text-xs font-medium text-purple-300">
            {getAgeRatingLabel(source.ageRating)}
          </span>
        </div>

        {/* Admin Actions */}
        {isAdmin && (
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            variant="outline"
            size="sm"
            className="w-full border-red-900/50 text-red-400 hover:bg-red-900/20 hover:text-red-300"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? "Removing..." : "Remove"}
          </Button>
        )}
      </div>

      {/* Glow Effect */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-purple-500/0 via-transparent to-pink-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-50" />
    </div>
  );
}
