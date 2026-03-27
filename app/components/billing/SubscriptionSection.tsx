'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Zap } from 'lucide-react';

interface SubscriptionSectionProps {
  userId?: string;
}

export default function SubscriptionSection({ userId }: SubscriptionSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Subscription Plan
              </CardTitle>
              <CardDescription>Manage your subscription and billing preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-semibold">Free Plan</p>
                <p className="text-sm text-gray-600">Current Plan</p>
              </div>
              <Badge>Active</Badge>
            </div>
            <Button className="w-full">Upgrade Plan</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
