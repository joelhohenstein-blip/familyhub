import React, { useState } from 'react';
import { trpc } from '~/utils/trpc';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Loader2, Calendar } from 'lucide-react';
import { useToast } from '~/hooks/use-toast';

interface CreateEventFormProps {
  familyId: string;
  onSuccess?: () => void;
}

export const CreateEventForm: React.FC<CreateEventFormProps> = ({
  familyId,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    visibility: 'family' as 'public' | 'family' | 'private',
  });

  const createEventMutation = trpc.calendarEvents.createEvent.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Event title is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      toast({
        title: 'Error',
        description: 'Start and end times are required',
        variant: 'destructive',
      });
      return;
    }

    const startDate = new Date(formData.startTime);
    const endDate = new Date(formData.endTime);

    if (endDate <= startDate) {
      toast({
        title: 'Error',
        description: 'End time must be after start time',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      await createEventMutation.mutateAsync({
        familyId,
        title: formData.title,
        description: formData.description || undefined,
        startTime: startDate,
        endTime: endDate,
        location: formData.location || undefined,
        visibility: formData.visibility,
      });

      toast({
        title: 'Success',
        description: 'Event created successfully',
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        location: '',
        visibility: 'family',
      });

      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create event',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Event Title *
        </label>
        <Input
          type="text"
          placeholder="e.g., Family Dinner Night"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          disabled={isLoading}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <Textarea
          placeholder="Add details about the event..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          disabled={isLoading}
          rows={3}
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location
        </label>
        <Input
          type="text"
          placeholder="e.g., Living Room or Park"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          disabled={isLoading}
        />
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date & Time *
          </label>
          <Input
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            disabled={isLoading}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date & Time *
          </label>
          <Input
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            disabled={isLoading}
            required
          />
        </div>
      </div>

      {/* Visibility */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Visibility
        </label>
        <Select
          value={formData.visibility}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              visibility: value as 'public' | 'family' | 'private',
            })
          }
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">Private (Only me)</SelectItem>
            <SelectItem value="family">Family (Family members only)</SelectItem>
            <SelectItem value="public">Public (Everyone)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Submit Button */}
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4" />
              Create Event
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
