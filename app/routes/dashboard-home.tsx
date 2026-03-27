import { useLoaderData } from 'react-router';
import { callTrpc } from '~/utils/trpc.server';
import { MessageSquare, Video, Upload, Cloud, Tv } from 'lucide-react';
import WeatherWidget from '~/components/weather/WeatherWidget';

export async function loader({ request }: any) {
  const caller = await callTrpc(request);
  const { isSignedIn, user } = await caller.auth.me();

  if (!isSignedIn) {
    return { user: null };
  }

  return { user };
}

export default function DashboardHome({ loaderData }: any) {
  const user = loaderData.user;

  return (
    <div className="flex flex-1 flex-col p-6 bg-gradient-to-b from-orange-50 to-rose-50">
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to FamilyHub, {user?.email?.split('@')[0]}!
        </h2>
        <p className="text-gray-600">
          Connect with your family through messaging, video calls, and shared memories.
        </p>
      </div>

      {/* Weather Widget */}
      <div className="mb-8">
        <WeatherWidget />
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Message Board */}
        <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow border-l-4 border-orange-500">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Message Board</h3>
              <p className="text-sm text-gray-600">View and participate in family conversations.</p>
            </div>
            <MessageSquare className="w-8 h-8 text-orange-500" />
          </div>
          <button className="mt-4 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all">
            Go to Messages
          </button>
        </div>

        {/* Video Calls */}
        <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow border-l-4 border-rose-500">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Video Calls</h3>
              <p className="text-sm text-gray-600">Start or join a family video call.</p>
            </div>
            <Video className="w-8 h-8 text-rose-500" />
          </div>
          <button className="mt-4 px-4 py-2 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-lg font-medium hover:from-rose-600 hover:to-rose-700 transition-all">
            Start Call
          </button>
        </div>

        {/* Photo Gallery */}
        <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow border-l-4 border-teal-500">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Photo Gallery</h3>
              <p className="text-sm text-gray-600">Browse and share family photos and videos.</p>
            </div>
            <Upload className="w-8 h-8 text-teal-500" />
          </div>
          <a href="/dashboard/media">
            <button className="mt-4 px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg font-medium hover:from-teal-600 hover:to-teal-700 transition-all">
              View Gallery
            </button>
          </a>
        </div>

        {/* Streaming Theater */}
        <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow border-l-4 border-purple-500">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Streaming Theater</h3>
              <p className="text-sm text-gray-600">Watch movies from your favorite streaming services.</p>
            </div>
            <Tv className="w-8 h-8 text-purple-500" />
          </div>
          <a href="/dashboard/theater">
            <button className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all">
              Watch Now
            </button>
          </a>
        </div>

        {/* Cloud Storage */}
        <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow border-l-4 border-indigo-500">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cloud Storage</h3>
              <p className="text-sm text-gray-600">Store and share files with your family.</p>
            </div>
            <Cloud className="w-8 h-8 text-indigo-500" />
          </div>
          <button className="mt-4 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-indigo-700 transition-all">
            My Files
          </button>
        </div>
      </div>

      {/* Family Members */}
      <div className="bg-white rounded-2xl p-6 shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Family Members</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Mom', status: 'online', color: 'bg-rose-100 text-rose-600' },
            { name: 'Dad', status: 'online', color: 'bg-blue-100 text-blue-600' },
            { name: 'Sister', status: 'away', color: 'bg-orange-100 text-orange-600' },
          ].map((member) => (
            <div key={member.name} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className={`w-12 h-12 rounded-full ${member.color} flex items-center justify-center font-bold mr-3`}>
                {member.name[0]}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{member.name}</p>
                <p className="text-xs text-gray-600 capitalize">{member.status}</p>
              </div>
              <div className={`w-3 h-3 rounded-full ${member.status === 'online' ? 'bg-blue-500' : 'bg-red-500'}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
