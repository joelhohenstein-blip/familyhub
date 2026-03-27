import type { MetaFunction } from "react-router";
import { Button } from "~/components/ui/button";
import { LanguageToggle } from "~/components/LanguageToggle";
import { Check, X, Heart } from "lucide-react";

export const meta: MetaFunction = () => {
  return [
    { title: "Pricing - FamilyHub" },
    { name: "description", content: "Free forever family communication app. No hidden fees, no surprises." },
  ];
};

const tiers = [
  {
    name: 'FamilyHub Free',
    price: '$0',
    period: 'Forever',
    description: 'Everything you need, no strings attached',
    features: [
      { text: '✨ UNLIMITED family members', included: true },
      { text: '💬 UNLIMITED messaging & chat', included: true },
      { text: '📸 UNLIMITED photo & video gallery', included: true },
      { text: '🎥 1-on-1 & group video calls', included: true },
      { text: '🛒 Shopping lists & task management', included: true },
      { text: '📆 Family calendar & event coordination', included: true },
      { text: '⛅ Weather widget & streaming theater', included: true },
      { text: '🌍 Multi-language support (EN, ES, FR)', included: true },
      { text: '🔒 100% encrypted & private', included: true },
      { text: '📧 Community support', included: true },
      { text: 'No ads, ever', included: true },
      { text: 'No hidden fees, no credit card', included: true }
    ],
    cta: 'Get Started Free',
    href: '/signup',
    popular: true
  }
];

const features = [
  {
    category: "Communication",
    items: [
      { name: "Unlimited Family Members", free: true },
      { name: "Threaded Messaging", free: true },
      { name: "1-on-1 Private Chat", free: true },
      { name: "Group Chat Rooms", free: true },
      { name: "Typing Indicators & Online Status", free: true },
      { name: "Emoji Reactions", free: true }
    ]
  },
  {
    category: "Multimedia",
    items: [
      { name: "Unlimited Photo Gallery", free: true },
      { name: "Video Upload & Sharing", free: true },
      { name: "High-Quality Video Calls (1-on-1)", free: true },
      { name: "Group Video Calls", free: true },
      { name: "Screen Sharing", free: true },
      { name: "Real-Time Presence", free: true }
    ]
  },
  {
    category: "Organization",
    items: [
      { name: "Family Calendar", free: true },
      { name: "Event Coordination", free: true },
      { name: "Shopping Lists", free: true },
      { name: "Task Management", free: true },
      { name: "Item Assignment", free: true },
      { name: "Category Organization", free: true }
    ]
  },
  {
    category: "Privacy & Access",
    items: [
      { name: "End-to-End Encryption", free: true },
      { name: "Ad-Free Experience", free: true },
      { name: "No Data Selling", free: true },
      { name: "Family-Only Access", free: true },
      { name: "Role-Based Permissions", free: true },
      { name: "Admin Controls", free: true }
    ]
  }
];

export default function Pricing() {
  return (
    <>
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageToggle />
      </div>

      <div className="min-h-screen bg-white">
        {/* Header Navigation */}
        <header className="bg-gradient-to-r from-orange-50 to-teal-50 border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-lg">
                <img src="/family-logo.svg" alt="FamilyHub" className="w-full h-full" />
              </div>
              <span className="font-bold text-xl text-gray-900">FamilyHub</span>
            </a>
            <nav className="flex gap-6">
              <a href="/#features" className="text-gray-700 hover:text-orange-500 transition">Features</a>
              <a href="/" className="text-gray-700 hover:text-orange-500 transition">Home</a>
            </nav>
          </div>
        </header>

        {/* Pricing Hero */}
        <section className="py-20 px-4 bg-gradient-to-br from-orange-50 to-teal-50">
          <div className="max-w-6xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900">
              Free. Forever.<br />
              <span className="bg-gradient-to-r from-orange-500 to-teal-500 bg-clip-text text-transparent">No Tricks.</span>
            </h1>
            
            <p className="text-2xl text-gray-700 max-w-3xl mx-auto">
              Everything you need to keep your family connected is completely free. No credit card required. No hidden fees. Ever.
            </p>

            <div className="bg-white rounded-2xl p-12 shadow-xl max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">FamilyHub Free</h2>
              
              <div className="mb-8">
                <div className="text-6xl font-bold text-orange-500 mb-2">$0</div>
                <div className="text-xl text-gray-600">Forever</div>
              </div>

              <p className="text-lg text-gray-700 mb-8">
                Everything you need, no strings attached
              </p>

              <Button
                className="w-full bg-orange-500 text-white hover:bg-orange-600 font-bold py-4 px-6 text-lg rounded-lg mb-8 shadow-lg"
                onClick={() => window.location.href = '/signup'}
              >
                ✨ Get Started Free
              </Button>

              <div className="space-y-4">
                {[
                  'UNLIMITED family members',
                  'UNLIMITED messaging & chat',
                  'UNLIMITED photo & video gallery',
                  'Video calls (1-on-1 & group)',
                  'Shopping lists & tasks',
                  'Family calendar & events',
                  'Multi-language support',
                  '100% encrypted & private'
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Check className="w-6 h-6 text-orange-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Full Feature Comparison */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-gray-900 text-center mb-16">
              Complete Feature List
            </h2>

            <div className="space-y-12">
              {features.map((category, idx) => (
                <div key={idx}>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b-2 border-orange-200">
                    {category.category}
                  </h3>
                  
                  <div className="grid sm:grid-cols-2 gap-6">
                    {category.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <Check className="w-5 h-5 text-orange-500 flex-shrink-0" />
                        <span className="text-gray-700 font-medium">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why FamilyHub */}
        <section className="py-20 px-4 bg-gradient-to-br from-orange-50 to-teal-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-gray-900 text-center mb-16">
              Why FamilyHub is Different
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-lg space-y-4">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-2xl font-bold text-gray-900">No VC Funding</h3>
                <p className="text-gray-700">
                  We're not beholden to investors pushing ads and data harvesting. We answer to families, not shareholders.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg space-y-4">
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="text-2xl font-bold text-gray-900">Privacy First</h3>
                <p className="text-gray-700">
                  Your family data stays yours. We'll never sell it, never track it, never monetize it. Period.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg space-y-4">
                <div className="text-4xl mb-4">♾️</div>
                <h3 className="text-2xl font-bold text-gray-900">Free Forever</h3>
                <p className="text-gray-700">
                  Core features are free forever. Donations keep us sustainable without forcing anyone to pay.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg space-y-4">
                <div className="text-4xl mb-4">👥</div>
                <h3 className="text-2xl font-bold text-gray-900">Community-Driven</h3>
                <p className="text-gray-700">
                  Features come from what families ask for. You help shape what we build next.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 bg-gradient-to-r from-orange-500 via-rose-500 to-teal-500">
          <div className="max-w-2xl mx-auto text-center space-y-6 text-white">
            <h2 className="text-4xl font-bold">Ready to Connect Your Family?</h2>
            <p className="text-xl text-orange-50">
              Start free today. No credit card. No surprises.
            </p>
            <Button
              className="bg-white text-orange-500 hover:bg-orange-50 font-bold py-4 px-10 text-lg rounded-lg inline-block"
              onClick={() => window.location.href = '/signup'}
            >
              Get Started Free
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-300 py-12 px-4">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h4 className="text-white font-semibold mb-4">FamilyHub</h4>
                <p className="text-sm text-gray-400">
                  Bringing families closer together through secure, modern technology.
                </p>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Product</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="/#features" className="hover:text-white transition">Features</a></li>
                  <li><a href="/" className="hover:text-white transition">Home</a></li>
                  <li><a href="/privacy" className="hover:text-white transition">Privacy</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Support</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="mailto:support@familyhub.app" className="hover:text-white transition">Contact</a></li>
                  <li><a href="https://www.buymeacoffee.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Donate</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8">
              <p className="text-center text-sm text-gray-400">
                © 2026 FamilyHub. Made with ❤️ for families everywhere.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
