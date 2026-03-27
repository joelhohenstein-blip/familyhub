import React, { useState } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';
import { validateMedia, formatFileSize, getMediaType } from '~/utils/postValidation';

interface MediaUploadPreviewProps {
  onMediaSelect: (file: File, type: 'image' | 'video') => void;
  onMediaRemove: () => void;
  selectedFile?: File | null;
  previewUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
}

export const MediaUploadPreview: React.FC<MediaUploadPreviewProps> = ({
  onMediaSelect,
  onMediaRemove,
  selectedFile,
  previewUrl,
  mediaType,
}) => {
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (file: File) => {
    const validationErrors = validateMedia(file);

    if (validationErrors.length > 0) {
      setErrors(validationErrors.map((e) => e.message));
      return;
    }

    const type = getMediaType(file.type);
    if (!type) {
      setErrors(['Invalid file type']);
      return;
    }

    setErrors([]);
    onMediaSelect(file, type);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Show preview if file is selected
  if (selectedFile && previewUrl) {
    return (
      <div className="space-y-2">
        <div className="relative inline-block">
          {mediaType === 'image' ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-48 max-w-xs rounded-lg object-cover border border-gray-300"
            />
          ) : (
            <video
              src={previewUrl}
              className="max-h-48 max-w-xs rounded-lg border border-gray-300"
              controls
            />
          )}

          <button
            type="button"
            onClick={() => {
              onMediaRemove();
              setErrors([]);
            }}
            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            aria-label="Remove media"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-gray-600">
          <p className="font-medium">{selectedFile.name}</p>
          <p>{formatFileSize(selectedFile.size)}</p>
        </div>
      </div>
    );
  }

  // Show upload area
  return (
    <div className="space-y-2">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
      >
        <input
          type="file"
          accept="image/*,video/*"
          onChange={handleInputChange}
          className="hidden"
          id="media-upload"
          aria-label="Upload media file"
        />

        <label htmlFor="media-upload" className="cursor-pointer">
          <div className="flex flex-col items-center justify-center">
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-700">
              Drag and drop or click to upload
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Images (JPEG, PNG, GIF, WebP) or Videos (MP4, WebM, MPEG) up to 10MB
            </p>
          </div>
        </label>
      </div>

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, idx) => (
            <div key={idx} className="flex gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
