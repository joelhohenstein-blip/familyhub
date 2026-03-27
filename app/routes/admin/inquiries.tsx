import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { trpc } from '~/utils/trpc';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { ArrowLeft, Loader2, AlertTriangle, Plus, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-purple-100 text-purple-800',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  submitted: <Clock className="h-4 w-4" />,
  under_review: <AlertCircle className="h-4 w-4" />,
  approved: <CheckCircle className="h-4 w-4" />,
  rejected: <AlertTriangle className="h-4 w-4" />,
  completed: <CheckCircle className="h-4 w-4" />,
};

export default function InquiriesAdminPage() {
  const navigate = useNavigate();
  const [isAdmin] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isAdmin') === 'true';
    }
    return false;
  });

  const [formData, setFormData] = useState({
    orderId: '',
    mediaType: '',
    quantity: 1,
    customerEmail: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  // tRPC mutations
  const createInquiryMutation = trpc.inquiry.createInquiryForm.useMutation({
    onSuccess: () => {
      setSuccessMessage('Inquiry form submitted successfully!');
      setFormData({
        orderId: '',
        mediaType: '',
        quantity: 1,
        customerEmail: '',
        notes: '',
      });
      setErrors({});
      setTimeout(() => setSuccessMessage(''), 3000);
      refetchInquiries();
    },
    onError: (error) => {
      setErrors({ submit: error.message });
    },
  });

  const inquiriesQuery = trpc.inquiry.getInquiryForms.useQuery(
    { orderId: formData.orderId || 'all' },
    { enabled: !!formData.orderId }
  );

  const deleteInquiryMutation = trpc.inquiry.deleteInquiryForm.useMutation({
    onSuccess: () => {
      refetchInquiries();
    },
  });

  const updateStatusMutation = trpc.inquiry.updateInquiryFormStatus.useMutation({
    onSuccess: () => {
      refetchInquiries();
    },
  });

  const refetchInquiries = () => {
    inquiriesQuery.refetch();
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.orderId.trim()) {
      newErrors.orderId = 'Order ID is required';
    }
    if (!formData.mediaType.trim()) {
      newErrors.mediaType = 'Media type is required';
    }
    if (formData.quantity < 1) {
      newErrors.quantity = 'Quantity must be at least 1';
    }
    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = 'Customer email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Invalid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    createInquiryMutation.mutate({
      orderId: formData.orderId,
      mediaType: formData.mediaType,
      quantity: formData.quantity,
      customerEmail: formData.customerEmail,
      notes: formData.notes || undefined,
    });
  };

  const handleStatusChange = (formId: string, newStatus: string) => {
    updateStatusMutation.mutate({
      formId,
      status: newStatus as 'submitted' | 'under_review' | 'approved' | 'rejected' | 'completed',
    });
  };

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
          <CardContent>
            <p className="text-red-700 mb-4">You do not have permission to access this page.</p>
            <Button onClick={() => navigate('/')} variant="outline">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/photo-digitization')}
            className="hover:bg-slate-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Inquiry Forms</h1>
            <p className="text-slate-600">Manage customer inquiry forms for photo digitization orders</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <Card className="border-slate-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Plus className="h-5 w-5 text-blue-600" />
                  New Inquiry Form
                </CardTitle>
                <CardDescription>Submit a new inquiry form for a customer</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Order ID */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Order ID *
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter order UUID"
                      value={formData.orderId}
                      onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                      className={`border-slate-300 ${errors.orderId ? 'border-red-500' : ''}`}
                    />
                    {errors.orderId && <p className="text-red-600 text-sm mt-1">{errors.orderId}</p>}
                  </div>

                  {/* Media Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Media Type *
                    </label>
                    <select
                      value={formData.mediaType}
                      onChange={(e) => setFormData({ ...formData, mediaType: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md text-slate-900 bg-white border-slate-300 ${
                        errors.mediaType ? 'border-red-500' : ''
                      }`}
                    >
                      <option value="">Select media type</option>
                      <option value="loose_slides">Loose Slides</option>
                      <option value="carousel">Carousel</option>
                      <option value="prints">Prints</option>
                      <option value="negatives">Negatives</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.mediaType && <p className="text-red-600 text-sm mt-1">{errors.mediaType}</p>}
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Quantity *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                      className={`border-slate-300 ${errors.quantity ? 'border-red-500' : ''}`}
                    />
                    {errors.quantity && <p className="text-red-600 text-sm mt-1">{errors.quantity}</p>}
                  </div>

                  {/* Customer Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Customer Email *
                    </label>
                    <Input
                      type="email"
                      placeholder="customer@example.com"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      className={`border-slate-300 ${errors.customerEmail ? 'border-red-500' : ''}`}
                    />
                    {errors.customerEmail && <p className="text-red-600 text-sm mt-1">{errors.customerEmail}</p>}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      placeholder="Add any additional notes..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 bg-white"
                      rows={3}
                    />
                  </div>

                  {/* Error Message */}
                  {errors.submit && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-red-700 text-sm">{errors.submit}</p>
                    </div>
                  )}

                  {/* Success Message */}
                  {successMessage && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <p className="text-green-700 text-sm">{successMessage}</p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={createInquiryMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {createInquiryMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Inquiry Form'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Inquiries List Section */}
          <div className="lg:col-span-2">
            <Card className="border-slate-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-slate-200">
                <CardTitle className="text-slate-900">Submitted Inquiries</CardTitle>
                <CardDescription>
                  {formData.orderId ? `Inquiries for order ${formData.orderId.slice(0, 8)}...` : 'Select an order to view inquiries'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {!formData.orderId ? (
                  <div className="text-center py-8">
                    <p className="text-slate-500">Enter an order ID above to view inquiries</p>
                  </div>
                ) : inquiriesQuery.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : inquiriesQuery.data?.forms && inquiriesQuery.data.forms.length > 0 ? (
                  <div className="space-y-4">
                    {inquiriesQuery.data.forms.map((form: any) => (
                      <div key={form.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${STATUS_COLORS[form.status]}`}>
                                {STATUS_ICONS[form.status]}
                                {form.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600">
                              <strong>Media Type:</strong> {form.mediaType}
                            </p>
                            <p className="text-sm text-slate-600">
                              <strong>Quantity:</strong> {form.quantity}
                            </p>
                            <p className="text-sm text-slate-600">
                              <strong>Email:</strong> {form.customerEmail}
                            </p>
                            {form.notes && (
                              <p className="text-sm text-slate-600 mt-2">
                                <strong>Notes:</strong> {form.notes}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteInquiryMutation.mutate({ formId: form.id })}
                            disabled={deleteInquiryMutation.isPending}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Status Update */}
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <label className="block text-xs font-medium text-slate-700 mb-2">
                            Update Status
                          </label>
                          <select
                            value={form.status}
                            onChange={(e) => handleStatusChange(form.id, e.target.value)}
                            disabled={updateStatusMutation.isPending}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md bg-white text-slate-900"
                          >
                            <option value="submitted">Submitted</option>
                            <option value="under_review">Under Review</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-500">No inquiries found for this order</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
