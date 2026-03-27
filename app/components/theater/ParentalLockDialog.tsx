import { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { X, Lock } from 'lucide-react';
import { trpc } from '~/utils/trpc';
import { type StreamingSource } from '~/db/schema/streaming';

interface ParentalLockDialogProps {
  onClose: () => void;
  sources: StreamingSource[];
}

export function ParentalLockDialog({ onClose, sources }: ParentalLockDialogProps) {
  const [lockType, setLockType] = useState<'global' | 'per-source'>('global');
  const [selectedSourceId, setSelectedSourceId] = useState(sources[0]?.id || '');
  const [minAgeRating, setMinAgeRating] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch existing locks
  const locksQuery = trpc.streaming.getParentalLocks.useQuery();

  // Set parental lock mutation
  const setLockMutation = trpc.streaming.setParentalLock.useMutation({
    onSuccess: () => {
      setMinAgeRating('0');
      alert('Parental lock set successfully!');
      locksQuery.refetch();
    },
    onError: (error) => {
      alert(error.message || 'Failed to set parental lock');
    },
  });

  const handleSetLock = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    await setLockMutation.mutateAsync({
      sourceId: lockType === 'per-source' ? selectedSourceId : undefined,
      minAgeRating: parseInt(minAgeRating),
      isGlobalLock: lockType === 'global',
    });
    setIsSubmitting(false);
  };

  const getSourceName = (sourceId: string | null) => {
    if (!sourceId) return 'All Sources';
    return sources.find((s) => s.id === sourceId)?.name || 'Unknown';
  };

  const getAgeRatingLabel = (rating: number) => {
    if (rating === 0) return 'All Ages';
    if (rating === 13) return '13+';
    if (rating === 16) return '16+';
    if (rating === 18) return '18+';
    return `${rating}+`;
  };

  const locks = locksQuery.data || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 border-b border-slate-700 bg-slate-900 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-900/50 p-2">
                <Lock className="h-5 w-5 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Parental Controls</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Set age-based restrictions for streaming sources
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Add New Lock Section */}
          <form onSubmit={handleSetLock} className="space-y-4 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <h3 className="text-lg font-semibold text-white">Add New Restriction</h3>

            {/* Lock Type Selection */}
            <div className="space-y-2">
              <Label className="text-white">Restriction Type</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="lockType"
                    value="global"
                    checked={lockType === 'global'}
                    onChange={(e) => setLockType(e.target.value as 'global' | 'per-source')}
                    className="h-4 w-4 accent-purple-500"
                  />
                  <span className="text-slate-300">Global (All Sources)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="lockType"
                    value="per-source"
                    checked={lockType === 'per-source'}
                    onChange={(e) => setLockType(e.target.value as 'global' | 'per-source')}
                    className="h-4 w-4 accent-purple-500"
                  />
                  <span className="text-slate-300">Per Source</span>
                </label>
              </div>
            </div>

            {/* Source Selection (if per-source) */}
            {lockType === 'per-source' && (
              <div className="space-y-2">
                <Label htmlFor="source" className="text-white">
                  Select Source
                </Label>
                <Select value={selectedSourceId} onValueChange={setSelectedSourceId}>
                  <SelectTrigger className="border-slate-700 bg-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-800">
                    {sources.map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Minimum Age Rating */}
            <div className="space-y-2">
              <Label htmlFor="minAge" className="text-white">
                Minimum Age Allowed
              </Label>
              <Select value={minAgeRating} onValueChange={setMinAgeRating}>
                <SelectTrigger className="border-slate-700 bg-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800">
                  <SelectItem value="0">All Ages</SelectItem>
                  <SelectItem value="13">13 Years Old (13+)</SelectItem>
                  <SelectItem value="16">16 Years Old (16+)</SelectItem>
                  <SelectItem value="18">18 Years Old (18+)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Only users age {minAgeRating === '0' ? 'any age' : minAgeRating + ' or older'} can access{' '}
                {lockType === 'global' ? 'all sources' : getSourceName(selectedSourceId)}
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || setLockMutation.isPending}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
            >
              <Lock className="mr-2 h-4 w-4" />
              {isSubmitting || setLockMutation.isPending ? 'Setting Restriction...' : 'Set Restriction'}
            </Button>
          </form>

          {/* Current Locks Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Current Restrictions</h3>

            {locksQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-slate-700 border-t-purple-500"></div>
              </div>
            ) : locks.length === 0 ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6 text-center">
                <Lock className="mx-auto mb-3 h-8 w-8 text-slate-600" />
                <p className="text-slate-400">No restrictions set yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {locks.map((lock) => (
                  <div
                    key={lock.id}
                    className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 p-4"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">
                        {lock.isGlobalLock ? 'Global Restriction' : getSourceName(lock.sourceId)}
                      </h4>
                      <p className="text-sm text-slate-400">
                        Minimum age: <span className="font-semibold">{getAgeRatingLabel(lock.minAgeRating)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-red-900/30 px-3 py-1">
                      <Lock className="h-4 w-4 text-red-400" />
                      <span className="text-xs font-semibold text-red-300">LOCKED</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Information Section */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <h4 className="mb-2 font-semibold text-white">How Parental Controls Work</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                <span><strong>Global Restrictions</strong> apply to all family members of a certain age</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                <span><strong>Per-Source Restrictions</strong> apply only to specific streaming sources</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                <span>Users below the minimum age will see a <strong>"Access Denied"</strong> message</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                <span>Restrictions persist across sessions and all devices</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 bg-slate-800 px-6 py-4">
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
