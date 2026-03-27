import { lazy, Suspense } from "react";
import { RouteLoadingFallback } from "~/components/RouteLoadingFallback";

const AdminModerationComponent = lazy(() => import("./moderation"));

export default function AdminModerationRoute(props: any) {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <AdminModerationComponent {...props} />
    </Suspense>
  );
}
