import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Grid, List } from 'lucide-react';
import { useMediaGallery } from '~/hooks/useMediaGallery';
import MediaUploadCard from './MediaUploadCard';
import MediaGrid from './MediaGrid';
import AlbumManager from './AlbumManager';

interface MediaGalleryProps {
  familyId: string;
  galleryId: string;
}

export default function MediaGallery({ familyId, galleryId }: MediaGalleryProps) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUpload, setShowUpload] = useState(false);
  const [showAlbumManager, setShowAlbumManager] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const {
    items,
    albums,
    loading,
    error,
    filters,
    hasMore,
    setFilter,
    uploadMedia,
    deleteMedia,
    moveMediaToAlbum,
    createAlbum,
    updateAlbumName,
    loadMore,
  } = useMediaGallery(familyId, galleryId);

  // Note: Pusher real-time updates will be handled through the hooks
  // The useMediaGallery hook manages query invalidation automatically

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    // Upload the first file
    const file = files[0];
    try {
      await uploadMedia(galleryId, file);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  // Filter buttons
  const filterButtons = [
    { value: 'all' as const, label: t('media.filters.all') },
    { value: 'image' as const, label: t('media.filters.images') },
    { value: 'video' as const, label: t('media.filters.videos') },
  ];

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 transition ${
        isDragOver ? 'bg-blue-50' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay indicator */}
      {isDragOver && (
        <div className="fixed inset-0 bg-blue-500/10 border-4 border-dashed border-blue-500 rounded-lg flex items-center justify-center pointer-events-none z-50">
          <div className="bg-white px-8 py-6 rounded-lg shadow-xl">
            <p className="text-xl font-semibold text-blue-600">{t('media.dragDrop')}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              {t('media.title')}
            </h1>
            <p className="text-slate-600">
              {items.length > 0
                ? `${items.length} ${items.length === 1 ? 'item' : 'items'}`
                : t('media.emptyGallery')}
            </p>
          </div>

          <div className="flex gap-3">
            {/* View mode toggle */}
            <div className="flex gap-2 bg-white rounded-lg shadow p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${
                  viewMode === 'grid'
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Grid view"
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${
                  viewMode === 'list'
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="List view"
              >
                <List size={20} />
              </button>
            </div>

            {/* Upload button */}
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition"
            >
              <Plus size={20} />
              {t('media.upload')}
            </button>

            {/* Album manager button */}
            <button
              onClick={() => setShowAlbumManager(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow transition"
            >
              <Plus size={20} />
              {t('media.createAlbum')}
            </button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error.message}</p>
          </div>
        )}

        {/* Filter buttons */}
        <div className="flex gap-2 flex-wrap">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value)}
              className={`px-4 py-2 rounded-lg transition ${
                filters.type === btn.value
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-white text-slate-700 hover:bg-slate-50 shadow'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload Card */}
      {showUpload && (
        <div className="max-w-7xl mx-auto mb-8">
          <MediaUploadCard
            familyId={familyId}
            galleryId={galleryId}
            onUpload={async (file) => {
              await uploadMedia(galleryId, file);
              setShowUpload(false);
            }}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      )}

      {/* Album Manager */}
      {showAlbumManager && (
        <div className="max-w-7xl mx-auto mb-8">
          <AlbumManager
            familyId={familyId}
            galleryId={galleryId}
            albums={albums}
            onCreateAlbum={createAlbum}
            onUpdateAlbumName={updateAlbumName}
            onClose={() => setShowAlbumManager(false)}
          />
        </div>
      )}

      {/* Media Grid/List */}
      {items.length > 0 ? (
        <div className="max-w-7xl mx-auto">
          <MediaGrid
            items={items}
            albums={albums}
            viewMode={viewMode}
            loading={loading}
            familyId={familyId}
            onDeleteMedia={deleteMedia}
            onMoveMediaToAlbum={moveMediaToAlbum}
          />

          {/* Load more button */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-lg shadow transition disabled:opacity-50"
              >
                {loading ? t('common.loading') : t('media.pagination.loadMore')}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-slate-600 mb-4">{t('media.emptyGallery')}</p>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
            >
              <Plus size={20} />
              {t('media.upload')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
