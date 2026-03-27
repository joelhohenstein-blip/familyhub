import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import {
  MessageSquare,
  Video,
  Image,
  Calendar,
  ShoppingCart,
  Sparkles,
  Play,
  ArrowRight,
  Check,
} from 'lucide-react';

interface Feature {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  longDescription: string;
  emoji: string;
  colorClass: string;
  bgColorClass: string;
  benefits: string[];
  demoContent: string;
  screenshots: string[];
}

const features: Feature[] = [
  {
    id: 'messaging',
    icon: <MessageSquare className="h-8 w-8" />,
    title: 'Group Messaging',
    description: 'Real-time messaging with family groups and threads',
    longDescription:
      'Stay connected with instant messaging, threaded conversations, and rich media sharing. Create family groups, organize conversations by topic, and never miss important updates.',
    emoji: '💬',
    colorClass: 'bg-blue-500',
    bgColorClass: 'bg-blue-50',
    benefits: [
      'Real-time message delivery',
      'Threaded conversations',
      'Rich media sharing (photos, videos)',
      'Message search and history',
      'Read receipts and typing indicators',
      'Emoji reactions and replies',
    ],
    demoContent: 'Family group chat with 12 messages, photo sharing, and reactions',
    screenshots: [
      'messaging-list.png',
      'messaging-thread.png',
      'messaging-media.png',
    ],
  },
  {
    id: 'video-calls',
    icon: <Video className="h-8 w-8" />,
    title: 'Video Calls',
    description: 'HD video calls with family members',
    longDescription:
      'Connect face-to-face with crystal-clear HD video calls. Support for group calls, screen sharing, and recording for families spread across the globe.',
    emoji: '📹',
    colorClass: 'bg-purple-500',
    bgColorClass: 'bg-purple-50',
    benefits: [
      'HD video quality',
      'Group video calls (up to 20 people)',
      'Screen sharing',
      'Call recording',
      'Virtual backgrounds',
      'Noise cancellation',
    ],
    demoContent: 'Video call interface with 4 participants and screen sharing',
    screenshots: [
      'video-call-grid.png',
      'video-call-screen-share.png',
      'video-call-recording.png',
    ],
  },
  {
    id: 'media-gallery',
    icon: <Image className="h-8 w-8" />,
    title: 'Media Gallery',
    description: 'Organize and share family photos and videos',
    longDescription:
      'Build a beautiful digital archive of family memories. Automatically organize photos by date, location, and people. Share albums with family members and create collaborative galleries.',
    emoji: '🖼️',
    colorClass: 'bg-amber-500',
    bgColorClass: 'bg-amber-50',
    benefits: [
      'Automatic photo organization',
      'AI-powered tagging',
      'Shared albums',
      'Photo editing tools',
      'Unlimited storage (Pro plan)',
      'Backup and sync',
    ],
    demoContent: 'Photo gallery with 24 family photos organized by date',
    screenshots: [
      'gallery-grid.png',
      'gallery-album.png',
      'gallery-lightbox.png',
    ],
  },
  {
    id: 'calendar',
    icon: <Calendar className="h-8 w-8" />,
    title: 'Family Calendar',
    description: 'Coordinate events and birthdays',
    longDescription:
      'Keep everyone on the same page with a shared family calendar. Track birthdays, anniversaries, holidays, and family events. Get reminders and notifications for important dates.',
    emoji: '📅',
    colorClass: 'bg-green-500',
    bgColorClass: 'bg-green-50',
    benefits: [
      'Shared calendar view',
      'Event creation and RSVP',
      'Birthday and anniversary tracking',
      'Recurring events',
      'Calendar notifications',
      'Integration with external calendars',
    ],
    demoContent: 'Calendar showing 8 family events across the month',
    screenshots: [
      'calendar-month.png',
      'calendar-event.png',
      'calendar-reminders.png',
    ],
  },
  {
    id: 'shopping-lists',
    icon: <ShoppingCart className="h-8 w-8" />,
    title: 'Shopping Lists',
    description: 'Collaborative shopping and to-do lists',
    longDescription:
      'Create and manage shopping lists together. Assign items, check off purchases, and sync across devices. Perfect for coordinating groceries, errands, and family projects.',
    emoji: '🛒',
    colorClass: 'bg-red-500',
    bgColorClass: 'bg-red-50',
    benefits: [
      'Shared shopping lists',
      'Item assignment',
      'Price tracking',
      'Quantity management',
      'List templates',
      'Cross-device sync',
    ],
    demoContent: 'Shopping list with 15 items, assignments, and prices',
    screenshots: [
      'shopping-list.png',
      'shopping-assigned.png',
      'shopping-completed.png',
    ],
  },
  {
    id: 'ai-summaries',
    icon: <Sparkles className="h-8 w-8" />,
    title: 'AI Summaries',
    description: 'Smart digests of family activity',
    longDescription:
      'Get intelligent summaries of family activity. AI-powered digests highlight important moments, upcoming events, and key conversations so you never miss anything important.',
    emoji: '✨',
    colorClass: 'bg-indigo-500',
    bgColorClass: 'bg-indigo-50',
    benefits: [
      'Daily activity digests',
      'Smart notifications',
      'Conversation summaries',
      'Event highlights',
      'Customizable frequency',
      'Multi-language support',
    ],
    demoContent: 'Daily digest showing 5 key family moments and 2 upcoming events',
    screenshots: [
      'digest-daily.png',
      'digest-weekly.png',
      'digest-settings.png',
    ],
  },
  {
    id: 'streaming-theater',
    icon: <Play className="h-8 w-8" />,
    title: 'Streaming Theater',
    description: 'Watch together in real-time',
    longDescription:
      'Experience synchronized streaming with family. Watch movies, shows, or videos together with real-time chat and reactions. Perfect for family movie nights across distances.',
    emoji: '🎬',
    colorClass: 'bg-slate-500',
    bgColorClass: 'bg-slate-50',
    benefits: [
      'Synchronized playback',
      'Real-time chat overlay',
      'Reaction emojis',
      'Pause/play sync',
      'Video quality options',
      'Watch history',
    ],
    demoContent: 'Theater view with video player and live chat from 6 family members',
    screenshots: [
      'theater-player.png',
      'theater-chat.png',
      'theater-reactions.png',
    ],
  },
];

export default function FeaturesPage() {
  const [selectedFeature, setSelectedFeature] = useState<Feature>(features[0]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
                FH
              </div>
              <span className="text-xl font-bold text-foreground">FamilyHub</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/landing" className="text-sm text-muted-foreground hover:text-foreground transition">
                Home
              </Link>
              <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition">
                Pricing
              </Link>
              <Link to="/guide" className="text-sm text-muted-foreground hover:text-foreground transition">
                Guide
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Powerful Features for
              <span className="block text-primary">Connected Families</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Explore all the ways FamilyHub helps your family stay connected, organized, and closer together.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 sm:py-32 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setSelectedFeature(feature)}
                className={`text-left p-6 rounded-lg border-2 transition-all ${
                  selectedFeature.id === feature.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className={`h-12 w-12 rounded-lg ${feature.colorClass} text-white flex items-center justify-center mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {feature.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Detail Section */}
      <section className="py-20 sm:py-32 border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Feature Info */}
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className={`h-16 w-16 rounded-lg ${selectedFeature.colorClass} text-white flex items-center justify-center`}>
                  <span className="text-3xl">{selectedFeature.emoji}</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-foreground">
                    {selectedFeature.title}
                  </h2>
                </div>
              </div>

              <p className="text-lg text-muted-foreground mb-8">
                {selectedFeature.longDescription}
              </p>

              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Key Benefits
                </h3>
                <ul className="space-y-3">
                  {selectedFeature.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link to="/signup">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Try {selectedFeature.title}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Right: Demo Preview */}
            <div>
              <Card className="border-border overflow-hidden">
                <CardHeader className={`${selectedFeature.colorClass} text-white`}>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    Interactive Demo
                  </CardTitle>
                  <CardDescription className="text-white/80">
                    {selectedFeature.demoContent}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-8">
                  <div className={`${selectedFeature.bgColorClass} rounded-lg p-8 min-h-96 flex flex-col items-center justify-center`}>
                    <div className="text-center">
                      <div className="text-6xl mb-4">{selectedFeature.emoji}</div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        {selectedFeature.title} Demo
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        {selectedFeature.demoContent}
                      </p>
                      <Button variant="outline" className="gap-2">
                        <Play className="h-4 w-4" />
                        Play Demo Video
                      </Button>
                    </div>
                  </div>

                  {/* Screenshots */}
                  <div className="mt-8">
                    <h4 className="font-semibold text-foreground mb-4">
                      Screenshots
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      {selectedFeature.screenshots.map((screenshot, idx) => (
                        <div
                          key={idx}
                          className="aspect-square rounded-lg bg-muted border border-border flex items-center justify-center"
                        >
                          <div className="text-center">
                            <Image className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">
                              {screenshot}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 sm:py-32 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Feature Comparison
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              See which features are included in each plan
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-semibold text-foreground">
                    Feature
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground">
                    Starter
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground">
                    Pro
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground">
                    Family
                  </th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature) => (
                  <tr key={feature.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-4 px-4 text-foreground font-medium">
                      {feature.title}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Check className="h-5 w-5 text-primary mx-auto" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Check className="h-5 w-5 text-primary mx-auto" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Check className="h-5 w-5 text-primary mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32 border-t border-border bg-gradient-to-r from-primary/10 via-transparent to-accent/10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ready to Experience All These Features?
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Start your 14-day free trial today. No credit card required.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/guide">
              <Button size="lg" variant="outline">
                View User Guide
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Product
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/features"
                    className="text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    to="/pricing"
                    className="text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    Security
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Company
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Legal
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    Privacy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    Terms
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    Cookies
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Social
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    Twitter
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    Facebook
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    Instagram
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8">
            <p className="text-sm text-muted-foreground text-center">
              © 2026 FamilyHub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
