import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

const faqs = [
  {
    question: '💰 Is FamilyHub really completely free?',
    answer: 'Yes! FamilyHub is 100% free, forever. Unlimited family members, messaging, photos, video calls, calendar, shopping lists—everything. No credit card required, no hidden fees, no surprises. We\'re funded by donations and believe families shouldn\'t have to pay to stay connected.'
  },
  {
    question: '👨‍👩‍👧‍👦 How many family members can I add?',
    answer: 'Unlimited! Add your entire family—parents, kids, grandparents, cousins, aunts, uncles, everyone. Add as many as you want, and it never costs extra.'
  },
  {
    question: '🖼️ How much photo storage do I get?',
    answer: 'Unlimited! Upload as many photos and videos as you want. FamilyHub has no storage limits. Share your whole life together.'
  },
  {
    question: '🔒 Is my family data private?',
    answer: '100% yes. Your family data is encrypted end-to-end, isolated to your family only, and we never share it with anyone. We never sell your data, never show ads, never track you. Privacy is built in.'
  },
  {
    question: '🚀 What\'s the catch?',
    answer: 'No catch! We built FamilyHub for our own families first. It\'s free because we believe families should be able to stay connected without worrying about cost. If you love it and want to support us, you can donate a coffee ($5) or more—but it\'s completely optional.'
  },
  {
    question: '📱 How do I invite my family members?',
    answer: 'After you sign up, go to Members → Invite. Enter their email addresses and they\'ll get an invite link. They can join with one click—no signup hassle, no fees.'
  },
  {
    question: '🌍 What languages does FamilyHub support?',
    answer: 'English, Spanish, and French. The app automatically detects your browser language. You can also manually switch languages in Settings anytime.'
  },
  {
    question: '📲 Does FamilyHub have a mobile app?',
    answer: 'FamilyHub works beautifully on mobile web (phones, tablets, computers) right now. Native iOS and Android apps are coming in 2026!'
  },
  {
    question: '❓ What if something breaks or I need help?',
    answer: 'Email support@familyhub.app and we\'ll help ASAP. We care about your family\'s experience and stand behind our app.'
  },
  {
    question: '🗑️ Can I delete my account?',
    answer: 'Yes, anytime from Settings → Delete Account. All your family data is deleted immediately and permanently. No waiting period, no questions asked.'
  },
  {
    question: '💝 How can I support FamilyHub?',
    answer: 'If you love FamilyHub and want to help us keep building, you can buy us a coffee ($5 or any amount). Every dollar goes directly to development and server costs. You can also help by telling your friends and family about us!'
  },
  {
    question: '🔄 Will FamilyHub always be free?',
    answer: 'Yes, our commitment is that core features stay free forever. As we add premium features in the future (like AI photo organization), those would be optional upgrades for families who want them—but the essential family connection features will never require payment.'
  }
];

const testimonials = [
  {
    quote: 'We live 2000 miles apart and FamilyHub has brought us so much closer. We message every day, share photos of the kids, and video call every Sunday. Finally feel connected again.',
    author: 'Sarah Smith',
    family: 'The Smith Family',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
  },
  {
    quote: 'One place for messages, photos, events, and shopping lists—instead of juggling 5 different apps and texting 15 people. It\'s made our family so much more organized.',
    author: 'Michael Johnson',
    family: 'The Johnson Family',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael'
  },
  {
    quote: 'My grandparents finally understand how to use technology to stay connected. FamilyHub is so simple they can see photos of the grandkids and video call us without any frustration.',
    author: 'Emily Chen',
    family: 'The Chen Family',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily'
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-4xl mx-auto space-y-16">
        {/* Testimonials */}
        <div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 text-center mb-12">
            Families Love FamilyHub
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="bg-gradient-to-br from-orange-50 to-rose-50 rounded-lg p-6 border border-orange-200">
                <p className="text-gray-700 italic mb-4">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.author}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-600">{testimonial.family}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 text-center mb-12">
            Common Questions
          </h2>
          
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                  <ChevronDown 
                    className={`w-5 h-5 text-orange-500 transition-transform ${
                      openIndex === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                
                {openIndex === idx && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <p className="text-gray-700">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-6 bg-gradient-to-r from-orange-500 via-rose-500 to-teal-500 rounded-3xl p-12 text-white shadow-2xl">
          <h3 className="text-4xl md:text-5xl font-bold">Ready to Bring Your Family Together?</h3>
          <p className="text-xl text-orange-50 max-w-2xl mx-auto">Join families around the world staying connected. It's free, private, and built just for you.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button 
              onClick={() => window.location.href = '/signup'}
              className="bg-white text-orange-500 hover:bg-orange-50 font-bold py-4 px-10 rounded-lg transition text-lg shadow-lg"
            >
              ✨ Get Started Free
            </button>
            <button 
              onClick={() => document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white bg-opacity-20 text-white hover:bg-opacity-30 font-bold py-4 px-10 rounded-lg transition text-lg border-2 border-white"
            >
              Learn More
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
