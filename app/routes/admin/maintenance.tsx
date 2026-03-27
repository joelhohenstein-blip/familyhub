import { MaintenanceDashboard } from "~/components/admin/MaintenanceDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MaintenanceDashboard />
      </div>
    </div>
  );
}
