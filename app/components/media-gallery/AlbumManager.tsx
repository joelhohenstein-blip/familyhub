import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Edit2, Trash2 } from 'lucide-react';

interface Album {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
}

interface AlbumManagerProps {
  familyId: string;
  galleryId: string;
  albums: Album[];
  onCreateAlbum: (
    galleryId: string,
    name: string,
    description?: string
  ) => Promise<Album>;
  onUpdateAlbumName: (albumId: string, name: string) => Promise<void>;
  onClose: () => void;
}

export default function AlbumManager({
  galleryId,
  albums,
  onCreateAlbum,
  onUpdateAlbumName,
  onClose,
}: AlbumManagerProps) {
  const { t } = useTranslation();
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDesc, setNewAlbumDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newAlbumName.trim()) {
      setError(t('media.errors.invalidAlbumName'));
      return;
    }

    setIsCreating(true);
    try {
      await onCreateAlbum(
        galleryId,
        newAlbumName.trim(),
        newAlbumDesc.trim() || undefined
      );
      setNewAlbumName('');
      setNewAlbumDesc('');
      setSuccess(`Album "${newAlbumName}" created successfully`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('media.errors.albumCreationFailed')
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateAlbumName = async (albumId: string) => {
    if (!editingName.trim()) {
      setError(t('media.errors.invalidAlbumName'));
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await onUpdateAlbumName(albumId, editingName.trim());
      setEditingId(null);
      setEditingName('');
      setSuccess('Album updated successfully');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update album'
      );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          {t('media.albums')}
        </h2>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-700"
        >
          <X size={24} />
        </button>
      </div>

      {/* Error and success messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Create new album form */}
      <form onSubmit={handleCreateAlbum} className="mb-8 p-6 bg-slate-50 rounded-lg">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          {t('media.createAlbum')}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('media.album')} Name
            </label>
            <input
              type="text"
              value={newAlbumName}
              onChange={(e) => setNewAlbumName(e.target.value)}
              placeholder="e.g., Summer Vacation, Birthday Party"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCreating}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={newAlbumDesc}
              onChange={(e) => setNewAlbumDesc(e.target.value)}
              placeholder="Add a description for this album..."
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCreating}
            />
          </div>

          <button
            type="submit"
            disabled={isCreating || !newAlbumName.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50"
          >
            <Plus size={20} />
            {isCreating ? t('common.loading') : t('buttons.save')}
          </button>
        </div>
      </form>

      {/* Albums list */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Your Albums ({albums.length})
        </h3>

        {albums.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-600">No albums yet. Create one above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {albums.map((album) => (
              <div
                key={album.id}
                className="flex items-center gap-4 bg-slate-50 rounded-lg p-4 hover:bg-slate-100 transition group"
              >
                {editingId === album.id ? (
                  // Edit mode
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                      className="flex-1 px-3 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleUpdateAlbumName(album.id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditingName('');
                      }}
                      className="px-3 py-1 bg-slate-400 hover:bg-slate-500 text-white rounded transition text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  // View mode
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">
                        {album.name}
                      </p>
                      {album.description && (
                        <p className="text-sm text-slate-600">
                          {album.description}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        Created {new Date(album.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => {
                          setEditingId(album.id);
                          setEditingName(album.name);
                        }}
                        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded transition"
                        title="Edit album name"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              t('media.confirmations.deleteAlbum')
                            )
                          ) {
                            // Delete functionality would be added here
                            console.log('Delete album:', album.id);
                          }
                        }}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded transition"
                        title="Delete album"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
