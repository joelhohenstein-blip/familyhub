import { AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface UpgradePromptProps {
  feature: string;
  currentTier: string;
  requiredTier: {
    id: string;
    name: string;
    priceMonthly?: number | null;
    priceYearly?: number | null;
  };
  onUpgrade?: () => void;
  onDismiss?: () => void;
  billingCycle?: 'monthly' | 'yearly';
}

/**
 * UpgradePrompt component shows when user tries to access a feature
 * outside their subscription tier. Displays upgrade options with pricing.
 */
export function UpgradePrompt({
  feature,
  currentTier,
  requiredTier,
  onUpgrade,
  onDismiss,
  billingCycle = 'monthly',
}: UpgradePromptProps) {
  const formatPrice = (cents: number | null | undefined): string => {
    if (!cents || cents === 0) return 'Free';
    return `$${(cents / 100).toFixed(2)}`;
  };

  const price = formatPrice(
    billingCycle === 'yearly' ? requiredTier.priceYearly : requiredTier.priceMonthly
  );

  const formatFeatureName = (name: string): string => {
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in">
        {/* Header with icon */}
        <div className="flex items-center justify-center">
          <div className="bg-orange-100 p-3 rounded-full">
            <AlertCircle className="w-6 h-6 text-orange-500" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Upgrade Required
          </h2>
          <p className="text-gray-600">
            The <span className="font-semibold">{formatFeatureName(feature)}</span> feature
            is not available in your current plan
          </p>
        </div>

        {/* Tier information */}
        <div className="bg-gradient-to-br from-orange-50 to-teal-50 rounded-lg p-4 border border-orange-200">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 mb-1">Your Current Plan</p>
              <p className="font-bold text-gray-900">
                {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
              </p>
            </div>

            <div className="flex items-center justify-center my-2">
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Required Plan</p>
              <p className="font-bold text-gray-900">{requiredTier.name}</p>
            </div>

            <div className="border-t border-orange-200 pt-3">
              <p className="text-sm text-gray-600 mb-1">Pricing</p>
              <p className="text-xl font-bold text-orange-500">
                {price}
                <span className="text-sm text-gray-600 ml-2">
                  {billingCycle === 'yearly' ? 'per year' : 'per month'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Benefits preview */}
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">
            By upgrading you'll get:
          </p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-orange-500 font-bold">✓</span>
              Access to {formatFeatureName(feature)}
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-orange-500 font-bold">✓</span>
              All features from lower tiers
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-orange-500 font-bold">✓</span>
              Priority support
            </li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={onDismiss}
            variant="outline"
            className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Not Now
          </Button>
          <Button
            onClick={onUpgrade}
            className="flex-1 bg-orange-500 text-white hover:bg-orange-600 flex items-center justify-center gap-2"
          >
            Upgrade Now
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Footer note */}
        <p className="text-xs text-center text-gray-500">
          You can always upgrade or downgrade your plan at any time.
        </p>
      </div>
    </div>
  );
}
