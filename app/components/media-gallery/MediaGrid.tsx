import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Move, Play, Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { trpc } from '~/utils/trpc';
import MediaLightbox from './MediaLightbox';

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  fileName: string;
  thumbnailUrl?: string | null;
  createdAt: Date;
  albumId?: string | null;
}

interface Album {
  id: string;
  name: string;
}

interface MediaGridProps {
  items: MediaItem[];
  albums: Album[];
  viewMode: 'grid' | 'list';
  loading: boolean;
  familyId?: string;
  onDeleteMedia: (mediaId: string) => Promise<void>;
  onMoveMediaToAlbum: (mediaId: string, albumId: string | null) => Promise<void>;
}

export default function MediaGrid({
  items,
  albums,
  viewMode,
  loading,
  familyId,
  onDeleteMedia,
  onMoveMediaToAlbum,
}: MediaGridProps) {
  const { t } = useTranslation();
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [blurStatuses, setBlurStatuses] = useState<Record<string, any>>({});
  const [loadingBlurStatus, setLoadingBlurStatus] = useState<Set<string>>(new Set());

  // Fetch blur status for each media item
  useEffect(() => {
    const fetchBlurStatuses = async () => {
      const newStatuses: Record<string, any> = {};
      const loadingIds = new Set<string>();

      for (const item of items) {
        loadingIds.add(item.id);
      }
      setLoadingBlurStatus(loadingIds);

      try {
        for (const item of items) {
          try {
            // Use the useQuery hook to fetch blur status
            const utils = trpc.useUtils();
            const status = await utils.faceBlur.getMediaBlurStatus.fetch({
              mediaItemId: item.id,
            });
            newStatuses[item.id] = status;
          } catch (error) {
            // If blur settings don't exist, that's okay - just skip
            console.debug(`No blur status for media ${item.id}`);
          }
        }
      } finally {
        setBlurStatuses(newStatuses);
        setLoadingBlurStatus(new Set());
      }
    };

    if (items.length > 0) {
      fetchBlurStatuses();
    }
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">{t('media.emptyGallery')}</p>
      </div>
    );
  }

  const handleDeleteMedia = async (mediaId: string) => {
    if (!window.confirm(t('media.confirmations.deleteMedia'))) return;

    setDeletingId(mediaId);
    try {
      await onDeleteMedia(mediaId);
    } finally {
      setDeletingId(null);
    }
  };

  const handleMoveMedia = async (mediaId: string, albumId: string) => {
    await onMoveMediaToAlbum(mediaId, albumId === 'none' ? null : albumId);
  };

  // Render blur status indicator
  const renderBlurStatusIndicator = (mediaId: string) => {
    const status = blurStatuses[mediaId];
    const isLoading = loadingBlurStatus.has(mediaId);

    if (isLoading) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">
          <Loader2 size={12} className="animate-spin" />
          <span>{t('media.blurStatus.loading')}</span>
        </div>
      );
    }

    if (!status) {
      return null;
    }

    const statusConfig: Record<string, { icon: React.ReactNode; label: string; bgColor: string; textColor: string }> = {
      pending: {
        icon: <Clock size={12} />,
        label: t('media.blurStatus.pending'),
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-700',
      },
      processing: {
        icon: <Loader2 size={12} className="animate-spin" />,
        label: t('media.blurStatus.processing'),
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
      },
      completed: {
        icon: <CheckCircle2 size={12} />,
        label: t('media.blurStatus.completed'),
        bgColor: 'bg-green-100',
        textColor: 'text-green-700',
      },
      failed: {
        icon: <AlertCircle size={12} />,
        label: t('media.blurStatus.failed'),
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
      },
      skipped: {
        icon: <AlertCircle size={12} />,
        label: t('media.blurStatus.skipped'),
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-700',
      },
    };

    const config = statusConfig[status.faceDetectionStatus] || statusConfig.pending;

    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${config.bgColor} ${config.textColor}`}>
        {config.icon}
        <span>{config.label}</span>
        {status.detectedFaceCount > 0 && (
          <span className="ml-1 font-semibold">({status.detectedFaceCount})</span>
        )}
      </div>
    );
  };

  if (viewMode === 'grid') {
    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden"
            >
              {/* Thumbnail */}
              <div className="relative aspect-square bg-slate-100 overflow-hidden">
                <img
                  src={item.thumbnailUrl || item.url}
                  alt={item.fileName}
                  className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition"
                  onClick={() => {
                    setSelectedMedia(item);
                    setShowLightbox(true);
                  }}
                />

                {/* Video play button overlay */}
                {item.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-50 transition cursor-pointer"
                    onClick={() => {
                      setSelectedMedia(item);
                      setShowLightbox(true);
                    }}
                  >
                    <div className="bg-white rounded-full p-3 opacity-0 group-hover:opacity-100 transition">
                      <Play size={24} className="text-blue-600 fill-blue-600" />
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {item.fileName}
                </p>
                <p className="text-xs text-slate-500">
                  {item.type === 'image' ? t('media.photos') : t('media.videos')}
                </p>
                {/* Blur Status Indicator */}
                <div className="mt-2">
                  {renderBlurStatusIndicator(item.id)}
                </div>
              </div>

              {/* Actions */}
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                {/* Move to album */}
                <div className="relative group/menu">
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow transition"
                    title={t('media.moveToAlbum')}
                  >
                    <Move size={16} />
                  </button>

                  {/* Album dropdown */}
                  <div className="hidden group-hover/menu:block absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg z-10 min-w-48">
                    <button
                      onClick={() => handleMoveMedia(item.id, 'none')}
                      className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition first:rounded-t-lg"
                    >
                      {t('media.emptyAlbum')}
                    </button>
                    {albums.map((album) => (
                      <button
                        key={album.id}
                        onClick={() => handleMoveMedia(item.id, album.id)}
                        className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition"
                      >
                        {album.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDeleteMedia(item.id)}
                  disabled={deletingId === item.id}
                  className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg shadow transition disabled:opacity-50"
                  title={t('buttons.delete')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox */}
        {showLightbox && selectedMedia && (
          <MediaLightbox
            media={selectedMedia}
            familyId={familyId}
            onClose={() => {
              setShowLightbox(false);
              setSelectedMedia(null);
            }}
          />
        )}
      </>
    );
  }

  // List view
  return (
    <>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 bg-white rounded-lg shadow p-4 hover:shadow-lg transition group"
          >
            {/* Thumbnail */}
            <img
              src={item.thumbnailUrl || item.url}
              alt={item.fileName}
              className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition"
              onClick={() => {
                setSelectedMedia(item);
                setShowLightbox(true);
              }}
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 truncate">
                {item.fileName}
              </p>
              <p className="text-sm text-slate-500">
                {item.type === 'image' ? t('media.photos') : t('media.videos')}
              </p>
              {/* Blur Status Indicator */}
              <div className="mt-2">
                {renderBlurStatusIndicator(item.id)}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
              {/* Move to album */}
              <div className="relative group/menu">
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow transition"
                  title={t('media.moveToAlbum')}
                >
                  <Move size={16} />
                </button>

                {/* Album dropdown */}
                <div className="hidden group-hover/menu:block absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg z-10 min-w-48">
                  <button
                    onClick={() => handleMoveMedia(item.id, 'none')}
                    className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition first:rounded-t-lg"
                  >
                    {t('media.album')}
                  </button>
                  {albums.map((album) => (
                    <button
                      key={album.id}
                      onClick={() => handleMoveMedia(item.id, album.id)}
                      className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition"
                    >
                      {album.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDeleteMedia(item.id)}
                disabled={deletingId === item.id}
                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg shadow transition disabled:opacity-50"
                title={t('buttons.delete')}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {showLightbox && selectedMedia && (
        <MediaLightbox
          media={selectedMedia}
          familyId={familyId}
          onClose={() => {
            setShowLightbox(false);
            setSelectedMedia(null);
          }}
        />
      )}
    </>
  );
}
