'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Loader2, AlertCircle, CheckCircle, Trash2, Plus } from 'lucide-react';
import { trpc } from '~/utils/trpc';

interface SubscriptionManagerProps {
  familyId: string;
}

export function SubscriptionManager({ familyId }: SubscriptionManagerProps) {
  const [selectedNewUserId, setSelectedNewUserId] = useState<string>('');
  const [newCadence, setNewCadence] = useState<'daily' | 'weekly'>('weekly');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { data: subscriptions, isLoading, refetch } = trpc.subscriptions.getSubscriptions.useQuery(
    { familyId }
  );

  const { data: familyMembers } = trpc.familyMembers.getMembers.useQuery({ familyId });

  const addMember = trpc.subscriptions.addMemberToDigest.useMutation({
    onSuccess: () => {
      setStatus('success');
      setSuccessMessage('Member added to digest subscription');
      setSelectedNewUserId('');
      setNewCadence('weekly');
      setTimeout(() => {
        setStatus('idle');
        refetch();
      }, 2000);
    },
    onError: (error) => {
      setStatus('error');
      setErrorMessage(error.message);
    },
  });

  const removeMember = trpc.subscriptions.removeMemberFromDigest.useMutation({
    onSuccess: () => {
      setStatus('success');
      setSuccessMessage('Member removed from digest subscription');
      setTimeout(() => {
        setStatus('idle');
        refetch();
      }, 2000);
    },
    onError: (error) => {
      setStatus('error');
      setErrorMessage(error.message);
    },
  });

  const updateCadence = trpc.subscriptions.updateCadence.useMutation({
    onSuccess: () => {
      setStatus('success');
      setSuccessMessage('Cadence updated');
      setTimeout(() => {
        setStatus('idle');
        refetch();
      }, 2000);
    },
    onError: (error) => {
      setStatus('error');
      setErrorMessage(error.message);
    },
  });

  const handleAddMember = () => {
    if (!selectedNewUserId) {
      setErrorMessage('Please select a member to add');
      setStatus('error');
      return;
    }

    addMember.mutate({
      familyId,
      userId: selectedNewUserId,
      cadence: newCadence,
    });
  };

  const handleRemoveMember = (userId: string) => {
    if (confirm('Remove this member from digest subscriptions?')) {
      removeMember.mutate({ familyId, userId });
    }
  };

  const handleCadenceChange = (subscriptionId: string, cadence: 'daily' | 'weekly') => {
    updateCadence.mutate({ subscriptionId, cadence });
  };

  // Get members not yet subscribed
  const subscribedUserIds = subscriptions?.map((sub) => sub.userId) || [];
  const membersList = familyMembers?.members || [];
  const availableMembers = membersList.filter(
    (member: any) => !subscribedUserIds.includes(member.family_members?.userId)
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Manage Subscriptions</CardTitle>
          <CardDescription>Configure digest delivery for family members (Admin only)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'error' && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Add New Member Section */}
          <div className="rounded-lg border border-dashed border-border p-4">
            <h3 className="mb-4 font-medium">Add Member to Digest</h3>
            <div className="space-y-4">
              {availableMembers.length > 0 ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Member</label>
                    <select
                      value={selectedNewUserId}
                      onChange={(e) => setSelectedNewUserId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="">Choose a member...</option>
                      {availableMembers.map((member: any) => {
                        const userId = member.family_members?.userId || member.userId;
                        const firstName = member.users?.firstName || member.family_members?.firstName || 'Unknown';
                        const lastName = member.users?.lastName || member.family_members?.lastName || '';
                        return (
                          <option key={userId} value={userId}>
                            {firstName} {lastName}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cadence</label>
                    <select
                      value={newCadence}
                      onChange={(e) => setNewCadence(e.target.value as 'daily' | 'weekly')}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>

                  <Button
                    onClick={handleAddMember}
                    disabled={addMember.isPending}
                    className="w-full"
                  >
                    {addMember.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Member
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">All members are already subscribed to digests.</p>
              )}
            </div>
          </div>

          {/* Current Subscriptions */}
          <div>
            <h3 className="mb-4 font-medium">Current Subscriptions</h3>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : subscriptions && subscriptions.length > 0 ? (
              <div className="space-y-3">
                {subscriptions.map((subscription) => (
                  <div
                    key={subscription.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {subscription.user?.firstName} {subscription.user?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{subscription.user?.email}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={subscription.cadence}
                        onChange={(e) => handleCadenceChange(subscription.id, e.target.value as 'daily' | 'weekly')}
                        disabled={updateCadence.isPending}
                        className="rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>

                      <Button
                        onClick={() => handleRemoveMember(subscription.userId)}
                        disabled={removeMember.isPending}
                        variant="ghost"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <p className="text-sm text-muted-foreground">No members subscribed to digests yet.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
