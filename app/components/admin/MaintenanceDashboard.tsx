import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { HealthStatusPanel } from "./HealthStatusPanel";
import { ErrorViewer } from "./ErrorViewer";

export function MaintenanceDashboard() {
  // Sample data for demonstration
  const metrics = {
    errorRate: 0,
    errorsByLevel: { error: 0, warn: 0, info: 0 },
    errorsByService: {},
    healthStatus: "healthy" as const,
    healthComponents: [
      {
        name: "database",
        status: "healthy" as const,
        lastChecked: new Date(),
        responseTime: 45,
      },
      {
        name: "external_services",
        status: "healthy" as const,
        lastChecked: new Date(),
        responseTime: 120,
      },
      {
        name: "memory",
        status: "healthy" as const,
        lastChecked: new Date(),
        responseTime: 5,
      },
    ],
    activeAlerts: 0,
    uptime: 3600,
  };

  const errors: any[] = [];

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600 dark:text-green-400";
      case "degraded":
        return "text-yellow-600 dark:text-yellow-400";
      case "unhealthy":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Maintenance Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor system health, errors, and alerts
          </p>
        </div>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Health Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold capitalize ${getStatusColor(
                  metrics.healthStatus
                )}`}
              >
                {metrics.healthStatus}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Overall system status
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recent Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {metrics.errorRate}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Last 60 minutes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  metrics.activeAlerts > 0
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {metrics.activeAlerts}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Unacknowledged alerts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatUptime(metrics.uptime)}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Current session
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Health Status Panel */}
      {metrics && (
        <HealthStatusPanel
          health={{
            status: metrics.healthStatus,
            lastUpdated: new Date(),
            components: metrics.healthComponents,
          }}
        />
      )}

      {/* Error Viewer */}
      <ErrorViewer errors={errors} total={0} />
    </div>
  );
}
