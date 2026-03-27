'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Download,
  CreditCard,
  Calendar,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { trpc } from '~/utils/trpc';
import { formatCurrency, formatDate } from '~/utils/formatting';
import SubscriptionSection from './SubscriptionSection';
import PaymentMethodsSection from './PaymentMethodsSection';
import InvoicesSection from './InvoicesSection';

interface BillingPortalProps {
  userId?: string;
}

export default function BillingPortal({ userId }: BillingPortalProps) {
  const [activeTab, setActiveTab] = useState('subscription');

  // Fetch user's subscription
  const { data: subscription, isLoading: subLoading } = trpc.billing.getSubscription.useQuery(
    userId ? { userId } : {},
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  // Fetch available tiers
  const { data: tiers, isLoading: tiersLoading } = trpc.billing.getTiers.useQuery({
    activeOnly: true,
  });

  // Fetch invoices
  const { data: invoices, isLoading: invoicesLoading } = trpc.billing.getInvoices.useQuery({
    userId,
    limit: 20,
  });

  // Fetch feature accessibility
  const { data: accessibility } = trpc.featureAccess.getAccessibility.useQuery({
    features: [],
  });

  const isLoading = subLoading || tiersLoading;

  // Get current tier info
  const currentTier = tiers?.find((t: any) => t.id === subscription?.tier);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Manage your subscription, invoices, and payment methods
        </p>
      </div>

      {/* Current Plan Alert */}
      {subscription && currentTier && (
        <Alert className="border-primary/50 bg-primary/5">
          <Zap className="h-4 w-4 text-primary" />
          <AlertDescription>
            You're on the <strong>{currentTier.name}</strong> plan
            {subscription.status === 'trialing' && (subscription as any).trialEndDate && (
              <span className="ml-2 text-primary">
                (Trial until {formatDate((subscription as any).trialEndDate)})
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="payments">Payment Methods</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <SubscriptionSection userId={userId} />
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payments" className="space-y-6">
          <PaymentMethodsSection userId={userId} />
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-6">
          <InvoicesSection invoices={(invoices as any) || []} isLoading={invoicesLoading} />
        </TabsContent>
      </Tabs>

      {/* Billing History Summary */}
      {invoices && invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Billing Summary
            </CardTitle>
            <CardDescription>Last 12 months activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold">{invoices.length}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Last Invoice</p>
                <p className="text-sm font-medium">
                  {invoices[0] ? formatDate(invoices[0].issuedAt) : 'None'}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    invoices.reduce((sum: number, inv: any) => sum + inv.amount, 0),
                    invoices[0]?.currency || 'USD'
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={subscription?.status === 'active' ? 'default' : 'destructive'}>
                  {subscription?.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle>Billing FAQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Can I change my plan?</h3>
            <p className="text-sm text-muted-foreground">
              Yes, you can upgrade or downgrade your plan anytime. Changes take effect at the
              start of your next billing cycle.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">What happens if a payment fails?</h3>
            <p className="text-sm text-muted-foreground">
              We'll notify you and attempt to retry the payment. You can manually retry or
              update your payment method in the Payment Methods tab.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Can I cancel my subscription?</h3>
            <p className="text-sm text-muted-foreground">
              Yes, you can cancel anytime. You'll retain access until the end of your billing
              period, and no further charges will be applied.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Is there a refund policy?</h3>
            <p className="text-sm text-muted-foreground">
              We offer prorated refunds for cancellations within 30 days. Contact support for
              details on your specific situation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
