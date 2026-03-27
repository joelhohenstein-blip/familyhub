/**
 * Health Check Endpoint
 * 
 * This route provides health check endpoints for:
 * - Kubernetes liveness probes
 * - Load balancer health checks
 * - Monitoring and alerting systems
 * - CI/CD deployment verification
 */

import type { LoaderFunction } from 'react-router';

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version?: string;
  checks: {
    database: {
      status: 'ok' | 'error' | 'warning';
      latency?: number;
      error?: string;
    };
    memory: {
      status: 'ok' | 'warning' | 'error';
      usage: {
        rss: number;
        heapUsed: number;
        heapTotal: number;
        external: number;
      };
      percentage: number;
    };
  };
}

// Track server start time
const SERVER_START_TIME = Date.now();

export const loader: LoaderFunction = async ({ request }) => {
  // Only handle GET requests
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const startTime = performance.now();
  const response: HealthResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Date.now() - SERVER_START_TIME,
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: {
        status: 'ok',
      },
      memory: {
        status: 'ok',
        usage: {
          rss: 0,
          heapUsed: 0,
          heapTotal: 0,
          external: 0,
        },
        percentage: 0,
      },
    },
  };

  // Check memory usage
  try {
    const memUsage = process.memoryUsage();
    response.checks.memory.usage = {
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
    };

    // Calculate heap usage percentage
    const heapPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    response.checks.memory.percentage = Math.round(heapPercentage);

    // Warn if memory usage is high
    if (heapPercentage > 85) {
      response.checks.memory.status = 'warning';
      if (response.status === 'healthy') {
        response.status = 'degraded';
      }
    }
  } catch (error) {
    console.error('Error checking memory:', error);
    response.checks.memory.status = 'error';
    response.status = 'degraded';
  }

  // Check database connectivity
  try {
    // Simple check - in a real app, you'd query the database
    // For now, just verify environment is configured
    const dbUrl = process.env.DATABASE_URL;
    const dbStartTime = performance.now();
    
    if (dbUrl) {
      // Simulate a light database check
      response.checks.database.latency = performance.now() - dbStartTime;
      response.checks.database.status = 'ok';
    } else {
      response.checks.database.status = 'error';
      response.checks.database.error = 'DATABASE_URL not configured';
      response.status = 'degraded';
    }
  } catch (error) {
    response.checks.database.status = 'error';
    response.checks.database.error =
      error instanceof Error ? error.message : 'Unknown error';
    response.status = 'unhealthy';
  }

  // Calculate response time
  const responseTime = performance.now() - startTime;

  // Determine HTTP status code based on health status
  let statusCode = 200;
  if (response.status === 'degraded') {
    statusCode = 503; // Service Unavailable
  } else if (response.status === 'unhealthy') {
    statusCode = 503;
  }

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Response-Time': `${responseTime.toFixed(2)}ms`,
      'X-Uptime': `${response.uptime}ms`,
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
};

/**
 * HTML Response (not typically called, but required by React Router)
 */
export default function HealthCheck() {
  return (
    <div>
      <h1>Health Check Endpoint</h1>
      <p>This is an API endpoint. Make a GET request to this route.</p>
    </div>
  );
}
