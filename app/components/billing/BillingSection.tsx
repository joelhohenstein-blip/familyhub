import { trpc } from "../../utils/trpc";
import { BillingPortalButton } from "./BillingPortalButton";
import { PlanSelector } from "./PlanSelector";
import { Loader2 } from "lucide-react";

export function BillingSection() {
  const subscriptionQuery = trpc.billing.checkSubscriptionStatus.useQuery();

  if (subscriptionQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
        <span className="ml-2 text-gray-600">Loading subscription details...</span>
      </div>
    );
  }

  if (subscriptionQuery.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Error loading subscription details. Please try again later.
      </div>
    );
  }

  const subscription = subscriptionQuery.data;
  const currentTier = subscription?.tier || "free";
  const currentPeriodEnd = subscription?.currentPeriodEnd;

  return (
    <div className="space-y-8">
      {/* Current Subscription Status */}
      <div className="rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold mb-4">Subscription Status</h2>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Current Plan</p>
            <p className="text-lg font-semibold capitalize">
              {currentTier === "free" ? "Free" : "Premium"}
            </p>
          </div>

          {currentPeriodEnd && currentTier !== "free" && (
            <div>
              <p className="text-sm text-gray-600">Next Billing Date</p>
              <p className="text-lg font-semibold">
                {new Date(currentPeriodEnd).toLocaleDateString()}
              </p>
            </div>
          )}

          {currentTier !== "free" && (
            <div className="pt-4 border-t border-gray-200">
              <BillingPortalButton />
            </div>
          )}
        </div>
      </div>

      {/* Plan Selection */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Plans</h2>
        <PlanSelector currentTier={currentTier} />
      </div>
    </div>
  );
}
