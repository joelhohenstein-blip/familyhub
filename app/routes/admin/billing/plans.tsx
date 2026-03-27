import { Suspense } from 'react';
import { PlanManagement } from '~/components/admin/PlanManagement';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '~/components/ui/alert';

export default function AdminBillingPlansPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
        <p className="text-gray-600 mt-2">
          Manage subscription tiers, pricing, features, and limits
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Changes to plans take effect immediately. Existing subscriptions are not affected
          retroactively.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Plan Management</CardTitle>
          <CardDescription>
            Create and manage subscription plans for your users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading plans...</div>}>
            <PlanManagement />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
