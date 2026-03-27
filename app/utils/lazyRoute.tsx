import { lazy, Suspense, ComponentType } from "react";
import { RouteLoadingFallback } from "./RouteLoadingFallback";

/**
 * Wraps a route component with React.lazy() and Suspense boundary
 * Use this for non-critical routes to enable code splitting
 * 
 * @example
 * const PricingPage = lazyRoute(() => import("./pricing"));
 * 
 * Then in your route component:
 * export default PricingPage;
 */
export function lazyRoute<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): T {
  const LazyComponent = lazy(importFn);
  
  // Return a wrapper component that includes Suspense
  return ((props: any) => (
    <Suspense fallback={<RouteLoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  )) as unknown as T;
}

/**
 * Alternative: Use this hook in your route component if you prefer
 * to manage Suspense at the route level
 */
export function useLazyRoute<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): T {
  return lazy(importFn) as unknown as T;
}
