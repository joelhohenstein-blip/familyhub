import { useState } from 'react';
import { redirect } from 'react-router';
import { callTrpc } from '~/utils/trpc.server';
import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Music, Film, Plus, Play, Users, Clock, ThumbsUp } from 'lucide-react';

export async function loader({ request }: { request: Request }) {
  const caller = await callTrpc(request);
  const { isSignedIn, user } = await caller.auth.me();

  if (!isSignedIn) {
    return redirect('/login');
  }

  return { user };
}

/**
 * Music Playlist Component
 */
function MusicPlaylist({
  id,
  name,
  trackCount,
  createdBy,
  thumbnail,
}: {
  id: string;
  name: string;
  trackCount: number;
  createdBy: string;
  thumbnail?: string;
}) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
      <div className="aspect-square bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-4xl">
        {thumbnail || '🎵'}
      </div>
      <div className="p-4">
        <h3 className="font-bold truncate">{name}</h3>
        <p className="text-sm text-gray-600 mb-3">{trackCount} songs</p>
        <Button variant="outline" size="sm" className="w-full">
          <Play className="w-4 h-4 mr-2" />
          Play
        </Button>
      </div>
    </Card>
  );
}

/**
 * Watch Party Card Component
 */
function WatchPartyCard({
  id,
  title,
  contentType,
  scheduledAt,
  participantCount,
  status,
}: {
  id: string;
  title: string;
  contentType: string;
  scheduledAt: Date;
  participantCount: number;
  status: 'scheduled' | 'watching' | 'completed';
}) {
  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-800',
    watching: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
  };

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold mb-1">{title}</h3>
          <p className="text-sm text-gray-600 capitalize">{contentType}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded ${statusColors[status]}`}>
          {status === 'watching' ? 'Live Now' : status}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {new Date(scheduledAt).toLocaleDateString()}
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          {participantCount} watching
        </div>
      </div>

      <Button variant="outline" className="w-full" size="sm">
        {status === 'watching' ? 'Join Now' : 'Join'}
      </Button>
    </Card>
  );
}

/**
 * Content Recommendation Card
 */
function RecommendationCard({
  id,
  title,
  contentType,
  rating,
  votes,
  reason,
}: {
  id: string;
  title: string;
  contentType: string;
  rating?: number;
  votes: number;
  reason?: string;
}) {
  const icons = {
    movie: '🎬',
    show: '📺',
    game: '🎮',
    music: '🎵',
  };

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex gap-3">
        <div className="text-3xl">{icons[contentType as keyof typeof icons] || '✨'}</div>
        <div className="flex-1">
          <h3 className="font-bold mb-1">{title}</h3>
          <p className="text-sm text-gray-600 capitalize mb-2">{contentType}</p>

          {reason && (
            <p className="text-xs text-gray-500 italic mb-3">"{reason}"</p>
          )}

          {rating && (
            <div className="flex items-center gap-1 mb-3">
              {Array.from({ length: rating }).map((_, i) => (
                <span key={i} className="text-yellow-400">⭐</span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm">
              <ThumbsUp className="w-4 h-4 text-blue-600" />
              <span className="font-semibold">{votes}</span>
            </div>
            <Button variant="outline" size="sm">
              Like
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function EntertainmentPage() {
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [showNewWatchParty, setShowNewWatchParty] = useState(false);

  // Sample data
  const playlists = [
    {
      id: '1',
      name: '80s Classics',
      trackCount: 24,
      createdBy: 'Sarah',
    },
    {
      id: '2',
      name: 'Family Singalong',
      trackCount: 18,
      createdBy: 'Mike',
    },
    {
      id: '3',
      name: 'Workout Mix',
      trackCount: 32,
      createdBy: 'Emma',
    },
  ];

  const watchParties = [
    {
      id: '1',
      title: 'Family Movie Night',
      contentType: 'movie',
      scheduledAt: new Date(Date.now() + 86400000),
      participantCount: 5,
      status: 'scheduled' as const,
    },
    {
      id: '2',
      title: 'Comedy Hour',
      contentType: 'show',
      scheduledAt: new Date(Date.now() + 172800000),
      participantCount: 3,
      status: 'scheduled' as const,
    },
    {
      id: '3',
      title: 'Documentary Screening',
      contentType: 'stream',
      scheduledAt: new Date(),
      participantCount: 7,
      status: 'watching' as const,
    },
  ];

  const recommendations = [
    {
      id: '1',
      title: 'The Grand Budapest Hotel',
      contentType: 'movie',
      rating: 5,
      votes: 12,
      reason: 'A visually stunning masterpiece with great family humor',
    },
    {
      id: '2',
      title: 'Stranger Things',
      contentType: 'show',
      rating: 4,
      votes: 8,
      reason: 'Great plot twists and perfect for binge watching',
    },
    {
      id: '3',
      title: 'Bohemian Rhapsody',
      contentType: 'music',
      votes: 15,
      reason: 'Classic everyone should listen to',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Film className="w-8 h-8 text-purple-600" />
            <h1 className="text-4xl font-bold text-gray-900">Entertainment Hub</h1>
          </div>
          <p className="text-lg text-gray-600">
            Share music, watch together, and discover family favorites
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="playlists" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="playlists" className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              Music
            </TabsTrigger>
            <TabsTrigger value="watch-parties" className="flex items-center gap-2">
              <Film className="w-4 h-4" />
              Watch Parties
            </TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          {/* Music Playlists Tab */}
          <TabsContent value="playlists" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Playlists</h2>
              <Button onClick={() => setShowNewPlaylist(!showNewPlaylist)}>
                <Plus className="w-4 h-4 mr-2" />
                New Playlist
              </Button>
            </div>

            {showNewPlaylist && (
              <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
                <h3 className="font-bold mb-4">Create New Playlist</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Playlist Name</label>
                    <input
                      type="text"
                      placeholder="My Awesome Playlist"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      placeholder="What's this playlist about?"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1">Create Playlist</Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowNewPlaylist(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlists.map(playlist => (
                <MusicPlaylist
                  key={playlist.id}
                  {...playlist}
                  thumbnail="🎵"
                />
              ))}
            </div>
          </TabsContent>

          {/* Watch Parties Tab */}
          <TabsContent value="watch-parties" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Watch Parties</h2>
              <Button onClick={() => setShowNewWatchParty(!showNewWatchParty)}>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Watch Party
              </Button>
            </div>

            {showNewWatchParty && (
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                <h3 className="font-bold mb-4">Schedule Watch Party</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input
                      type="text"
                      placeholder="Movie Night"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Content URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date & Time</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1">Schedule</Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowNewWatchParty(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {watchParties.map(party => (
                <WatchPartyCard key={party.id} {...party} />
              ))}
            </div>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Community Recommendations</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map(rec => (
                <RecommendationCard key={rec.id} {...rec} />
              ))}
            </div>

            <Card className="p-6">
              <h3 className="font-bold mb-4">Recommend Something</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    placeholder="What do you recommend?"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                      <option>Movie</option>
                      <option>Show</option>
                      <option>Music</option>
                      <option>Game</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Rating</label>
                    <select className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                      <option>⭐ 1 Star</option>
                      <option>⭐⭐ 2 Stars</option>
                      <option>⭐⭐⭐ 3 Stars</option>
                      <option>⭐⭐⭐⭐ 4 Stars</option>
                      <option>⭐⭐⭐⭐⭐ 5 Stars</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Why do you recommend it?</label>
                  <textarea
                    placeholder="Share your thoughts..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={3}
                  />
                </div>
                <Button className="w-full">Post Recommendation</Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
