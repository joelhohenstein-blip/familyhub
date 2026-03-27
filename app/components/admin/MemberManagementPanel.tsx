import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { trpc } from "~/utils/trpc";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { UserX, UserCheck, AlertCircle } from "lucide-react";

interface Member {
  id: string;
  familyId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
}

export function MemberManagementPanel() {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);

  // Fetch user's families first
  const { data: familiesData } = trpc.families.getMyFamilies.useQuery(undefined);
  const familyId = familiesData?.[0]?.id;

  // Fetch family members - using getMembers instead of listMembers
  const { data: membersData, isLoading, refetch } = trpc.familyMembers.getMembers.useQuery(
    { familyId: familyId || "" },
    { enabled: !!familyId }
  );

  // Fetch audit log
  const { data: auditData } = trpc.moderation.getAuditLog.useQuery({
    actionType: "MEMBER_DEACTIVATE",
    limit: 10,
  });

  // Deactivate mutation
  const deactivateMutation = trpc.familyMembers.deactivateMember.useMutation({
    onSuccess: () => {
      setSelectedMemberId(null);
      setDeactivateConfirmOpen(false);
      refetch();
    },
  });

  // Reactivate mutation
  const reactivateMutation = trpc.familyMembers.reactivateMember.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleDeactivate = async () => {
    if (!selectedMemberId || !selectedFamilyId) return;
    try {
      await deactivateMutation.mutateAsync({
        familyId: selectedFamilyId,
        memberId: selectedMemberId,
      });
    } catch (error) {
      console.error("Failed to deactivate member:", error);
    }
  };

  const handleReactivate = async (memberId: string, familyId: string) => {
    try {
      await reactivateMutation.mutateAsync({
        familyId,
        memberId,
      });
    } catch (error) {
      console.error("Failed to reactivate member:", error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading family members...</div>;
  }

  const members = membersData?.members || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Family Members</CardTitle>
          <CardDescription>
            Manage family member accounts and their access to FamilyHub
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No family members found
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member: any) => (
                <div
                  key={member.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">
                        {member.firstName} {member.lastName}
                      </h4>
                      <p className="text-sm text-gray-600">{member.email}</p>
                      <p className="text-xs text-gray-500">
                        Role: {member.role}
                      </p>
                    </div>
                    <Badge
                      variant={
                        member.status === "active" ? "default" : "secondary"
                      }
                    >
                      {member.status}
                    </Badge>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {member.status === "active" ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedMemberId(member.id);
                          setSelectedFamilyId(member.familyId);
                          setDeactivateConfirmOpen(true);
                        }}
                        disabled={deactivateMutation.isPending}
                      >
                        <UserX className="w-4 h-4 mr-1" />
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleReactivate(member.id, member.familyId)}
                        disabled={reactivateMutation.isPending}
                      >
                        <UserCheck className="w-4 h-4 mr-1" />
                        Reactivate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Member Audit Log</CardTitle>
          <CardDescription>Recent member management actions</CardDescription>
        </CardHeader>
        <CardContent>
          {!auditData || auditData.logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No member actions recorded
            </div>
          ) : (
            <div className="space-y-3">
              {auditData.logs.map((log: any) => (
                <div
                  key={log.id}
                  className="border rounded p-3 text-sm space-y-1"
                >
                  <div className="font-semibold">{log.actionType}</div>
                  <div className="text-gray-600">{log.description}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={deactivateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            Deactivate Member
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to deactivate this member? They will no longer
            be able to access FamilyHub features, but can be reactivated later.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel onClick={() => setDeactivateConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Deactivate
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
