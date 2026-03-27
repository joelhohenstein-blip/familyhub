import React, { useState } from 'react';
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
import { Checkbox } from '~/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { trpc } from '~/utils/trpc';

interface CreateAnnouncementFormProps {
  familyId: string;
  onSuccess?: () => void;
}

export function CreateAnnouncementForm({
  familyId,
  onSuccess,
}: CreateAnnouncementFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'family_news' as const,
    isPinned: false,
    priority: 0,
  });

  const createMutation = trpc.announcements.create.useMutation({
    onSuccess: () => {
      setFormData({
        title: '',
        content: '',
        category: 'family_news',
        isPinned: false,
        priority: 0,
      });
      onSuccess?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      familyId,
      ...formData,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-base font-semibold">
          Announcement Title
        </Label>
        <Input
          id="title"
          placeholder="e.g., Family Reunion Scheduled"
          value={formData.title}
          onChange={(e) =>
            setFormData({ ...formData, title: e.target.value })
          }
          required
          disabled={createMutation.isPending}
        />
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="content" className="text-base font-semibold">
          Message
        </Label>
        <Textarea
          id="content"
          placeholder="Share your announcement with your family..."
          value={formData.content}
          onChange={(e) =>
            setFormData({ ...formData, content: e.target.value })
          }
          required
          rows={6}
          disabled={createMutation.isPending}
          className="resize-none"
        />
        <p className="text-sm text-gray-500">
          {formData.content.length}/1000 characters
        </p>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category" className="text-base font-semibold">
          Category
        </Label>
        <Select
          value={formData.category}
          onValueChange={(value: any) =>
            setFormData({ ...formData, category: value })
          }
          disabled={createMutation.isPending}
        >
          <SelectTrigger id="category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="family_news">📰 Family News</SelectItem>
            <SelectItem value="events">📅 Events</SelectItem>
            <SelectItem value="reminders">🔔 Reminders</SelectItem>
            <SelectItem value="important">⚠️ Important</SelectItem>
            <SelectItem value="milestones">🎉 Milestones</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Priority and Pin */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority" className="text-base font-semibold">
            Priority
          </Label>
          <Select
            value={formData.priority.toString()}
            onValueChange={(value) =>
              setFormData({ ...formData, priority: parseInt(value) })
            }
            disabled={createMutation.isPending}
          >
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Normal</SelectItem>
              <SelectItem value="1">High</SelectItem>
              <SelectItem value="2">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="pinned"
              checked={formData.isPinned}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isPinned: checked as boolean })
              }
              disabled={createMutation.isPending}
            />
            <Label
              htmlFor="pinned"
              className="text-sm font-medium cursor-pointer"
            >
              📌 Pin to top
            </Label>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={
          createMutation.isPending || !formData.title || !formData.content
        }
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {createMutation.isPending && (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        )}
        {createMutation.isPending ? 'Creating...' : 'Create Announcement'}
      </Button>

      {createMutation.isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {createMutation.error?.message || 'Failed to create announcement'}
        </div>
      )}

      {createMutation.isSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
          Announcement created successfully!
        </div>
      )}
    </form>
  );
}
