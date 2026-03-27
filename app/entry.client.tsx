// Copyright © 2026 Hohenstein. All rights reserved.

import { HydratedRouter } from "react-router/dom";
import { hydrateRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, createTRPCClient } from "~/utils/trpc";
import { Watermark } from "~/watermark";
import { TooltipProvider } from "~/components/ui/tooltip";
import { AuthProvider } from "~/utils/auth";
import { FamilyProvider } from "~/utils/familyContext";
import { ErrorBoundary } from "~/components/ErrorBoundary";
import { I18nProvider } from "~/providers/I18nProvider";
import { Toaster } from "~/components/ui/sonner";
import { initSentryClient } from "~/utils/sentry.client";

// Initialize Sentry on client
initSentryClient();

// Global flag to track if React hydration succeeded
declare global {
  var __reactHydrated: boolean;
}

function hydrate() {
  console.log('🔄 Starting React hydration...');
  console.log('📄 Document ready state:', document.readyState);
  console.log('📄 Document body:', document.body ? 'exists' : 'missing');
  
  try {
    // Create clients for hydration
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          staleTime: 1000 * 60,
        },
      },
    });
    const trpcClient = createTRPCClient();

    // Use hydrateRoot to hydrate the server-rendered HTML
    // Hydrate into document.documentElement (the <html> element)
    hydrateRoot(
      document.documentElement,
      <ErrorBoundary>
        <I18nProvider>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <FamilyProvider>
                  <TooltipProvider>
                    <HydratedRouter />
                  </TooltipProvider>
                </FamilyProvider>
              </AuthProvider>
            </QueryClientProvider>
          </trpc.Provider>
        </I18nProvider>
        <Toaster />
        <Watermark />
      </ErrorBoundary>
    );
    console.log('✅ hydrateRoot called successfully');
  } catch (error) {
    console.error('❌ hydrateRoot error:', error);
  }
  
  // Mark hydration as complete
  globalThis.__reactHydrated = true;
  console.log('✅ React hydration complete');
}

hydrate();
