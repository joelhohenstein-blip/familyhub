import { Heart, MessageSquare, Video, Camera, Calendar, List, Zap, Lock, Users } from 'lucide-react';
import { Button } from '~/components/ui/button';

export function HeroSection() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col items-center justify-center px-4 pt-20">
      <div className="max-w-5xl mx-auto text-center space-y-8">
        {/* Pre-headline */}
        <div className="inline-flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-4 py-2 rounded-full text-sm font-semibold">
          <Zap className="w-4 h-4" />
          <span>Free. Forever. No Credit Card.</span>
        </div>

        {/* Logo & Headline */}
        <div className="space-y-6">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
              <img 
                src="/family-logo.svg" 
                alt="FamilyHub Logo" 
                className="w-full h-full"
              />
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-gray-900 dark:text-white leading-tight">
            Bring Your <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-teal-500 dark:from-orange-400 dark:via-rose-400 dark:to-teal-400 bg-clip-text text-transparent">Whole Family</span><br />
            <span className="text-4xl sm:text-5xl md:text-7xl">Closer Together</span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-2xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed font-light">
            One place for family messaging, video calls, photo sharing, calendar coordination, shopping lists, and memories—all secure, private, and ad-free.
          </p>
        </div>

        {/* CTA Buttons with Strong Copy */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 px-4">
          <Button 
            size="lg" 
            className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-lg px-8 sm:px-10 py-6 sm:py-7 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all cursor-pointer h-11 sm:h-auto"
            onClick={() => window.location.href = '/signup'}
          >
            ✨ Get Started Free
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="text-lg px-8 sm:px-10 py-6 sm:py-7 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:border-orange-400 dark:hover:border-orange-400 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold transition-colors cursor-pointer h-11 sm:h-auto"
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
          >
            See What's Included
          </Button>
        </div>

        {/* Social Proof / Features Teaser */}
        <div className="space-y-6 pt-8">
          <p className="text-gray-600 dark:text-gray-400 font-medium">Used by families just like yours</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto px-4">
            <div className="flex flex-col items-center gap-2 p-4 sm:p-0">
              <Users className="w-8 h-8 text-orange-500 flex-shrink-0" />
              <div className="font-semibold text-gray-900 dark:text-white">Unlimited Members</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Add your whole family</p>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 sm:p-0">
              <Lock className="w-8 h-8 text-teal-500 flex-shrink-0" />
              <div className="font-semibold text-gray-900 dark:text-white">100% Private</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">No ads, no tracking</p>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 sm:p-0">
              <Zap className="w-8 h-8 text-rose-500 flex-shrink-0" />
              <div className="font-semibold text-gray-900 dark:text-white">Real-Time</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Instant updates always</p>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap justify-center gap-6 sm:gap-8 text-sm text-gray-700 dark:text-gray-300 pt-4 px-4">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <span>Made for Families</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414L10 3.586l4.707 4.707a1 1 0 01-1.414 1.414L11 6.414V15a1 1 0 11-2 0V6.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span>Encrypted & Secure</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
            <span>Ad-Free Always</span>
          </div>
        </div>
      </div>
    </div>
  );
}
