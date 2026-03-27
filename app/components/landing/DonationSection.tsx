import { Heart, Coffee, Rocket, Users } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { useNavigate } from 'react-router';

export function DonationSection() {
  const navigate = useNavigate();
  return (
    <section className="py-24 px-4 bg-gradient-to-br from-orange-500 via-rose-500 to-teal-500">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-6 text-white">
          <div className="flex justify-center mb-4">
            <Heart className="w-16 h-16 fill-current animate-pulse" />
          </div>

          <h2 className="text-4xl md:text-6xl font-bold leading-tight">
            Love FamilyHub?<br />
            Help Us Keep Growing
          </h2>

          <p className="text-lg md:text-xl text-orange-50 max-w-2xl mx-auto">
            FamilyHub is built with ❤️ to help families stay connected. We're not backed by venture capital—we're powered by people like you who believe in keeping families connected without corporate bloat.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Donation Card */}
          <div className="bg-white bg-opacity-95 rounded-2xl p-10 space-y-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <Coffee className="w-8 h-8 text-orange-500" />
              <h3 className="text-2xl font-bold text-gray-900">Support Our Mission</h3>
            </div>

            <p className="text-gray-700 leading-relaxed">
              Your donation directly supports FamilyHub development. Every coffee helps us:
            </p>

            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold mt-1">✓</span>
                <span>Build new features families request</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold mt-1">✓</span>
                <span>Keep servers running smoothly</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold mt-1">✓</span>
                <span>Maintain 24/7 security & privacy</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold mt-1">✓</span>
                <span>Stay 100% ad-free forever</span>
              </li>
            </ul>

            <Button
              className="w-full bg-orange-500 text-white hover:bg-orange-600 font-bold py-4 px-6 text-lg rounded-lg transition shadow-lg inline-flex items-center justify-center gap-2"
              onClick={() => navigate('/signup')}
            >
              <Coffee className="w-5 h-5" />
              Buy Us a Coffee ☕
            </Button>

            <p className="text-xs text-gray-600 text-center">
              Any amount helps. Even $1 makes a difference. 🙏
            </p>
          </div>

          {/* Why It Matters Card */}
          <div className="bg-gray-900 bg-opacity-70 backdrop-blur-md rounded-2xl p-10 text-white space-y-6 border border-white border-opacity-30">
            <div className="flex items-center gap-3">
              <Rocket className="w-8 h-8" />
              <h3 className="text-2xl font-bold">Why We're Different</h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="font-semibold text-white mb-2">🚀 No VC Funding</p>
                <p className="text-sm text-gray-200">We're not beholden to investors pushing ads and data harvesting. We answer to families, not shareholders.</p>
              </div>

              <div>
                <p className="font-semibold text-white mb-2">🔒 Privacy First</p>
                <p className="text-sm text-gray-200">Your family data stays yours. We'll never sell it, never track it, never monetize it. Period.</p>
              </div>

              <div>
                <p className="font-semibold text-white mb-2">♾️ Free Forever</p>
                <p className="text-sm text-gray-200">Core features are free forever. Donations keep us sustainable without forcing anyone to pay.</p>
              </div>

              <div>
                <p className="font-semibold text-white mb-2">👥 Community-Driven</p>
                <p className="text-sm text-gray-200">Features come from what families ask for. You help shape what we build next.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Message */}
        <div className="text-center text-white space-y-3 pt-8 border-t border-white border-opacity-20">
          <p className="text-lg font-semibold">Even if you can't donate, telling your friends about FamilyHub helps us grow 💙</p>
          <p className="text-sm text-orange-100">Thank you for being part of the FamilyHub community. Let's keep families connected.</p>
        </div>
      </div>
    </section>
  );
}
