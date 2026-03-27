import React, { useState } from 'react';
import { trpc } from '~/utils/trpc';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { Loader2, Search, Filter } from 'lucide-react';
import PaymentStatusCard from './PaymentStatusCard';
import JobTimelineCard from './JobTimelineCard';

interface PhotoDigitizationDashboardProps {
  onOrderSelect?: (orderId: string) => void;
}

export default function PhotoDigitizationDashboard({
  onOrderSelect,
}: PhotoDigitizationDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Fetch dashboard data
  const dashboardQuery = trpc.admin.getPhotoDigitizationDashboardData.useQuery(
    { limit: 50 }
  );

  const isLoading = dashboardQuery.isLoading;
  const data = dashboardQuery.data;

  // Filter orders based on search and status
  const filteredOrders = React.useMemo(() => {
    if (!data?.recentOrders) return [];

    return data.recentOrders.filter((order: any) => {
      const matchesSearch =
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = !statusFilter || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [data?.recentOrders, searchQuery, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'inquiry_submitted':
        return 'bg-blue-100 text-blue-800';
      case 'quantity_verified':
        return 'bg-cyan-100 text-cyan-800';
      case 'payment_pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'payment_confirmed':
        return 'bg-green-100 text-green-800';
      case 'in_processing':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {data && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.summary.totalOrders}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pending Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">
                {data.summary.paymentStats.pending}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Confirmed Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {data.summary.paymentStats.confirmed}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-indigo-600">
                ${data.summary.paymentStats.totalRevenue}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filter */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Orders</CardTitle>
          <CardDescription>
            Manage and monitor photo digitization orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by order ID or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={statusFilter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(null)}
            >
              <Filter className="mr-2 h-4 w-4" />
              All Statuses
            </Button>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              'inquiry_submitted',
              'quantity_verified',
              'payment_pending',
              'payment_confirmed',
              'in_processing',
              'completed',
              'cancelled',
            ].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(statusFilter === status ? null : status)}
                className="text-xs"
              >
                {getStatusLabel(status)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Orders List or Loading State */}
      {isLoading ? (
        <Card className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </Card>
      ) : filteredOrders.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-600">No orders found matching your filters</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map((order: any) => (
            <Card
              key={order.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onOrderSelect?.(order.id)}
            >
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase">
                      Order ID
                    </p>
                    <p className="text-sm font-mono font-semibold">
                      {order.id.substring(0, 8)}...
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase">
                      Status
                    </p>
                    <Badge className={`${getStatusColor(order.status)} mt-1`}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase">
                      Customer
                    </p>
                    <p className="text-sm text-gray-900">{order.customerEmail}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase">
                      Quantity
                    </p>
                    <p className="text-sm font-semibold">
                      {order.quantity} {order.itemType === 'carousel' ? 'slides' : 'loose slides'}
                    </p>
                  </div>
                </div>

                {/* Payment Timeline Preview */}
                {order.estimatedPrice && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-gray-600 font-semibold uppercase mb-2">
                      Payment & Timeline
                    </p>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">Est. Price</p>
                        <p className="text-sm font-bold text-green-600">
                          ${order.estimatedPrice}
                        </p>
                      </div>
                      {order.dueDate && (
                        <div>
                          <p className="text-xs text-gray-600">Due Date</p>
                          <p className="text-sm">
                            {new Date(order.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-600">Submitted</p>
                        <p className="text-sm">
                          {new Date(order.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
