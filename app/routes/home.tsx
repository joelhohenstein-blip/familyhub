import type { MetaFunction } from "react-router";
import { useAuth } from "~/utils/auth";
import { usePageTracking } from "~/hooks/usePageTracking";
import { LanguageToggle } from "~/components/LanguageToggle";
import { HeroSection } from "~/components/landing/HeroSection";
import { FeaturesSection } from "~/components/landing/FeaturesSection";
import { PricingSection } from "~/components/landing/PricingSection";
import { FAQSection } from "~/components/landing/FAQSection";
import { DonationSection } from "~/components/landing/DonationSection";

export const meta: MetaFunction = () => {
  return [
    { title: "FamilyHub - Stay Connected with Your Family" },
    { name: "description", content: "The modern app for families to stay connected with messaging, video calls, photo sharing, and more." },
  ];
};

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();
  usePageTracking();

  return (
    <>
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageToggle />
      </div>

      {/* Landing Page */}
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <FAQSection />
      <DonationSection />

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
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><a href="/privacy" className="hover:text-white transition">Privacy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:support@familyhub.com" className="hover:text-white transition">Contact</a></li>
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
    </>
  );
}
