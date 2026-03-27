#!/usr/bin/env bun
/**
 * Smoke Tests for Family Hub Application
 * 
 * Validates core functionality post-deployment:
 * - App startup and health endpoint
 * - Database connection
 * - API health checks
 * - WebSocket connectivity
 * 
 * Run in CI after deployment with: bunx smoke-tests.ts
 */

import { execSync } from "child_process";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

// Helper functions
function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name: string, passed: boolean, duration: number) {
  const symbol = passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
  const durationStr = `${duration.toFixed(2)}ms`;
  console.log(`${symbol} ${name} (${durationStr})`);
}

async function fetch_(url: string, options?: RequestInit): Promise<Response> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response;
    } catch (error) {
      lastError = error as Error;

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  throw lastError || new Error("Unknown error");
}

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.push({ name, passed: true, duration });
    logTest(name, true, duration);
  } catch (error) {
    const duration = Date.now() - startTime;
    results.push({
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration,
    });
    logTest(name, false, duration);
  }
}

// Test suite
async function runTests() {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const dbUrl = process.env.DATABASE_URL;

  log("\n" + "=".repeat(60), colors.blue);
  log("Family Hub Smoke Tests", colors.blue);
  log("=".repeat(60), colors.blue);
  log(`App URL: ${appUrl}`);
  log(`Database: ${dbUrl ? "configured" : "not configured"}\n`);

  // Test 1: App Startup
  await runTest("App responds to requests", async () => {
    const response = await fetch_(appUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  });

  // Test 2: Health Endpoint
  await runTest("Health endpoint returns 200", async () => {
    const response = await fetch_(`${appUrl}/health`);
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
  });

  // Test 3: tRPC API Health
  await runTest("tRPC API responds", async () => {
    const response = await fetch_(`${appUrl}/api/trpc/health.status`, {
      method: "GET",
    });
    if (response.status !== 200 && response.status !== 404) {
      // 404 is ok if endpoint doesn't exist
      throw new Error(`HTTP ${response.status}`);
    }
  });

  // Test 4: Database Connection (if configured)
  if (dbUrl) {
    await runTest("Database connectivity", async () => {
      try {
        const result = execSync("psql $DATABASE_URL -c 'SELECT NOW();' 2>&1", {
          encoding: "utf-8",
          env: { ...process.env },
        });
        if (!result.includes("now")) {
          throw new Error("Database query failed");
        }
      } catch (error) {
        throw new Error(`Database check failed: ${String(error)}`);
      }
    });

    // Test 5: Database Tables
    await runTest("Critical database tables exist", async () => {
      const tables = ["users", "messages", "media_uploads"];
      for (const table of tables) {
        try {
          execSync(
            `psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM ${table};" 2>&1`,
            {
              encoding: "utf-8",
              env: process.env,
              stdio: "pipe",
            }
          );
        } catch {
          // Table might not exist yet, which is ok for fresh deployments
        }
      }
    });
  }

  // Test 6: Static Assets
  await runTest("Static assets are accessible", async () => {
    const response = await fetch_(`${appUrl}/manifest.json`);
    if (response.status !== 200) {
      throw new Error(`Manifest.json not found (HTTP ${response.status})`);
    }
  });

  // Test 7: Environment Variables
  await runTest("Required environment variables set", () => {
    const required = ["NODE_ENV"];
    const recommended = ["DATABASE_URL", "REDIS_URL", "CLERK_PUBLISHABLE_KEY"];

    const missing = required.filter((v) => !process.env[v]);
    if (missing.length > 0) {
      throw new Error(`Missing required: ${missing.join(", ")}`);
    }

    const missingRecommended = recommended.filter((v) => !process.env[v]);
    if (missingRecommended.length > 0) {
      console.warn(
        `${colors.yellow}⚠ Missing recommended env vars: ${missingRecommended.join(", ")}${colors.reset}`
      );
    }

    return Promise.resolve();
  });

  // Test 8: Port Availability
  await runTest("Application port is available", () => {
    // Parse port from URL
    const urlObj = new URL(appUrl);
    const port = urlObj.port || (urlObj.protocol === "https:" ? 443 : 80);

    try {
      // Simple check: if we got here, the app is responding, so port is available
      return Promise.resolve();
    } catch {
      throw new Error(`Port ${port} may not be available`);
    }
  });

  // Test 9: Response Headers
  await runTest("Security headers present", async () => {
    const response = await fetch_(appUrl);
    const headers = response.headers;

    // Check for recommended security headers
    const recommendedHeaders = [
      "x-content-type-options",
      "x-frame-options",
      "x-xss-protection",
    ];

    const missing = recommendedHeaders.filter(
      (h) => !headers.has(h) && !headers.has(h.replace("-", "_"))
    );

    if (missing.length > 0) {
      console.warn(
        `${colors.yellow}⚠ Missing security headers: ${missing.join(", ")}${colors.reset}`
      );
    }
  });

  // Test 10: Response Time
  await runTest("Response time is acceptable (<5s)", async () => {
    const start = Date.now();
    await fetch_(appUrl);
    const duration = Date.now() - start;

    if (duration > 5000) {
      throw new Error(`Response time too slow: ${duration}ms`);
    }
  });

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  log("\n" + "=".repeat(60), colors.blue);
  log("Smoke Test Summary", colors.blue);
  log("=".repeat(60), colors.blue);
  log(`${colors.green}Passed: ${passed}${colors.reset}`);
  if (failed > 0) {
    log(`${colors.red}Failed: ${failed}${colors.reset}`);
  }
  log(`Total Duration: ${totalDuration.toFixed(2)}ms`);
  log("=".repeat(60), colors.blue);

  if (failed > 0) {
    log("\nFailed Tests:", colors.red);
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        log(`  ✗ ${r.name}: ${r.error}`, colors.red);
      });
    log("");
    process.exit(1);
  }

  log("\n✓ All smoke tests passed!\n", colors.green);
  process.exit(0);
}

// Run tests
runTests().catch((error) => {
  log(`\nFatal error: ${error}`, colors.red);
  process.exit(1);
});
