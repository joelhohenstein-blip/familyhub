import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { trpc } from '~/utils/trpc';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { ArrowLeft, Loader2, Lock, AlertTriangle, MessageSquare, Archive, FileText, Clock, Shield, Send } from 'lucide-react';
import { PhotoDigitizationInternalNotes } from '~/components/admin/PhotoDigitizationInternalNotes';
import PhotoDigitizationDashboard from '~/components/admin/PhotoDigitizationDashboard';
import PaymentStatusCard from '~/components/admin/PaymentStatusCard';
import JobTimelineCard from '~/components/admin/JobTimelineCard';
import JobTimelineMessagingThread from '~/components/admin/JobTimelineMessagingThread';
import PhotoDigitizationDataVault from '~/components/admin/PhotoDigitizationDataVault';
import { InquiryFormDialog } from '~/components/admin/InquiryFormDialog';
import { StatusTrackingPanel } from '~/components/admin/StatusTrackingPanel';
import { SecureFolderManager } from '~/components/admin/SecureFolderManager';
import { JobMessagingPanel } from '~/components/admin/JobMessagingPanel';

export default function PhotoDigitizationAdminPage() {
  const navigate = useNavigate();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'inquiry' | 'status' | 'secure-folder' | 'messaging' | 'vault'>('overview');

  // Check if user has admin access
  const [isAdmin] = React.useState(() => {
    // In production, this should be properly verified via authentication
    // For now, check for admin flag in localStorage (development only)
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isAdmin') === 'true';
    }
    return false;
  });

  // Fetch order details when selected
  const orderDetailsQuery = trpc.photoDigitization.getOrderWithPaymentTimeline.useQuery(
    { orderId: selectedOrderId || '' },
    { enabled: !!selectedOrderId }
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-6">
        <Card className="max-w-md mx-auto mt-20 border-red-200 bg-white">
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <CardTitle className="text-red-900">Access Denied</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700">
              You do not have permission to access the admin panel. Only administrators can access this page.
            </p>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Lock className="h-8 w-8 text-indigo-600" />
              <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                Photo Digitization Management
              </span>
            </h1>
            <p className="text-gray-600 mt-1">Admin Dashboard - Internal Storage & Job Tracking</p>
          </div>
        </div>

        {/* Admin Warning */}
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-900">
              <strong>Admin Only:</strong> This dashboard provides access to sensitive internal information, access logs, and order management. All actions are recorded and audited.
            </p>
          </CardContent>
        </Card>

        {/* Dashboard Section */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Dashboard */}
          <div className="lg:col-span-2">
            <PhotoDigitizationDashboard onOrderSelect={setSelectedOrderId} />
          </div>

          {/* Right Sidebar - Selected Order Details with Tabs */}
          <div className="lg:col-span-1">
            {!selectedOrderId ? (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-900">Getting Started</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-blue-800">
                  <p>
                    <strong>Select an order from the left</strong> to view its details and manage all job-related data.
                  </p>
                  <div className="space-y-2 mt-4 bg-white/50 p-3 rounded border border-blue-200">
                    <h3 className="font-semibold">Features:</h3>
                    <ul className="space-y-1 list-disc list-inside text-xs">
                      <li>Payment status tracking</li>
                      <li>Job timeline visualization</li>
                      <li>Messaging threads for coordination</li>
                      <li>Secure data vault with encryption</li>
                      <li>Complete audit logs</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ) : orderDetailsQuery.isLoading ? (
              <Card className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                <p className="mt-4 text-gray-600">Loading order details...</p>
              </Card>
            ) : orderDetailsQuery.data?.data ? (
              <div className="space-y-4">
                {/* Tab Navigation */}
                <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === 'overview'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('inquiry')}
                    className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${
                      activeTab === 'inquiry'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    Inquiry
                  </button>
                  <button
                    onClick={() => setActiveTab('status')}
                    className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${
                      activeTab === 'status'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    Status
                  </button>
                  <button
                    onClick={() => setActiveTab('secure-folder')}
                    className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${
                      activeTab === 'secure-folder'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                    Secure
                  </button>
                  <button
                    onClick={() => setActiveTab('messaging')}
                    className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${
                      activeTab === 'messaging'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Messages
                  </button>
                  <button
                    onClick={() => setActiveTab('vault')}
                    className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${
                      activeTab === 'vault'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Archive className="h-4 w-4" />
                    Vault
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    {/* Payment Status Card */}
                    <PaymentStatusCard
                      orderId={selectedOrderId}
                      paymentStatus={
                        orderDetailsQuery.data.data.payment?.status === 'payment_confirmed'
                          ? 'confirmed'
                          : orderDetailsQuery.data.data.payment?.status === 'payment_pending'
                            ? 'pending'
                            : 'failed'
                      }
                      estimatedPrice={orderDetailsQuery.data.data.payment?.estimatedPrice || null}
                      dueDate={
                        orderDetailsQuery.data.data.payment?.dueDate
                          ? new Date(orderDetailsQuery.data.data.payment.dueDate)
                          : undefined
                      }
                      accessLogCount={orderDetailsQuery.data.data.accessCount}
                    />

                    {/* Job Timeline Card */}
                    <JobTimelineCard
                      currentStatus={orderDetailsQuery.data.data.payment?.status || 'inquiry_submitted'}
                      dates={
                        orderDetailsQuery.data.data.timeline?.dates as any
                      }
                    />

                    {/* Internal Notes Section */}
                    <PhotoDigitizationInternalNotes
                      orderId={selectedOrderId}
                      orderNumber={selectedOrderId}
                    />
                  </div>
                )}

                {activeTab === 'inquiry' && (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Submit New Inquiry</CardTitle>
                        <CardDescription>
                          Create a new photo digitization inquiry with media type, quantity, and customer details.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {selectedOrderId ? (
                          <InquiryFormDialog orderId={selectedOrderId} orderNumber={selectedOrderId} />
                        ) : (
                          <p className="text-muted-foreground">Please select an order first</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'status' && (
                  <StatusTrackingPanel
                    orderId={selectedOrderId}
                    currentStatus={orderDetailsQuery.data.data.payment?.status || 'inquiry_submitted'}
                  />
                )}

                {activeTab === 'secure-folder' && (
                  <SecureFolderManager
                    orderId={selectedOrderId}
                    orderNumber={selectedOrderId}
                  />
                )}

                {activeTab === 'messaging' && (
                  <JobMessagingPanel
                    orderId={selectedOrderId}
                    orderNumber={selectedOrderId}
                  />
                )}

                {activeTab === 'vault' && (
                  <PhotoDigitizationDataVault
                    orderId={selectedOrderId}
                    orderNumber={selectedOrderId}
                  />
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600">Order not found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Security Notice */}
        <Card className="bg-gray-900 text-white border-gray-800">
          <CardContent className="pt-6">
            <p className="text-xs text-gray-300">
              🔒 <strong>Security:</strong> All access to internal storage is logged and audited. Unauthorized access attempts are tracked. Admin actions are subject to compliance review.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
