import { useState } from 'react';
import { z } from 'zod';
import { trpc } from '~/utils/trpc';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { 
  AlertCircle, 
  Check, 
  Loader2, 
  Calendar,
  Image,
  X
} from 'lucide-react';

// Validation schema
const highlightFormSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters'),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  date: z.string().min(1, 'Date is required'),
});

type HighlightFormData = z.infer<typeof highlightFormSchema>;

interface AddHighlightFormProps {
  familyId: string;
  onSuccess?: () => void;
}

export function AddHighlightForm({ familyId, onSuccess }: AddHighlightFormProps) {
  const [formData, setFormData] = useState<HighlightFormData>({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof HighlightFormData, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  const addHighlight = trpc.timeline.addHighlight.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setFormData({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setErrors({});
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSubmitted(false);
        onSuccess?.();
      }, 3000);
    },
    onError: (error) => {
      setErrors({
        title: error.message,
      });
    },
  });

  const handleInputChange = (
    field: keyof HighlightFormData,
    value: string | string[]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      // Validate form
      const validatedData = highlightFormSchema.parse(formData);

      // Submit
      await addHighlight.mutateAsync({
        familyId,
        title: validatedData.title,
        description: validatedData.description,
        date: new Date(validatedData.date),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof HighlightFormData, string>> = {};
        error.issues.forEach((err) => {
          const path = err.path[0] as keyof HighlightFormData;
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
      } else if (error instanceof Error) {
        setErrors({ title: error.message });
      }
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Add a New Highlight</h2>

      {submitted && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-green-700">Highlight added successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title Field */}
        <div>
          <Label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Enter highlight title..."
            maxLength={255}
            className={errors.title ? 'border-red-500' : ''}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">Max 255 characters</span>
            <span className="text-xs text-gray-400">{formData.title.length}/255</span>
          </div>
          {errors.title && (
            <div className="mt-2 flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {errors.title}
            </div>
          )}
        </div>

        {/* Date Field */}
        <div>
          <Label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
            Date <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className="pl-10"
            />
          </div>
          {errors.date && (
            <div className="mt-2 flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {errors.date}
            </div>
          )}
        </div>

        {/* Description Field */}
        <div>
          <Label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description <span className="text-gray-400 text-xs">(Optional)</span>
          </Label>
          <Textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Add a description for this highlight..."
            maxLength={2000}
            rows={5}
            className={errors.description ? 'border-red-500' : ''}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">Max 2000 characters</span>
            <span className="text-xs text-gray-400">
              {(formData.description || '').length}/2000
            </span>
          </div>
          {errors.description && (
            <div className="mt-2 flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {errors.description}
            </div>
          )}
        </div>

        {/* Media Upload Placeholder */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Media <span className="text-gray-400 text-xs">(Optional)</span>
          </Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition">
            <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              Media upload coming soon
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFormData({
                title: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
              });
              setErrors({});
            }}
            disabled={addHighlight.isPending}
          >
            Clear
          </Button>
          <Button
            type="submit"
            disabled={addHighlight.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {addHighlight.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Add Highlight
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
