"use client";

import { useState } from "react";
import { trpc } from "~/utils/trpc";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";

interface RoleManagementPanelProps {
  familyId: string;
}

type Role = "admin" | "member" | "guest";

export function RoleManagementPanel({ familyId }: RoleManagementPanelProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<Role | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const { data: membersData, isLoading, refetch } = trpc.familyMembers.getMembers.useQuery(
    { familyId },
    { enabled: !!familyId }
  );

  const { data: auditLogsData } = trpc.auditLogs.getAuditLogs.useQuery(
    {
      familyId,
      actionType: "ASSIGN_ROLE",
      limit: 10,
    },
    { enabled: !!familyId }
  );

  const assignRoleMutation = trpc.familyMembers.assignRole.useMutation({
    onSuccess: () => {
      setMessage({ type: "success", text: "Role updated successfully" });
      setSelectedMemberId(null);
      setNewRole(null);
      setShowConfirmation(false);
      refetch();
    },
    onError: (error: any) => {
      setMessage({ type: "error", text: error.message });
    },
  });

  const handleRoleChange = (memberId: string, role: Role) => {
    setSelectedMemberId(memberId);
    setNewRole(role);
    setShowConfirmation(true);
  };

  const handleConfirmRoleChange = () => {
    if (selectedMemberId && newRole) {
      assignRoleMutation.mutate({
        familyId,
        memberId: selectedMemberId,
        role: newRole,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const members = membersData?.members || [];
  const auditLogs = auditLogsData?.logs || [];

  return (
    <div className="space-y-6">
      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          {message.type === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Member Roles</h2>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Current Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member: any) => (
              <TableRow key={member.family_members.id}>
                <TableCell>
                  {member.family_members.firstName} {member.family_members.lastName}
                </TableCell>
                <TableCell>{member.users.email}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {member.family_members.role}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      member.family_members.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {member.family_members.status}
                  </span>
                </TableCell>
                <TableCell>
                  <Select
                    value={member.family_members.role}
                    onValueChange={(role: string) =>
                      handleRoleChange(member.family_members.id, role as Role)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="guest">Guest</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Role Changes</h2>

        {auditLogs.length === 0 ? (
          <p className="text-gray-500">No role changes yet</p>
        ) : (
          <div className="space-y-3">
            {auditLogs.map((log: any, idx: number) => (
              <div
                key={idx}
                className="text-sm border-l-4 border-blue-500 pl-4 py-2"
              >
                <p className="font-medium">{log.description}</p>
                <p className="text-gray-500 text-xs">
                  {log.createdAt
                    ? new Date(log.createdAt).toLocaleString()
                    : "Unknown date"}
                </p>
                {log.metadata && (
                  <p className="text-gray-600 text-xs mt-1">
                    {log.metadata.previousRole} → {log.metadata.newRole}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to change this member's role to {newRole}?
            This action will be logged and audited.
          </AlertDialogDescription>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRoleChange}
              disabled={assignRoleMutation.isPending}
            >
              {assignRoleMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
