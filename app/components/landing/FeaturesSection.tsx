import { MessageSquare, Video, Camera, Calendar, CheckSquare, Globe, Shield, Zap, Users, Heart, TrendingUp } from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: 'Family Messaging',
    description: 'Group chats and threaded conversations with your entire family, keeping everyone in the loop.',
    emoji: '💬'
  },
  {
    icon: Video,
    title: 'Video Calls',
    description: 'Crystal-clear 1-on-1 and group video calls to see everyone\'s faces, no matter where they are.',
    emoji: '🎥'
  },
  {
    icon: Camera,
    title: 'Photo Gallery',
    description: 'Share and organize family photos and videos with unlimited storage and easy searching.',
    emoji: '🖼️'
  },
  {
    icon: Calendar,
    title: 'Family Calendar',
    description: 'Coordinate schedules, birthdays, holidays, and events so nobody misses important dates.',
    emoji: '📆'
  },
  {
    icon: CheckSquare,
    title: 'Shopping Lists',
    description: 'Create shared shopping and task lists, assign items to family members, and check off when done.',
    emoji: '🛒'
  },
  {
    icon: Globe,
    title: 'Multi-Language',
    description: 'Available in English, Spanish, and French so your whole family can use it comfortably.',
    emoji: '🌍'
  },
  {
    icon: Shield,
    title: 'Privacy & Security',
    description: 'Your family data is encrypted, private, and never shared with third parties. Period.',
    emoji: '🔒'
  },
  {
    icon: Zap,
    title: 'Real-Time Updates',
    description: 'Instant notifications and live typing indicators keep everyone connected in real-time.',
    emoji: '⚡'
  }
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-6 mb-20">
          <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 px-4 py-2 rounded-full text-sm font-semibold">
            <Heart className="w-4 h-4" />
            <span>Built for Real Families</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
            Everything You Need to<br />
            <span className="bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">Stay Connected</span>
          </h2>
          
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            All-in-one platform to message, video call, share memories, organize events, and manage your family—all free, forever.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div 
                key={idx}
                className="p-8 rounded-2xl bg-white border-2 border-gray-200 hover:border-orange-400 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-3 text-lg">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Why FamilyHub Section */}
        <div className="bg-gradient-to-r from-orange-50 to-teal-50 rounded-3xl p-12 border border-orange-200">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div className="space-y-3">
              <Users className="w-12 h-12 text-orange-500 mx-auto" />
              <h4 className="font-bold text-gray-900 text-lg">No Limits</h4>
              <p className="text-gray-600">Invite unlimited family members. No seat limits, ever.</p>
            </div>
            <div className="space-y-3">
              <Heart className="w-12 h-12 text-rose-500 mx-auto" />
              <h4 className="font-bold text-gray-900 text-lg">Made for You</h4>
              <p className="text-gray-600">Designed specifically for families, not trying to be everything.</p>
            </div>
            <div className="space-y-3">
              <TrendingUp className="w-12 h-12 text-teal-500 mx-auto" />
              <h4 className="font-bold text-gray-900 text-lg">Always Growing</h4>
              <p className="text-gray-600">New features added regularly based on family feedback.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
