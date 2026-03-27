import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Clock, CheckCircle, AlertCircle, Eye } from 'lucide-react';

interface PaymentStatusCardProps {
  orderId: string;
  paymentStatus: 'pending' | 'confirmed' | 'failed';
  estimatedPrice: string | null;
  paymentDate?: Date;
  dueDate?: Date;
  accessLogCount?: number;
}

export default function PaymentStatusCard({
  orderId,
  paymentStatus,
  estimatedPrice,
  paymentDate,
  dueDate,
  accessLogCount = 0,
}: PaymentStatusCardProps) {
  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (paymentStatus) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = () => {
    switch (paymentStatus) {
      case 'pending':
        return 'Pending Payment';
      case 'confirmed':
        return 'Payment Confirmed';
      case 'failed':
        return 'Payment Failed';
      default:
        return 'Unknown';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Payment Status</CardTitle>
            <CardDescription className="text-xs font-mono">
              Order: {orderId.substring(0, 8)}...
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge className={getStatusColor()}>
              {getStatusLabel()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estimated Price */}
        {estimatedPrice && (
          <div className="border-t pt-4">
            <p className="text-xs text-gray-600 font-semibold uppercase mb-2">
              Estimated Price
            </p>
            <p className="text-2xl font-bold text-green-600">${estimatedPrice}</p>
          </div>
        )}

        {/* Dates */}
        <div className="grid md:grid-cols-2 gap-4">
          {paymentDate && (
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase">
                Payment Date
              </p>
              <p className="text-sm font-medium">
                {new Date(paymentDate).toLocaleDateString()}
              </p>
            </div>
          )}

          {dueDate && (
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase">
                Due Date
              </p>
              <p className="text-sm font-medium">
                {new Date(dueDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Access Log */}
        {accessLogCount > 0 && (
          <div className="border-t pt-4 flex items-center gap-2 text-xs text-gray-600">
            <Eye className="h-4 w-4" />
            <span>
              <strong>{accessLogCount}</strong> access logs recorded
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
