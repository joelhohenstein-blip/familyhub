import { useState } from "react";
import { Button } from "../ui/button";
import { Loader2, Check } from "lucide-react";
import { trpc } from "../../utils/trpc";

interface PlanSelectorProps {
  currentTier?: string;
  onSuccess?: () => void;
}

export function PlanSelector({ currentTier = "free", onSuccess }: PlanSelectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkout = trpc.billing.initiateStripeCheckout.useMutation({
    onMutate: () => {
      setIsLoading(true);
      setError(null);
    },
    onSuccess: (data) => {
      setIsLoading(false);
      if (data.url) {
        window.location.href = data.url;
      }
      onSuccess?.();
    },
    onError: (error) => {
      setIsLoading(false);
      setError(error.message || "Failed to initiate checkout");
    },
  });

  const plans = [
    {
      name: "Free",
      tier: "free",
      price: "$0",
      features: [
        "Message board access",
        "View family photos",
        "View family videos",
        "Local weather display",
        "Stream free movies",
      ],
    },
    {
      name: "Premium",
      tier: "premium",
      price: "$9.99",
      period: "per month",
      features: [
        "Everything in Free",
        "Audio/Video calls",
        "Upload photos and videos",
        "Advanced streaming services",
        "Priority support",
      ],
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {plans.map((plan) => (
        <div
          key={plan.tier}
          className={`rounded-lg border p-6 ${
            currentTier === plan.tier
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200"
          }`}
        >
          <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
          <div className="mb-4">
            <span className="text-3xl font-bold">{plan.price}</span>
            {plan.period && <span className="text-gray-600 ml-2">{plan.period}</span>}
          </div>

          <ul className="mb-6 space-y-2">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center text-sm">
                <Check className="mr-2 h-4 w-4 text-green-600" />
                {feature}
              </li>
            ))}
          </ul>

          {currentTier === plan.tier ? (
            <Button disabled variant="outline" className="w-full">
              Current Plan
            </Button>
          ) : (
            <Button
              onClick={() =>
                checkout.mutate({
                  planId: plan.tier,
                  tier: plan.tier as "premium",
                })
              }
              disabled={isLoading || plan.tier === "free"}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : plan.tier === "free" ? (
                "Downgrade"
              ) : (
                "Upgrade to Premium"
              )}
            </Button>
          )}
        </div>
      ))}

      {error && <div className="col-span-full text-sm text-red-600">{error}</div>}
    </div>
  );
}
