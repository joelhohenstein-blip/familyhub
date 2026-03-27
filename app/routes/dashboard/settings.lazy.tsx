import { lazy, Suspense } from "react";
import { RouteLoadingFallback } from "~/components/RouteLoadingFallback";

const SettingsComponent = lazy(() => import("./settings"));

export default function SettingsRoute(props: any) {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <SettingsComponent {...props} />
    </Suspense>
  );
}
