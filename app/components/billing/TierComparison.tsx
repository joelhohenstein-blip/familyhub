import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '~/components/ui/button';

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

interface TierComparisonProps {
  tiers: Tier[];
  currentTierId?: string;
  onSelectTier?: (tierId: string) => void;
  billingCycle?: 'monthly' | 'yearly';
  loading?: boolean;
}

/**
 * TierComparison component displays subscription tiers in a comparison table
 * Shows features by tier and user's current tier
 */
export function TierComparison({
  tiers,
  currentTierId,
  onSelectTier,
  billingCycle = 'monthly',
  loading = false,
}: TierComparisonProps) {
  // Get all unique features across all tiers
  const allFeatures = useMemo(() => {
    const features = new Set<string>();
    tiers.forEach((tier) => {
      Object.keys(tier.features || {}).forEach((feature) => features.add(feature));
    });
    return Array.from(features).sort();
  }, [tiers]);

  const formatPrice = (cents: number | null | undefined): string => {
    if (!cents || cents === 0) return 'Free';
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatFeatureName = (feature: string): string => {
    return feature
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-max">
        {/* Tier Headers */}
        <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: `200px repeat(${tiers.length}, 1fr)` }}>
          {/* Feature column header */}
          <div className="font-bold text-lg text-gray-900">Features</div>

          {/* Tier headers */}
          {tiers.map((tier) => (
            <div key={tier.id} className="bg-gradient-to-br from-orange-50 to-teal-50 rounded-lg p-4 border-2 border-orange-200">
              <h3 className="font-bold text-lg text-gray-900 mb-1">{tier.name}</h3>
              {tier.description && (
                <p className="text-sm text-gray-600 mb-3">{tier.description}</p>
              )}

              {/* Price */}
              <div className="mb-4">
                <div className="text-2xl font-bold text-orange-500">
                  {formatPrice(
                    billingCycle === 'yearly' ? tier.priceYearly : tier.priceMonthly
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {billingCycle === 'yearly' ? 'per year' : 'per month'}
                </div>
              </div>

              {/* Trial info */}
              {tier.trialDays && tier.trialDays > 0 && (
                <div className="mb-4 text-sm text-gray-600">
                  {tier.trialDays} day free trial
                </div>
              )}

              {/* CTA Button */}
              <Button
                onClick={() => onSelectTier?.(tier.id)}
                disabled={loading || currentTierId === tier.id}
                className={`w-full ${
                  currentTierId === tier.id
                    ? 'bg-gray-400 text-white'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {currentTierId === tier.id ? 'Current Plan' : 'Select Plan'}
              </Button>
            </div>
          ))}
        </div>

        {/* Feature Rows */}
        <div className="space-y-2">
          {allFeatures.map((feature) => (
            <div
              key={feature}
              className="grid gap-4 py-4 border-b border-gray-200 hover:bg-gray-50"
              style={{ gridTemplateColumns: `200px repeat(${tiers.length}, 1fr)` }}
            >
              {/* Feature name */}
              <div className="font-medium text-gray-700">
                {formatFeatureName(feature)}
              </div>

              {/* Feature availability by tier */}
              {tiers.map((tier) => (
                <div
                  key={`${tier.id}-${feature}`}
                  className="flex justify-center items-center"
                >
                  {tier.features?.[feature] ? (
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-gray-600">Included</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <X className="w-5 h-5 text-gray-300" />
                      <span className="text-sm text-gray-400">—</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Limits Row */}
        {tiers.some((t) => t.maxFamilyMembers) && (
          <div className="grid gap-4 py-4 border-b border-gray-200 bg-gray-50">
            <div className="font-medium text-gray-900">Family Members</div>
            {tiers.map((tier) => (
              <div key={`${tier.id}-members`} className="text-center text-gray-700">
                {tier.maxFamilyMembers ? `Up to ${tier.maxFamilyMembers}` : 'Unlimited'}
              </div>
            ))}
          </div>
        )}

        {tiers.some((t) => t.maxStorageGB) && (
          <div className="grid gap-4 py-4 border-b border-gray-200">
            <div className="font-medium text-gray-900">Storage</div>
            {tiers.map((tier) => (
              <div key={`${tier.id}-storage`} className="text-center text-gray-700">
                {tier.maxStorageGB ? `${tier.maxStorageGB} GB` : 'Unlimited'}
              </div>
            ))}
          </div>
        )}

        {tiers.some((t) => t.maxMediaLibraryItems) && (
          <div className="grid gap-4 py-4 bg-gray-50">
            <div className="font-medium text-gray-900">Media Items</div>
            {tiers.map((tier) => (
              <div key={`${tier.id}-media`} className="text-center text-gray-700">
                {tier.maxMediaLibraryItems ? `Up to ${tier.maxMediaLibraryItems}` : 'Unlimited'}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
