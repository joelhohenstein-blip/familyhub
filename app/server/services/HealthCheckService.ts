import { db } from "../../db/index.server";
import { healthChecks, type NewHealthCheck } from "../../db/schema";

export interface ComponentHealth {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  lastChecked: Date;
  responseTime?: number;
  error?: string;
}

export interface OverallHealth {
  status: "healthy" | "degraded" | "unhealthy";
  lastUpdated: Date;
  components: ComponentHealth[];
}

export class HealthCheckService {
  /**
   * Check database connectivity
   */
  async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      // Attempt a simple query to test connectivity
      // For now, assume healthy
      return {
        name: "database",
        status: "healthy",
        lastChecked: new Date(),
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: "database",
        status: "unhealthy",
        lastChecked: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check external services (placeholder)
   */
  async checkExternalServices(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      return {
        name: "external_services",
        status: "healthy",
        lastChecked: new Date(),
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: "external_services",
        status: "degraded",
        lastChecked: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check memory usage
   */
  async checkMemory(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      const memUsage = process.memoryUsage();
      const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      // Unhealthy if heap usage > 90%
      const status =
        heapUsedPercent > 90 ? "unhealthy" : heapUsedPercent > 70 ? "degraded" : "healthy";

      return {
        name: "memory",
        status,
        lastChecked: new Date(),
        responseTime: Date.now() - startTime,
        error: status !== "healthy" ? `Heap usage: ${heapUsedPercent.toFixed(2)}%` : undefined,
      };
    } catch (error) {
      return {
        name: "memory",
        status: "unhealthy",
        lastChecked: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get overall health status
   */
  async getOverallHealth(): Promise<OverallHealth> {
    const components = await Promise.all([
      this.checkDatabase(),
      this.checkExternalServices(),
      this.checkMemory(),
    ]);

    // Store check results in database (simplified)
    for (const component of components) {
      try {
        const check: NewHealthCheck = {
          component_name: component.name,
          status: component.status,
          last_checked: component.lastChecked,
          error_message: component.error,
          response_time_ms: component.responseTime,
          metadata: null,
        };
        await db.insert(healthChecks).values(check);
      } catch (error) {
        console.error("Error recording health check:", error);
      }
    }

    // Determine overall status
    const statuses = components.map((c) => c.status);
    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (statuses.includes("unhealthy")) {
      overallStatus = "unhealthy";
    } else if (statuses.includes("degraded")) {
      overallStatus = "degraded";
    }

    return {
      status: overallStatus,
      lastUpdated: new Date(),
      components,
    };
  }

  /**
   * Get component health history
   */
  async getComponentHistory(componentName: string, limitDays: number = 7) {
    try {
      // Return sample data for now
      // In production: query healthChecks table
      return [];
    } catch (error) {
      console.error("Error getting component history:", error);
      throw error;
    }
  }
}

export const healthCheckService = new HealthCheckService();
