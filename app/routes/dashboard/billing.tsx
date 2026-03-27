import type { MetaFunction } from "react-router";
import { useAuth } from "~/utils/auth";
import { useFamily } from "~/utils/familyContext";
import { Button } from "~/components/ui/button";
import { Heart, DollarSign, Download, AlertCircle, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { TierComparison } from "~/components/billing/TierComparison";

interface Tier {
  id: string;
  name: string;
  description?: string;
  priceMonthly?: number | null;
  priceYearly?: number | null;
  features: Record<string, boolean>;
  maxFamilyMembers?: number | null;
  maxStorageGB?: number | null;
  maxMediaLibraryItems?: number | null;
  trialDays?: number;
  displayOrder?: number;
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  issuedAt: Date;
  paidAt?: Date;
  pdfUrl?: string;
}

export const meta: MetaFunction = () => {
  return [
    { title: "Billing - FamilyHub" },
    { name: "description", content: "Manage your FamilyHub subscription and billing" },
  ];
};

export default function BillingDashboard() {
  const { user } = useAuth();
  const { currentFamily } = useFamily();
  const navigate = useNavigate();

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentTier, setCurrentTier] = useState<string>("free");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);

  if (!user) {
    navigate("/login");
    return null;
  }

  useEffect(() => {
    // Load tiers and subscription data
    const loadData = async () => {
      try {
        setLoading(true);
        // TODO: Load from tRPC endpoints
        // For now, using mock data
        setTiers([
          {
            id: "free",
            name: "Free",
            description: "Perfect for getting started",
            priceMonthly: 0,
            priceYearly: 0,
            features: {
              messaging: true,
              photo_gallery: true,
              basic_video_calls: true,
              weather_display: true,
            },
            maxFamilyMembers: 5,
            maxStorageGB: 5,
            maxMediaLibraryItems: 100,
            displayOrder: 0,
          },
          {
            id: "pro",
            name: "Pro",
            description: "For growing families",
            priceMonthly: 999,
            priceYearly: 9990,
            features: {
              messaging: true,
              photo_gallery: true,
              basic_video_calls: true,
              hd_video_calls: true,
              streaming_services: true,
              weather_display: true,
              media_upload: true,
              event_calendar: true,
            },
            maxFamilyMembers: 15,
            maxStorageGB: 100,
            maxMediaLibraryItems: 1000,
            trialDays: 14,
            displayOrder: 1,
          },
          {
            id: "enterprise",
            name: "Enterprise",
            description: "For large families",
            priceMonthly: 1999,
            priceYearly: 19990,
            features: {
              messaging: true,
              photo_gallery: true,
              basic_video_calls: true,
              hd_video_calls: true,
              streaming_services: true,
              weather_display: true,
              media_upload: true,
              event_calendar: true,
              advanced_analytics: true,
              priority_support: true,
            },
            maxFamilyMembers: null,
            maxStorageGB: null,
            maxMediaLibraryItems: null,
            displayOrder: 2,
          },
        ]);
        setCurrentTier("free");
        // TODO: Load actual invoices from tRPC
      } catch (error) {
        console.error("Failed to load billing data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSelectTier = (tierId: string) => {
    // TODO: Implement tier selection with payment flow
    console.log("Selecting tier:", tierId);
  };

  const currentTierData = tiers.find((t) => t.id === currentTier);
  const nextBillingDate = new Date();
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-600 mt-2">Manage your FamilyHub subscription and billing settings</p>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-orange-200">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Current Plan</h2>
              <p className="text-gray-600 mt-1">
                You're on FamilyHub {currentTierData?.name || "Free"}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-orange-500">
                {currentTierData?.priceMonthly === 0 ||
                currentTierData?.priceMonthly === null
                  ? "$0"
                  : `$${((currentTierData?.priceMonthly || 0) / 100).toFixed(2)}`}
              </div>
              <div className="text-gray-600">{billingCycle === "yearly" ? "per year" : "per month"}</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-teal-50 rounded-lg p-6 border border-orange-200">
            <div className="flex items-start gap-4">
              <TrendingUp className="w-6 h-6 text-teal-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Plan Details</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  {currentTierData?.maxFamilyMembers && (
                    <p>
                      <span className="font-semibold">Family Members:</span>{" "}
                      {currentTierData.maxFamilyMembers} allowed
                    </p>
                  )}
                  {currentTierData?.maxStorageGB && (
                    <p>
                      <span className="font-semibold">Storage:</span>{" "}
                      {currentTierData.maxStorageGB} GB
                    </p>
                  )}
                  {currentTierData?.maxMediaLibraryItems && (
                    <p>
                      <span className="font-semibold">Media Items:</span>{" "}
                      {currentTierData.maxMediaLibraryItems} items
                    </p>
                  )}
                  <p>
                    <span className="font-semibold">Next Billing Date:</span>{" "}
                    {nextBillingDate.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Plan features */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Your Plan Includes</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              {currentTierData &&
                Object.entries(currentTierData.features || {})
                  .filter(([_, enabled]) => enabled)
                  .map(([feature]) => (
                    <div key={feature} className="flex items-center gap-2">
                      <span className="text-orange-500 font-bold">✓</span>
                      <span className="text-gray-700">
                        {feature
                          .split("_")
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(" ")}
                      </span>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-4 bg-gray-50 rounded-lg p-4">
        <span
          className={`font-medium ${billingCycle === "monthly" ? "text-gray-900" : "text-gray-600"}`}
        >
          Monthly
        </span>
        <button
          onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
          className="relative inline-flex h-8 w-16 items-center rounded-full bg-orange-300"
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
              billingCycle === "yearly" ? "translate-x-9" : "translate-x-1"
            }`}
          />
        </button>
        <span
          className={`font-medium ${billingCycle === "yearly" ? "text-gray-900" : "text-gray-600"}`}
        >
          Yearly
          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
            Save 17%
          </span>
        </span>
      </div>

      {/* Tier Comparison */}
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Upgrade Your Plan</h2>
        <TierComparison
          tiers={tiers}
          currentTierId={currentTier}
          onSelectTier={handleSelectTier}
          billingCycle={billingCycle}
          loading={loading}
        />
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing History</h2>

        {invoices.length > 0 ? (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div>
                  <p className="font-semibold text-gray-900">Invoice #{invoice.id}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(invoice.issuedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ${(invoice.amount / 100).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600 capitalize">{invoice.status}</p>
                  </div>

                  {invoice.pdfUrl && (
                    <Button
                      onClick={() => window.open(invoice.pdfUrl, "_blank")}
                      className="bg-orange-500 text-white hover:bg-orange-600 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p>No invoices yet. You're on the free plan.</p>
          </div>
        )}
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Methods</h2>

        <div className="space-y-4">
          <p className="text-gray-600">
            Since FamilyHub is completely free, you don't need a payment method on file.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900">No Payment Required</p>
              <p className="text-blue-800 mt-1">
                FamilyHub is free forever. You'll never be charged unless you choose to upgrade or donate.
              </p>
            </div>
          </div>

          <Button
            className="w-full border-2 border-orange-500 text-orange-500 hover:bg-orange-50"
            onClick={() => window.open("https://www.buymeacoffee.com", "_blank")}
          >
            💙 Support with a Donation
          </Button>
        </div>
      </div>

      {/* Support */}
      <div className="bg-gradient-to-r from-orange-50 to-teal-50 rounded-2xl p-8 border border-orange-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Need Help?</h2>
        <p className="text-gray-700 mb-6">
          We're here to help with any questions about your FamilyHub subscription or account.
        </p>
        <Button
          className="bg-orange-500 text-white hover:bg-orange-600"
          onClick={() => (window.location.href = "mailto:support@familyhub.app")}
        >
          Email Support
        </Button>
      </div>
    </div>
  );
}
