import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { CheckCircle2, Circle } from 'lucide-react';

interface JobTimelineCardProps {
  currentStatus: string;
  dates?: {
    inquiry?: Date;
    quantity_verified?: Date;
    payment_pending?: Date;
    payment_confirmed?: Date;
    in_processing?: Date;
    completed?: Date;
  };
}

const STATUS_ORDER = [
  'inquiry_submitted',
  'quantity_verified',
  'payment_pending',
  'payment_confirmed',
  'in_processing',
  'completed',
];

const STATUS_LABELS: Record<string, string> = {
  inquiry_submitted: 'Inquiry Submitted',
  quantity_verified: 'Quantity Verified',
  payment_pending: 'Payment Pending',
  payment_confirmed: 'Payment Confirmed',
  in_processing: 'In Processing',
  completed: 'Completed',
};

export default function JobTimelineCard({
  currentStatus,
  dates = {},
}: JobTimelineCardProps) {
  const currentStatusIndex = STATUS_ORDER.indexOf(currentStatus);

  const getStatusDate = (status: string) => {
    const statusKey = status as keyof typeof dates;
    return dates[statusKey];
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Job Timeline</CardTitle>
        <CardDescription>Progress tracking for this order</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {STATUS_ORDER.map((status, index) => {
            const isCompleted = index < currentStatusIndex;
            const isCurrent = index === currentStatusIndex;
            const statusDate = getStatusDate(status);

            return (
              <div key={status} className="flex gap-4">
                {/* Timeline indicator */}
                <div className="flex flex-col items-center">
                  {isCompleted || isCurrent ? (
                    <CheckCircle2 className={`h-6 w-6 ${
                      isCompleted ? 'text-green-600' : 'text-blue-600'
                    }`} />
                  ) : (
                    <Circle className="h-6 w-6 text-gray-300" />
                  )}
                  {index < STATUS_ORDER.length - 1 && (
                    <div className={`w-0.5 h-12 ${
                      isCompleted || isCurrent ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>

                {/* Timeline content */}
                <div className="pb-4 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`font-semibold ${
                      isCurrent ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-600'
                    }`}>
                      {STATUS_LABELS[status]}
                    </p>
                    {isCurrent && (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        Current
                      </Badge>
                    )}
                    {isCompleted && (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        Done
                      </Badge>
                    )}
                  </div>
                  {statusDate && (
                    <p className="text-xs text-gray-500">
                      {new Date(statusDate).toLocaleDateString()} at{' '}
                      {new Date(statusDate).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress indicator */}
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-gray-600 font-semibold uppercase mb-2">
            Overall Progress
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentStatusIndex + 1) / STATUS_ORDER.length) * 100}%`,
              }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            {currentStatusIndex + 1} of {STATUS_ORDER.length} steps completed
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
