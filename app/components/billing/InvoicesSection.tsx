'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Download, Eye, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { formatDate, formatCurrency } from '~/utils/formatting';
import type { Invoice } from '~/db/schema';

interface InvoicesSectionProps {
  invoices: Invoice[];
  isLoading: boolean;
}

export default function InvoicesSection({ invoices, isLoading }: InvoicesSectionProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'uncollectible':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return '✓';
      case 'open':
        return '!';
      default:
        return '-';
    }
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4">Loading invoices...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            {invoices.length === 0
              ? 'No invoices yet'
              : `Showing ${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {invoices.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You haven't been billed yet. Your first invoice will appear after your first
                successful payment.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-5 gap-4 px-4 py-3 text-sm font-semibold text-muted-foreground border-b">
                <div>Invoice #</div>
                <div>Date</div>
                <div>Amount</div>
                <div>Status</div>
                <div>Actions</div>
              </div>

              {/* Invoice Rows */}
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex flex-col md:grid md:grid-cols-5 gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Mobile Labels */}
                    <div className="md:hidden space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Invoice #</p>
                        <p className="font-medium text-sm">
                          {invoice.id.substring(0, 12)}...
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="text-sm">{formatDate(invoice.issuedAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="text-sm font-semibold">
                          {formatCurrency(invoice.amount, invoice.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Badge
                          className={`text-xs ${getStatusColor(invoice.status)}`}
                          variant="outline"
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:flex md:items-center">
                      <code className="text-xs">{invoice.id.substring(0, 12)}...</code>
                    </div>
                    <div className="hidden md:flex md:items-center">
                      {formatDate(invoice.issuedAt)}
                    </div>
                    <div className="hidden md:flex md:items-center font-semibold">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </div>
                    <div className="hidden md:flex md:items-center">
                      <Badge className={getStatusColor(invoice.status)} variant="outline">
                        {invoice.status}
                      </Badge>
                    </div>

                    {/* Actions - Both Mobile & Desktop */}
                    <div className="flex gap-2 md:justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!invoice.pdfUrl}
                        title={invoice.pdfUrl ? 'View Invoice' : 'PDF not available'}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!invoice.pdfUrl}
                        title={invoice.pdfUrl ? 'Download Invoice' : 'PDF not available'}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Details */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Details</CardTitle>
            <CardDescription>Click an invoice above to view its details</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Click the eye icon to view invoice details, or the download icon to get a PDF
                copy for your records.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
