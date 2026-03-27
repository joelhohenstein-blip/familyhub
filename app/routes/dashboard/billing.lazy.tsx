import { lazy, Suspense } from "react";
import { RouteLoadingFallback } from "~/components/RouteLoadingFallback";

const BillingComponent = lazy(() => import("./billing"));

export default function BillingRoute(props: any) {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <BillingComponent {...props} />
    </Suspense>
  );
}
