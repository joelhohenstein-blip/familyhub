import { lazy, Suspense } from "react";
import { RouteLoadingFallback } from "~/components/RouteLoadingFallback";

const OnboardingComponent = lazy(() => import("./onboarding"));

export default function OnboardingRoute(props: any) {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <OnboardingComponent {...props} />
    </Suspense>
  );
}
