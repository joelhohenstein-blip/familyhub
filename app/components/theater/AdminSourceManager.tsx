import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { X, Plus, GripVertical, Trash2 } from 'lucide-react';
import { trpc } from '~/utils/trpc';
import { type StreamingSource } from '~/db/schema/streaming';

interface AdminSourceManagerProps {
  onClose: () => void;
  onSourceAdded: (source: StreamingSource) => void;
  onSourceRemoved: (sourceId: string) => void;
  onSourcesReordered: (sourceIds: string[]) => void;
  sources: StreamingSource[];
}

type SourceType = 'pluto' | 'tubi' | 'roku' | 'freeview' | 'custom';

export function AdminSourceManager({
  onClose,
  onSourceAdded,
  onSourceRemoved,
  onSourcesReordered,
  sources,
}: AdminSourceManagerProps) {
  const [activeTab, setActiveTab] = useState<'add' | 'manage'>('add');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [sortedSources, setSortedSources] = useState(sources);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    embedCode: '',
    type: 'custom' as SourceType,
    genre: '',
    ageRating: '0',
    description: '',
    thumbnail: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mutations
  const addSourceMutation = trpc.streaming.addSource.useMutation({
    onSuccess: (newSource: any) => {
      onSourceAdded(newSource);
      // Reset form
      setFormData({
        name: '',
        url: '',
        embedCode: '',
        type: 'custom',
        genre: '',
        ageRating: '0',
        description: '',
        thumbnail: '',
      });
      setErrors({});
      alert('Source added successfully!');
      setIsSubmitting(false);
    },
    onError: (error) => {
      alert(error.message || 'Failed to add source');
      setIsSubmitting(false);
    },
  });

  const removeSourceMutation = trpc.streaming.removeSource.useMutation({
    onSuccess: (_, { sourceId }) => {
      setSortedSources(sortedSources.filter((s) => s.id !== sourceId));
      onSourceRemoved(sourceId);
      alert('Source removed successfully!');
    },
    onError: (error) => {
      alert('Failed to remove source');
    },
  });

  const reorderSourcesMutation = trpc.streaming.reorderSources.useMutation({
    onSuccess: () => {
      // Success - Pusher will broadcast the update
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Source name is required';
    }

    if (!formData.url && !formData.embedCode) {
      newErrors.url = 'Either URL or embed code is required';
    }

    if (formData.url && !isValidUrl(formData.url)) {
      newErrors.url = 'Invalid URL format';
    }

    if (formData.thumbnail && !isValidUrl(formData.thumbnail)) {
      newErrors.thumbnail = 'Invalid thumbnail URL format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    await addSourceMutation.mutateAsync({
      name: formData.name,
      url: formData.url || undefined,
      embedCode: formData.embedCode || undefined,
      type: formData.type,
      genre: formData.genre || undefined,
      ageRating: parseInt(formData.ageRating),
      description: formData.description || undefined,
      thumbnail: formData.thumbnail || undefined,
    });
  };

  const handleDragStart = (id: string) => {
    setDraggedItem(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedItem || draggedItem === targetId) return;

    const newOrder = [...sortedSources];
    const draggedIndex = newOrder.findIndex((s) => s.id === draggedItem);
    const targetIndex = newOrder.findIndex((s) => s.id === targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      [newOrder[draggedIndex], newOrder[targetIndex]] = [
        newOrder[targetIndex],
        newOrder[draggedIndex],
      ];

      setSortedSources(newOrder);
      reorderSourcesMutation.mutate({
        sourceIds: newOrder.map((s) => s.id),
      });
      onSourcesReordered(newOrder.map((s) => s.id));
    }

    setDraggedItem(null);
  };

  const handleRemoveSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to remove this source?')) return;

    await removeSourceMutation.mutateAsync({ sourceId });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 border-b border-slate-700 bg-slate-900 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Manage Streaming Sources</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-700 px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('add')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'add'
                  ? 'border-b-2 border-purple-500 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Add Source
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'manage'
                  ? 'border-b-2 border-purple-500 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Manage Sources ({sources.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'add' ? (
            <form onSubmit={handleAddSource} className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">
                  Source Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Pluto TV"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`border-slate-700 bg-slate-800 text-white ${
                    errors.name ? 'border-red-500' : ''
                  }`}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type" className="text-white">
                  Source Type
                </Label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-800">
                    <SelectItem value="pluto">Pluto TV</SelectItem>
                    <SelectItem value="tubi">Tubi</SelectItem>
                    <SelectItem value="roku">Roku</SelectItem>
                    <SelectItem value="freeview">Freeview</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* URL */}
              <div className="space-y-2">
                <Label htmlFor="url" className="text-white">
                  URL (or Embed Code)
                </Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className={`border-slate-700 bg-slate-800 text-white ${
                    errors.url ? 'border-red-500' : ''
                  }`}
                />
                {errors.url && <p className="text-sm text-red-500">{errors.url}</p>}
              </div>

              {/* Embed Code */}
              <div className="space-y-2">
                <Label htmlFor="embedCode" className="text-white">
                  Embed Code (Optional)
                </Label>
                <Textarea
                  id="embedCode"
                  placeholder="<iframe src='...'></iframe>"
                  value={formData.embedCode}
                  onChange={(e) => setFormData({ ...formData, embedCode: e.target.value })}
                  className="border-slate-700 bg-slate-800 text-white"
                  rows={3}
                />
              </div>

              {/* Genre & Age Rating */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="genre" className="text-white">
                    Genre (Optional)
                  </Label>
                  <Input
                    id="genre"
                    type="text"
                    placeholder="e.g., Movies, News"
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    className="border-slate-700 bg-slate-800 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ageRating" className="text-white">
                    Age Rating
                  </Label>
                  <Select
                    value={formData.ageRating}
                    onValueChange={(value: any) => setFormData({ ...formData, ageRating: value })}
                  >
                    <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-800">
                      <SelectItem value="0">All Ages</SelectItem>
                      <SelectItem value="13">13+</SelectItem>
                      <SelectItem value="16">16+</SelectItem>
                      <SelectItem value="18">18+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-white">
                  Description (Optional)
                </Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the source"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="border-slate-700 bg-slate-800 text-white"
                  rows={2}
                />
              </div>

              {/* Thumbnail */}
              <div className="space-y-2">
                <Label htmlFor="thumbnail" className="text-white">
                  Thumbnail URL (Optional)
                </Label>
                <Input
                  id="thumbnail"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={formData.thumbnail}
                  onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                  className={`border-slate-700 bg-slate-800 text-white ${
                    errors.thumbnail ? 'border-red-500' : ''
                  }`}
                />
                {errors.thumbnail && <p className="text-sm text-red-500">{errors.thumbnail}</p>}
              </div>

              {/* Submit Button */}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || addSourceMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isSubmitting || addSourceMutation.isPending ? 'Adding...' : 'Add Source'}
                </Button>
                <Button
                  type="button"
                  onClick={onClose}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {sortedSources.length === 0 ? (
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-8 text-center">
                  <p className="text-slate-400">No sources to manage. Add one first!</p>
                </div>
              ) : (
                sortedSources.map((source) => (
                  <div
                    key={source.id}
                    draggable
                    onDragStart={() => handleDragStart(source.id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(source.id)}
                    className={`flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 p-4 transition-all ${
                      draggedItem === source.id ? 'opacity-50' : ''
                    } cursor-move hover:border-slate-600`}
                  >
                    <GripVertical className="h-5 w-5 text-slate-500" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">{source.name}</h4>
                      <p className="text-sm text-slate-400">
                        {source.type.toUpperCase()}
                        {source.genre && ` • ${source.genre}`}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleRemoveSource(source.id)}
                      variant="outline"
                      size="sm"
                      className="border-red-900/50 text-red-400 hover:bg-red-900/20"
                      disabled={removeSourceMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 bg-slate-800 px-6 py-4">
          <p className="text-sm text-slate-400">
            {activeTab === 'add'
              ? 'Add new streaming sources to your theater'
              : 'Drag to reorder sources, or click remove to delete'}
          </p>
        </div>
      </div>
    </div>
  );
}
