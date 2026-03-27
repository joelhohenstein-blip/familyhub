import { lazy, Suspense } from "react";
import { RouteLoadingFallback } from "~/components/RouteLoadingFallback";

const GuideComponent = lazy(() => import("./guide"));

export default function GuideRoute(props: any) {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <GuideComponent {...props} />
    </Suspense>
  );
}
