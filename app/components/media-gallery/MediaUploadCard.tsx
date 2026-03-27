import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, AlertCircle } from 'lucide-react';
import { validateMedia, formatBytes } from '~/utils/mediaValidation';

interface MediaUploadCardProps {
  familyId: string;
  galleryId: string;
  onUpload: (file: File) => Promise<void>;
  onCancel: () => void;
}

export default function MediaUploadCard({
  onUpload,
  onCancel,
}: MediaUploadCardProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setErrors([]);

    // Validate file
    const validation = validateMedia(file);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 30;
        });
      }, 100);

      await onUpload(file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setErrors([
        error instanceof Error
          ? error.message
          : t('media.errors.uploadFailed'),
      ]);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 500);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          {t('media.uploadMedia')}
        </h2>
        <button
          onClick={onCancel}
          className="text-slate-500 hover:text-slate-700"
        >
          <X size={24} />
        </button>
      </div>

      {/* Upload area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 bg-slate-50 hover:border-slate-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={isUploading}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex flex-col items-center gap-3 text-slate-600 hover:text-blue-600 transition disabled:opacity-50"
        >
          <Upload size={48} />
          <div>
            <p className="font-semibold text-lg">
              {t('media.dragDrop')}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {t('media.selectFile')}
            </p>
          </div>
        </button>

        {/* File size info */}
        <p className="text-sm text-slate-500 mt-4">
          {t('media.errors.fileSizeExceeded')} (10MB)
        </p>
      </div>

      {/* Progress bar */}
      {isUploading && uploadProgress > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">
              {t('common.loading')}
            </span>
            <span className="text-sm text-slate-600">
              {Math.round(uploadProgress)}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success message */}
      {uploadProgress === 100 && !isUploading && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{t('common.success')}</p>
        </div>
      )}

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <div>
              {errors.map((error, idx) => (
                <p key={idx} className="text-red-800">
                  {error}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
