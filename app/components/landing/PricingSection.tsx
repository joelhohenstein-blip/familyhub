import { Check, X } from 'lucide-react';
import { Button } from '~/components/ui/button';

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
  },
  {
    name: 'Support FamilyHub',
    price: '$5',
    period: 'one-time coffee',
    description: 'Help us keep building & improving',
    features: [
      { text: 'Everything in Free tier', included: true },
      { text: '+ Your donation keeps development going', included: true },
      { text: '+ Featured as a supporter (optional)', included: true },
      { text: '+ Our heartfelt thanks ❤️', included: true },
      { text: '', included: false },
      { text: '', included: false },
      { text: '', included: false },
      { text: '', included: false },
      { text: '', included: false },
      { text: '', included: false },
      { text: '', included: false },
      { text: '', included: false }
    ],
    cta: 'Buy Us a Coffee ☕',
    href: 'https://www.buymeacoffee.com',
    popular: false
  }
];

export function PricingSection() {
  return (
    <section className="py-24 px-4 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-6 mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
            Free. Forever.<br />
            <span className="bg-gradient-to-r from-orange-500 to-teal-500 bg-clip-text text-transparent">No Tricks.</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to keep your family connected is completely free. No credit card required. No surprise charges. No hidden fees. Ever.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {tiers.map((tier, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-10 transition-all border-2 ${
                tier.popular
                  ? 'bg-gradient-to-br from-orange-500 to-rose-500 text-white border-orange-600 shadow-2xl md:scale-105'
                  : 'bg-white border-gray-200 hover:border-teal-400'
              }`}
            >
              {tier.popular && (
                <div className="mb-6 inline-block bg-white bg-opacity-20 px-4 py-2 rounded-full text-sm font-bold">
                  ⭐ Recommended
                </div>
              )}
              
              <h3 className={`text-3xl font-bold mb-2 ${tier.popular ? 'text-white' : 'text-gray-900'}`}>
                {tier.name}
              </h3>
              
              <div className="mb-8">
                <div className={`text-5xl font-bold ${tier.popular ? 'text-white' : 'text-gray-900'}`}>
                  {tier.price}
                </div>
                <div className={`text-base font-medium ${tier.popular ? 'text-orange-100' : 'text-gray-600'}`}>
                  {tier.period}
                </div>
              </div>
              
              <p className={`mb-8 text-lg ${tier.popular ? 'text-orange-50' : 'text-gray-700'}`}>
                {tier.description}
              </p>
              
              <Button
                className={`w-full mb-10 py-6 text-lg font-bold rounded-lg transition-all ${
                  tier.popular
                    ? 'bg-white text-orange-500 hover:bg-orange-50 shadow-lg'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
                onClick={() => window.location.href = tier.href}
              >
                {tier.cta}
              </Button>

              <div className="space-y-3">
                {tier.features.map((feature, fidx) => (
                  feature.text && (
                    <div key={fidx} className="flex items-center gap-3">
                      {feature.included ? (
                        <Check className={`w-6 h-6 flex-shrink-0 font-bold ${tier.popular ? 'text-white' : 'text-orange-500'}`} />
                      ) : (
                        <X className={`w-6 h-6 flex-shrink-0 ${tier.popular ? 'text-orange-200' : 'text-gray-400'}`} />
                      )}
                      <span className={`text-base ${
                        feature.included
                          ? tier.popular ? 'text-orange-50' : 'text-gray-800'
                          : tier.popular ? 'text-orange-200 line-through' : 'text-gray-500 line-through'
                      }`}>
                        {feature.text}
                      </span>
                    </div>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Promise */}
        <div className="mt-16 bg-gradient-to-r from-teal-50 to-orange-50 rounded-3xl p-12 border-2 border-teal-200 text-center">
          <h4 className="text-2xl font-bold text-gray-900 mb-4">
            Our Promise to You
          </h4>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
            FamilyHub will always be free for everyone. We believe families shouldn't have to pay to stay connected. We're funded by the community, not venture capital. If you love what we're building, consider buying us a coffee—it helps us keep growing.
          </p>
        </div>
      </div>
    </section>
  );
}