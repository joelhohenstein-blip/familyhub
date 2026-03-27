import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

interface HealthComponent {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  lastChecked: Date | string;
  responseTime?: number;
  error?: string;
}

interface HealthStatusPanelProps {
  health: {
    status: "healthy" | "degraded" | "unhealthy";
    lastUpdated: Date | string;
    components: HealthComponent[];
  };
}

export function HealthStatusPanel({ health }: HealthStatusPanelProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return "🟢";
      case "degraded":
        return "🟡";
      case "unhealthy":
        return "🔴";
      default:
        return "⚪";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800";
      case "degraded":
        return "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800";
      case "unhealthy":
        return "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
      default:
        return "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700";
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Component Health Status</CardTitle>
        <CardDescription>
          Last updated: {formatDate(health.lastUpdated)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {health.components.map((component) => (
            <div
              key={component.name}
              className={`p-4 border rounded-lg ${getStatusColor(component.status)}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{getStatusIcon(component.status)}</span>
                    <h3 className="font-semibold capitalize text-gray-900 dark:text-white">
                      {component.name.replace(/_/g, " ")}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    Status: {component.status}
                  </p>
                  {component.responseTime && (
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Response: {component.responseTime}ms
                    </p>
                  )}
                  {component.error && (
                    <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                      Error: {component.error}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Checked: {formatDate(component.lastChecked)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
