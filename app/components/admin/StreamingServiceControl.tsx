import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { trpc } from "~/utils/trpc";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { AlertCircle, CheckCircle } from "lucide-react";

const STREAMING_SERVICES = [
  {
    id: "pluto",
    name: "Pluto TV",
    description: "Free streaming movies and TV shows",
  },
  {
    id: "tubi",
    name: "Tubi",
    description: "Free streaming platform with diverse content",
  },
  {
    id: "roku",
    name: "Roku Channel",
    description: "Roku's streaming service with free and premium content",
  },
  {
    id: "freeview",
    name: "Freeview",
    description: "Free-to-air streaming service",
  },
];

export function StreamingServiceControl() {
  const [enabledServices, setEnabledServices] = useState<Record<string, boolean>>(
    {}
  );
  const [warnings, setWarnings] = useState<string[]>([]);

  // Fetch streaming service status
  const { data: servicesData, isLoading, refetch } = trpc.streaming.getSources.useQuery(
    {},
    {
      onSuccess: (data) => {
        const statusMap: Record<string, boolean> = {};
        data?.forEach((service: any) => {
          statusMap[service.serviceType] = service.enabled ?? true;
        });
        setEnabledServices(statusMap);
      },
    }
  );

  // Fetch audit log
  const { data: auditData } = trpc.moderation.getAuditLog.useQuery({
    actionType: "STREAMING_CONFIG",
    limit: 10,
  });

  // Update streaming service mutation
  const updateServiceMutation = trpc.streaming.updateStreamingServiceStatus.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleToggleService = async (
    serviceId: string,
    enabled: boolean
  ) => {
    setEnabledServices((prev) => ({
      ...prev,
      [serviceId]: enabled,
    }));

    // Check for warnings
    const newWarnings: string[] = [];
    if (!enabled && enabledServices[serviceId]) {
      newWarnings.push(
        `${serviceId.toUpperCase()} will be disabled for all family members`
      );
    }
    setWarnings(newWarnings);

    try {
      await updateServiceMutation.mutateAsync({
        serviceType: serviceId as any,
        enabled,
      });
    } catch (error) {
      console.error("Failed to update streaming service:", error);
      setEnabledServices((prev) => ({
        ...prev,
        [serviceId]: !enabled,
      }));
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading streaming services...</div>;
  }

  return (
    <div className="space-y-6">
      {warnings.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            {warnings.map((warning, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-yellow-700">
                <AlertCircle className="w-4 h-4" />
                {warning}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Streaming Service Configuration</CardTitle>
          <CardDescription>
            Enable or disable streaming services available in the theater view
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {STREAMING_SERVICES.map((service) => {
            const isEnabled = enabledServices[service.id] ?? true;
            return (
              <div
                key={service.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{service.name}</h4>
                  <p className="text-sm text-gray-600">{service.description}</p>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(enabled) =>
                    handleToggleService(service.id, enabled)
                  }
                  disabled={updateServiceMutation.isPending}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service Status Summary</CardTitle>
          <CardDescription>Overview of all streaming services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {STREAMING_SERVICES.map((service) => {
              const isEnabled = enabledServices[service.id] ?? true;
              return (
                <div
                  key={service.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium">{service.name}</span>
                  <div className="flex items-center gap-2">
                    {isEnabled ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Enabled</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-red-600">Disabled</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration Audit Log</CardTitle>
          <CardDescription>Recent streaming service configuration changes</CardDescription>
        </CardHeader>
        <CardContent>
          {!auditData || auditData.logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No configuration changes recorded
            </div>
          ) : (
            <div className="space-y-3">
              {auditData.logs.map((log: any) => (
                <div
                  key={log.id}
                  className="border rounded p-3 text-sm space-y-1"
                >
                  <div className="font-semibold">{log.actionType}</div>
                  <div className="text-gray-600">{log.description}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
