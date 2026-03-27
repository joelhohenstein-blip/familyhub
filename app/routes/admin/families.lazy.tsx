import { lazy, Suspense } from "react";
import { RouteLoadingFallback } from "~/components/RouteLoadingFallback";

const AdminFamiliesComponent = lazy(() => import("./families"));

export default function AdminFamiliesRoute(props: any) {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <AdminFamiliesComponent {...props} />
    </Suspense>
  );
}
