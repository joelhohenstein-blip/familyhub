import { WebSocketServer } from 'ws';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { appRouter } from './trpc/root';
import { createContext } from './trpc/context';
import type { Server } from 'http';

// Use globalThis to survive Vite HMR - module-level vars get reset on hot reload
// but the actual server process stays bound to the port, causing EADDRINUSE
declare global {
  var __wss: WebSocketServer | undefined;
  var __wsHandler: any | undefined;
}

// Create standalone WebSocket server (development & production)
export function createWebSocketServer(port: number = 3002): WebSocketServer | null {
  if (globalThis.__wss) {
    console.log('♻️  Reusing existing WebSocket server on port', port);
    return globalThis.__wss;
  }

  console.log('🚀 Starting standalone WebSocket server on port', port);

  try {
    const wss = new WebSocketServer({ port });

    // Handle server-level errors (EADDRINUSE, etc.)
    wss.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.warn(`⚠️  WebSocket port ${port} already in use - another instance may be running`);
      } else {
        console.error('WebSocket server error:', error.message);
      }
      // Don't crash - just log and continue without WebSocket
    });

    // Wait for the server to be ready before storing globally
    wss.on('listening', () => {
      console.log(`✅ WebSocket server listening on port ${port}`);
      globalThis.__wss = wss;

      globalThis.__wsHandler = applyWSSHandler({
        wss: globalThis.__wss,
        router: appRouter,
        createContext: (opts) => createContext({
          request: new Request(`ws://localhost:${port}`)
        }),
      });

      setupWebSocketHandlers(globalThis.__wss);
      setupCleanup();
    });

    return wss;
  } catch (error) {
    console.error('Failed to create WebSocket server:', error);
    return null;
  }
}

// Attach WebSocket server to existing HTTP server (production)
export function attachWebSocketToServer(httpServer: Server, path: string = '/api/ws') {
  if (globalThis.__wss) {
    return { wss: globalThis.__wss, handler: globalThis.__wsHandler };
  }

  console.log('🔌 Attaching WebSocket server to HTTP server at path:', path);

  globalThis.__wss = new WebSocketServer({
    noServer: true, // Don't create a standalone server
  });

  globalThis.__wsHandler = applyWSSHandler({
    wss: globalThis.__wss,
    router: appRouter,
    createContext: (opts) => createContext({
      request: new Request(`ws://localhost:3002${path}`)
    }),
  });

  // Handle WebSocket upgrades on the HTTP server
  httpServer.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url!, `http://${request.headers.host}`);

    if (pathname === path) {
      console.log('🔄 Upgrading HTTP connection to WebSocket at', path);
      globalThis.__wss!.handleUpgrade(request, socket, head, (websocket) => {
        globalThis.__wss!.emit('connection', websocket, request);
      });
    } else {
      console.log('❌ WebSocket upgrade rejected for path:', pathname);
      socket.destroy();
    }
  });

  setupWebSocketHandlers(globalThis.__wss);
  setupCleanup();

  return { wss: globalThis.__wss, handler: globalThis.__wsHandler };
}

// Common WebSocket event handlers
function setupWebSocketHandlers(websocketServer: WebSocketServer) {
  websocketServer.on('connection', (ws) => {
    console.log('➕ WebSocket connection established');
    ws.once('close', () => {
      console.log('➖ WebSocket connection closed');
    });
  });
}

// Common cleanup handlers
function setupCleanup() {
  process.on('SIGTERM', () => {
    console.log('🛑 Closing WebSocket server...');
    if (globalThis.__wsHandler) {
      globalThis.__wsHandler.broadcastReconnectNotification();
    }
    globalThis.__wss?.close();
  });
} 