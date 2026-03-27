import { ReactNode } from "react";
import { trpc } from "../../utils/trpc";
import { Button } from "../ui/button";
import { AlertCircle } from "lucide-react";

interface FeatureGateProps {
  featureName: string;
  children: ReactNode;
  fallback?: ReactNode;
  onUpgradeClick?: () => void;
}

export function FeatureGate({
  featureName,
  children,
  fallback,
  onUpgradeClick,
}: FeatureGateProps) {
  const canAccessQuery = trpc.tierAccess.canAccessFeature.useQuery({
    featureName,
  });

  if (canAccessQuery.isLoading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  if (canAccessQuery.error) {
    return <div className="text-red-600">Error checking access</div>;
  }

  const canAccess = canAccessQuery.data?.allowed ?? false;

  if (canAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const requiredTier = canAccessQuery.data?.requiredTier ?? "premium";

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900">Premium Feature</h3>
          <p className="text-sm text-yellow-800 mt-1">
            This feature is only available with a {requiredTier} subscription.
          </p>
          <Button
            onClick={onUpgradeClick}
            variant="outline"
            size="sm"
            className="mt-3"
          >
            Upgrade to Premium
          </Button>
        </div>
      </div>
    </div>
  );
}
