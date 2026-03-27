import React, { useState, useRef } from 'react';
import { Send, AlertCircle, Loader2 } from 'lucide-react';
import { trpc } from '~/utils/trpc';
import { validateContent } from '~/utils/postValidation';
import { MediaUploadPreview } from './MediaUploadPreview';

interface CreatePostFormProps {
  familyId: string;
  onPostCreated?: () => void;
}

export const CreatePostForm: React.FC<CreatePostFormProps> = ({
  familyId,
  onPostCreated,
}) => {
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createPostMutation = trpc.posts.createPost.useMutation();
  const addMediaMutation = trpc.posts.addPostMedia.useMutation();

  const charCount = content.length;
  const charLimit = 5000;
  const remainingChars = charLimit - charCount;

  const handleMediaSelect = (file: File, type: 'image' | 'video') => {
    setSelectedFile(file);
    setMediaType(type);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleMediaRemove = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setMediaType(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate content
    const contentErrors = validateContent(content);
    if (contentErrors.length > 0) {
      setErrors(contentErrors.map((e) => e.message));
      return;
    }

    setErrors([]);
    setIsSubmitting(true);

    try {
      // Create the post
      const post = await createPostMutation.mutateAsync({
        familyId,
        content: content.trim(),
      });

      // Add media if selected
      if (selectedFile && mediaType && previewUrl) {
        try {
          await addMediaMutation.mutateAsync({
            postId: post.id,
            url: previewUrl,
            type: mediaType,
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
          });
        } catch (mediaError) {
          console.error('Error adding media:', mediaError);
          // Continue - media error shouldn't block the post
        }
      }

      // Reset form
      setContent('');
      handleMediaRemove();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      // Callback
      onPostCreated?.();
    } catch (error: any) {
      setErrors([error.message || 'Failed to create post']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Truncate if exceeds limit
    if (e.target.value.length > charLimit) {
      setContent(e.target.value.substring(0, charLimit));
    }

    // Auto-grow textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Create a Post</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Content Input */}
        <div className="space-y-2">
          <label htmlFor="post-content" className="block text-sm font-medium text-gray-700">
            What's on your mind?
          </label>
          <textarea
            ref={textareaRef}
            id="post-content"
            value={content}
            onChange={handleTextChange}
            placeholder="Share your thoughts with your family..."
            maxLength={charLimit}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            disabled={isSubmitting}
          />

          <div className="flex justify-between items-center">
            <div
              className={`text-xs ${
                remainingChars < 100 ? 'text-orange-600' : 'text-gray-500'
              }`}
            >
              {charCount} / {charLimit} characters
            </div>
            {remainingChars < 1 && (
              <span className="text-xs text-red-600 font-medium">Character limit reached</span>
            )}
          </div>
        </div>

        {/* Media Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Add Media (Optional)
          </label>
          <MediaUploadPreview
            onMediaSelect={handleMediaSelect}
            onMediaRemove={handleMediaRemove}
            selectedFile={selectedFile}
            previewUrl={previewUrl}
            mediaType={mediaType}
          />
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="space-y-1 p-3 bg-red-50 rounded-lg border border-red-200">
            {errors.map((error, idx) => (
              <div key={idx} className="flex gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            ))}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setContent('');
              handleMediaRemove();
              setErrors([]);
            }}
            disabled={isSubmitting || (content === '' && !selectedFile)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={isSubmitting || (content.trim() === '' && !selectedFile)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Post
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
