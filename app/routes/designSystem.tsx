import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';

export default function DesignSystem() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-2">
            FamilyHub Design System
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            Warm, welcoming, and family-focused components and patterns
          </p>
        </div>

        {/* Color Palette */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">
            Color Palette
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Primary (Amber)', hex: '#F59E0B', bg: 'bg-amber-500' },
              { name: 'Secondary (Orange)', hex: '#FB923C', bg: 'bg-orange-400' },
              { name: 'Accent (Rose)', hex: '#F43F5E', bg: 'bg-rose-500' },
              { name: 'Warm (Yellow)', hex: '#FBBF24', bg: 'bg-amber-400' },
              { name: 'Text Dark', hex: '#1E293B', bg: 'bg-slate-900' },
              { name: 'Text Light', hex: '#F1F5F9', bg: 'bg-slate-100' },
              { name: 'Border', hex: '#E2E8F0', bg: 'bg-slate-200' },
              { name: 'Success', hex: '#10B981', bg: 'bg-emerald-500' },
            ].map((color) => (
              <Card key={color.name} className="p-4 text-center">
                <div className={`${color.bg} h-24 rounded-lg mb-3`} />
                <p className="font-semibold text-slate-900 dark:text-white">{color.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{color.hex}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Buttons */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">
            Buttons
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <p className="font-semibold text-slate-900 dark:text-white mb-4">Primary</p>
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                Primary Button
              </Button>
            </Card>
            <Card className="p-6">
              <p className="font-semibold text-slate-900 dark:text-white mb-4">Secondary</p>
              <Button variant="outline" className="w-full border-orange-400 text-orange-600 hover:bg-orange-50">
                Secondary Button
              </Button>
            </Card>
            <Card className="p-6">
              <p className="font-semibold text-slate-900 dark:text-white mb-4">Disabled</p>
              <Button disabled className="w-full">
                Disabled Button
              </Button>
            </Card>
          </div>
        </section>

        {/* Typography */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">
            Typography
          </h2>
          <Card className="p-8 space-y-6">
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Heading 1</p>
              <h1 className="text-5xl font-bold text-slate-900 dark:text-white">
                Welcome to FamilyHub
              </h1>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Heading 2</p>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                Connect with Family
              </h2>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Body Text</p>
              <p className="text-lg text-slate-700 dark:text-slate-300">
                This is a body paragraph. It should be readable and comfortable for extended reading.
                We use warm, friendly tones throughout the application.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Small Text</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                This is small text used for captions, helper text, and secondary information.
              </p>
            </div>
          </Card>
        </section>

        {/* Cards */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">
            Cards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="h-32 bg-gradient-to-br from-amber-300 to-orange-400 rounded-lg mb-4" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Card Title
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                This is a card with a featured image, title, and description. Perfect for content preview.
              </p>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/20 dark:to-orange-950/20 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Featured Card
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                This card has a subtle gradient background to highlight important content.
              </p>
              <Button className="w-full" variant="default">
                Learn More
              </Button>
            </Card>
          </div>
        </section>

        {/* Design Principles */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">
            Design Principles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'Warm & Welcoming',
                description: 'Amber, orange, and rose tones create a family-friendly atmosphere that feels safe and inviting.',
              },
              {
                title: 'Clear & Readable',
                description: 'High contrast, generous spacing, and readable fonts ensure accessibility for all ages.',
              },
              {
                title: 'Responsive Design',
                description: 'Mobile-first approach ensures the app works seamlessly on phones, tablets, and desktops.',
              },
              {
                title: 'Real-time Updates',
                description: 'Messages, photos, and activities appear instantly with smooth animations.',
              },
            ].map((principle) => (
              <Card key={principle.title} className="p-6 border-l-4 border-l-amber-500">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {principle.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {principle.description}
                </p>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
