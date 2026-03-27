import { lazy, Suspense } from "react";
import { RouteLoadingFallback } from "~/components/RouteLoadingFallback";

const PricingComponent = lazy(() => import("./pricing"));

export default function PricingRoute(props: any) {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <PricingComponent {...props} />
    </Suspense>
  );
}
