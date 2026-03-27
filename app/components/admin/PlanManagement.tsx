import { useState } from 'react';
import { trpc } from '~/utils/trpc';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Checkbox } from '~/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '~/components/ui/alert';

interface PlanFormData {
  id: string;
  name: string;
  description?: string;
  priceMonthly?: number;
  priceYearly?: number;
  trialDays: number;
  features: Record<string, boolean>;
  maxFamilyMembers?: number;
  maxStorageGB?: number;
  maxMediaLibraryItems?: number;
  displayOrder: number;
  internalNotes?: string;
}

const DEFAULT_FEATURES = {
  messageBoard: true,
  videoCall: true,
  photoUpload: true,
  movieTheater: true,
  weatherWidget: true,
  familyMembers: true,
  storage: true,
  mediaLibrary: true,
};

export function PlanManagement() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PlanFormData>({
    id: '',
    name: '',
    trialDays: 14,
    features: DEFAULT_FEATURES,
    displayOrder: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch existing plans
  const { data: plans = [], refetch: refetchPlans } = trpc.billing.getTiers.useQuery({ activeOnly: false });

  // Create plan mutation
  const createPlanMutation = trpc.billing.createPlan.useMutation({
    onSuccess: () => {
      setSuccess('Plan created successfully');
      setIsOpen(false);
      resetForm();
      refetchPlans();
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to create plan');
    },
  });

  // Update plan mutation
  const updatePlanMutation = trpc.billing.updatePlan.useMutation({
    onSuccess: () => {
      setSuccess('Plan updated successfully');
      setIsOpen(false);
      resetForm();
      refetchPlans();
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to update plan');
    },
  });

  // Delete plan mutation
  const deletePlanMutation = trpc.billing.deletePlan.useMutation({
    onSuccess: () => {
      setSuccess('Plan deleted successfully');
      refetchPlans();
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to delete plan');
    },
  });

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      trialDays: 14,
      features: DEFAULT_FEATURES,
      displayOrder: 0,
    });
    setEditingId(null);
    setError(null);
  };

  const handleEditPlan = (plan: any) => {
    setFormData({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      priceMonthly: plan.priceMonthly ? plan.priceMonthly / 100 : undefined,
      priceYearly: plan.priceYearly ? plan.priceYearly / 100 : undefined,
      trialDays: plan.trialDays,
      features: plan.features || DEFAULT_FEATURES,
      maxFamilyMembers: plan.maxFamilyMembers,
      maxStorageGB: plan.maxStorageGB,
      maxMediaLibraryItems: plan.maxMediaLibraryItems,
      displayOrder: plan.displayOrder,
      internalNotes: plan.internalNotes,
    });
    setEditingId(plan.id);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Plan name is required');
      return;
    }

    if (!editingId && !formData.id.trim()) {
      setError('Plan ID is required');
      return;
    }

    if (editingId) {
      updatePlanMutation.mutate({
        id: formData.id,
        name: formData.name,
        description: formData.description,
        priceMonthly: formData.priceMonthly ? Math.round(formData.priceMonthly * 100) : null,
        priceYearly: formData.priceYearly ? Math.round(formData.priceYearly * 100) : null,
        features: formData.features,
        maxFamilyMembers: formData.maxFamilyMembers,
        maxStorageGB: formData.maxStorageGB,
        maxMediaLibraryItems: formData.maxMediaLibraryItems,
        displayOrder: formData.displayOrder,
        internalNotes: formData.internalNotes,
      });
    } else {
      createPlanMutation.mutate({
        ...formData,
        priceMonthly: formData.priceMonthly ? Math.round(formData.priceMonthly * 100) : null,
        priceYearly: formData.priceYearly ? Math.round(formData.priceYearly * 100) : null,
      });
    }
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData({
      ...formData,
      features: {
        ...formData.features,
        [feature]: !formData.features[feature],
      },
    });
  };

  const formatPrice = (cents: number | null | undefined) => {
    if (!cents) return 'Free';
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            onClick={() => {
              resetForm();
              setIsOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create New Plan
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the plan details below'
                : 'Fill in the details for your new subscription plan'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Plan ID (only for creation) */}
            {!editingId && (
              <div className="space-y-2">
                <Label htmlFor="id">Plan ID</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) =>
                    setFormData({ ...formData, id: e.target.value.toLowerCase() })
                  }
                  placeholder="e.g., pro, enterprise"
                  required
                />
                <p className="text-xs text-gray-500">
                  Unique identifier for this plan (cannot be changed after creation)
                </p>
              </div>
            )}

            {/* Plan Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Professional"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.description || ''}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of the plan"
                rows={2}
              />
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priceMonthly">Monthly Price ($)</Label>
                <Input
                  id="priceMonthly"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.priceMonthly ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priceMonthly: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceYearly">Yearly Price ($)</Label>
                <Input
                  id="priceYearly"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.priceYearly ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priceYearly: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Trial Days */}
            <div className="space-y-2">
              <Label htmlFor="trialDays">Trial Days</Label>
              <Input
                id="trialDays"
                type="number"
                min="0"
                value={formData.trialDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    trialDays: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            {/* Limits */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxFamilyMembers">Max Family Members</Label>
                <Input
                  id="maxFamilyMembers"
                  type="number"
                  min="0"
                  value={formData.maxFamilyMembers ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxFamilyMembers: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Unlimited"
                />
                <p className="text-xs text-gray-500">Leave blank for unlimited</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxStorageGB">Max Storage (GB)</Label>
                <Input
                  id="maxStorageGB"
                  type="number"
                  min="0"
                  value={formData.maxStorageGB ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxStorageGB: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Unlimited"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxMediaLibraryItems">Max Media Items</Label>
                <Input
                  id="maxMediaLibraryItems"
                  type="number"
                  min="0"
                  value={formData.maxMediaLibraryItems ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxMediaLibraryItems: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Unlimited"
                />
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <Label>Features</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(DEFAULT_FEATURES).map(([feature]) => (
                  <div key={feature} className="flex items-center space-x-2">
                    <Checkbox
                      id={feature}
                      checked={formData.features[feature] ?? true}
                      onCheckedChange={() => handleFeatureToggle(feature)}
                    />
                    <label
                      htmlFor={feature}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {feature.charAt(0).toUpperCase() + feature.slice(1)}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Display Order */}
            <div className="space-y-2">
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    displayOrder: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-gray-500">Lower numbers appear first</p>
            </div>

            {/* Internal Notes */}
            <div className="space-y-2">
              <Label htmlFor="internalNotes">Internal Notes (Admin Only)</Label>
              <textarea
                id="internalNotes"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.internalNotes || ''}
                onChange={(e) =>
                  setFormData({ ...formData, internalNotes: e.target.value })
                }
                placeholder="Notes visible only to admins"
                rows={2}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createPlanMutation.isPending || updatePlanMutation.isPending
                }
              >
                {editingId ? 'Update Plan' : 'Create Plan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Plans List */}
      <div className="grid gap-4">
        <h3 className="text-lg font-semibold">Existing Plans</h3>
        {plans.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-500 text-center">No plans created yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {plans.map((plan: any) => (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditPlan(plan)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (
                            window.confirm(
                              'Are you sure you want to delete this plan?'
                            )
                          ) {
                            deletePlanMutation.mutate(plan.id);
                          }
                        }}
                        disabled={deletePlanMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pricing */}
                  <div className="flex gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Monthly</p>
                      <p className="font-semibold">
                        {formatPrice(plan.priceMonthly)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Yearly</p>
                      <p className="font-semibold">
                        {formatPrice(plan.priceYearly)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Trial Days</p>
                      <p className="font-semibold">{plan.trialDays}</p>
                    </div>
                  </div>

                  {/* Features */}
                  {plan.features && Object.keys(plan.features).length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Features:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(plan.features).map(([feature, enabled]) => (
                          <div
                            key={feature}
                            className={`text-sm ${enabled ? 'text-green-600' : 'text-gray-400'}`}
                          >
                            {enabled ? '✓' : '✗'} {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Limits */}
                  {(plan.maxFamilyMembers ||
                    plan.maxStorageGB ||
                    plan.maxMediaLibraryItems) && (
                    <div>
                      <p className="text-sm font-medium mb-2">Limits:</p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        {plan.maxFamilyMembers && (
                          <div>
                            Family Members: <span className="font-semibold">{plan.maxFamilyMembers}</span>
                          </div>
                        )}
                        {plan.maxStorageGB && (
                          <div>
                            Storage: <span className="font-semibold">{plan.maxStorageGB} GB</span>
                          </div>
                        )}
                        {plan.maxMediaLibraryItems && (
                          <div>
                            Media Items: <span className="font-semibold">{plan.maxMediaLibraryItems}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {plan.internalNotes && (
                    <div className="text-sm text-gray-600 italic">
                      Notes: {plan.internalNotes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
