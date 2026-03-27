// Copyright © 2026 Hohenstein. All rights reserved.

/**
 * By default, React Router will handle generating the HTTP Response for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx react-router reveal` ✨
 * For more information, see https://reactrouter.com/start/framework/entry.server
 */

import { PassThrough } from "node:stream";

import type { AppLoadContext } from "react-router";
type EntryContext = any; // React Router 7.9+ changed this type
import { createReadableStreamFromReadable } from "@react-router/node";
import { ServerRouter } from "react-router";
import isbot from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, createSSRClient } from "~/utils/trpc";
import { ErrorBoundary } from "~/components/ErrorBoundary";
import { I18nProvider } from "~/providers/I18nProvider";
import { TooltipProvider } from "~/components/ui/tooltip";
import { AuthProvider } from "~/utils/auth";
import { FamilyProvider } from "~/utils/familyContext";
import { Toaster } from "~/components/ui/sonner";
import { createWebSocketServer } from "~/server/websocket.server";

// Global error handlers to prevent crashes in production
// These catch unhandled errors and keep the server running
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('⚠️  Uncaught Exception:', error.message);
  // Don't exit - let the server continue running
});

// Initialize WebSocket server (singleton pattern)
// Use global to prevent multiple instances during hot reloads
declare global {
  var __wsServerInitialized: boolean | undefined;
}

if (!global.__wsServerInitialized) {
  global.__wsServerInitialized = true;
  try {
    const wss = createWebSocketServer(3002);
    if (wss) {
      console.log('🔌 WebSocket server initialization started on port 3002');
    } else {
      console.warn('⚠️  WebSocket server not available - app will run without real-time features');
    }
  } catch (error) {
    console.error('Failed to start WebSocket server:', error);
    // Don't crash - app works without WebSocket
  }
}

// Increased timeout for production (slow initial renders, cold starts)
const ABORT_DELAY = 15_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  loadContext: AppLoadContext,
) {
  return isbot(request.headers.get("user-agent"))
    ? handleBotRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext,
      )
    : handleBrowserRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext,
      );
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    
    // Create server-side clients for SSR
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          staleTime: 1000 * 60,
        },
      },
    });
    const trpcClient = createSSRClient();
    
    const { pipe, abort } = renderToPipeableStream(
      <ErrorBoundary>
        <I18nProvider>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <FamilyProvider>
                  <TooltipProvider>
                    <ServerRouter
                      context={remixContext}
                      url={request.url}
                    />
                  </TooltipProvider>
                </FamilyProvider>
              </AuthProvider>
            </QueryClientProvider>
          </trpc.Provider>
        </I18nProvider>
        <Toaster />
      </ErrorBoundary>,
      {
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");

          // Wrap the stream to inject a module script for entry.client.tsx
          const wrappedStream = new PassThrough();
          let injected = false;
          let buffer = '';

          body.on('data', (chunk) => {
            buffer += chunk.toString();
            // Check if we have the closing body tag
            const bodyIndex = buffer.indexOf('</body>');
            if (bodyIndex !== -1 && !injected) {
              injected = true;
              const before = buffer.substring(0, bodyIndex);
              const after = buffer.substring(bodyIndex);
              wrappedStream.write(before);
              wrappedStream.write('<script type="module">import("/app/entry.client.tsx");</script>');
              wrappedStream.write(after);
              buffer = '';
            } else if (buffer.length > 10000) {
              // Write out chunks if buffer gets too large
              wrappedStream.write(buffer);
              buffer = '';
            }
          });

          body.on('end', () => {
            if (buffer) {
              if (!injected) {
                const bodyIndex = buffer.indexOf('</body>');
                if (bodyIndex !== -1) {
                  const before = buffer.substring(0, bodyIndex);
                  const after = buffer.substring(bodyIndex);
                  wrappedStream.write(before);
                  wrappedStream.write('<script type="module">import("/app/entry.client.tsx");</script>');
                  wrappedStream.write(after);
                } else {
                  wrappedStream.write(buffer);
                  wrappedStream.write('<script type="module">import("/app/entry.client.tsx");</script>');
                }
              } else {
                wrappedStream.write(buffer);
              }
            }
            wrappedStream.end();
          });

          body.on('error', (err) => {
            wrappedStream.destroy(err);
          });

          // Convert wrappedStream to ReadableStream for Response
          const wrappedReadableStream = createReadableStreamFromReadable(wrappedStream);

          resolve(
            new Response(wrappedReadableStream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    
    // Create server-side clients for SSR
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          staleTime: 1000 * 60,
        },
      },
    });
    const trpcClient = createSSRClient();
    
    const { pipe, abort } = renderToPipeableStream(
      <ErrorBoundary>
        <I18nProvider>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <FamilyProvider>
                  <TooltipProvider>
                    <ServerRouter
                      context={remixContext}
                      url={request.url}
                    />
                  </TooltipProvider>
                </FamilyProvider>
              </AuthProvider>
            </QueryClientProvider>
          </trpc.Provider>
        </I18nProvider>
        <Toaster />
      </ErrorBoundary>,
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();

          responseHeaders.set("Content-Type", "text/html");

          // Wrap the stream to inject a module script for entry.client.tsx
          const wrappedStream = new PassThrough();
          let injected = false;
          let buffer = '';

          body.on('data', (chunk) => {
            buffer += chunk.toString();
            // Check if we have the closing body tag
            const bodyIndex = buffer.indexOf('</body>');
            if (bodyIndex !== -1 && !injected) {
              injected = true;
              const before = buffer.substring(0, bodyIndex);
              const after = buffer.substring(bodyIndex);
              wrappedStream.write(before);
              wrappedStream.write('<script type="module">import("/app/entry.client.tsx");</script>');
              wrappedStream.write(after);
              buffer = '';
            } else if (buffer.length > 10000) {
              // Write out chunks if buffer gets too large
              wrappedStream.write(buffer);
              buffer = '';
            }
          });

          body.on('end', () => {
            if (buffer) {
              if (!injected) {
                const bodyIndex = buffer.indexOf('</body>');
                if (bodyIndex !== -1) {
                  const before = buffer.substring(0, bodyIndex);
                  const after = buffer.substring(bodyIndex);
                  wrappedStream.write(before);
                  wrappedStream.write('<script type="module">import("/app/entry.client.tsx");</script>');
                  wrappedStream.write(after);
                } else {
                  wrappedStream.write(buffer);
                  wrappedStream.write('<script type="module">import("/app/entry.client.tsx");</script>');
                }
              } else {
                wrappedStream.write(buffer);
              }
            }
            wrappedStream.end();
          });

          body.on('error', (err) => {
            wrappedStream.destroy(err);
          });

          // Convert wrappedStream to ReadableStream for Response
          const wrappedReadableStream = createReadableStreamFromReadable(wrappedStream);

          resolve(
            new Response(wrappedReadableStream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}
