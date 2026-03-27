import { useParams, useNavigate, redirect } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Edit2, AlertCircle } from "lucide-react";
import { trpc } from "~/utils/trpc";
import { MemberList } from "~/components/MemberList";
import { AddMemberDialog } from "~/components/AddMemberDialog";
import { EditMemberNameDialog } from "~/components/EditMemberNameDialog";
import { useState } from "react";
import type { Route } from "./+types/$familyId";
import { callTrpc } from "~/utils/trpc.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const caller = await callTrpc(request);
  const { isSignedIn } = await caller.auth.me();

  if (!isSignedIn) {
    return redirect('/login');
  }

  // Verify user has access to this family
  if (!params.familyId) {
    return redirect('/dashboard');
  }

  return { familyId: params.familyId };
}

interface Member {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: "admin" | "member" | "guest";
  status: "active" | "invited" | "inactive";
}

export default function FamilyDetailPage() {
  const { familyId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [selectedMemberForNameEdit, setSelectedMemberForNameEdit] = useState<Member | null>(null);
  const [operationError, setOperationError] = useState<string>("");
  const [operationSuccess, setOperationSuccess] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (!familyId) {
    return <div>Invalid family</div>;
  }

  // Fetch family details
  const familyQuery = trpc.families.getFamilyDetails.useQuery({
    familyId,
  });

  // Fetch family members
  const membersQuery = trpc.familyMembers.getMembers.useQuery({
    familyId,
    page: currentPage,
    limit: itemsPerPage,
  });

  // Mutations
  const changeRoleMutation = trpc.familyMembers.assignRole.useMutation({
    onSuccess: () => {
      setCurrentPage(1);
      membersQuery.refetch();
      setOperationSuccess(t("members.roleUpdated") || "Role updated successfully!");
      setTimeout(() => setOperationSuccess(""), 3000);
    },
    onError: (error) => {
      setOperationError(
        error.message || t("error.roleUpdateFailed") || "Failed to update role"
      );
    },
  });

  const removeMemberMutation = trpc.familyMembers.removeFromFamily.useMutation({
    onSuccess: () => {
      setCurrentPage(1);
      membersQuery.refetch();
      setOperationSuccess(t("members.memberRemoved") || "Member removed successfully!");
      setTimeout(() => setOperationSuccess(""), 3000);
    },
    onError: (error) => {
      setOperationError(
        error.message || t("error.removalFailed") || "Failed to remove member"
      );
    },
  });

  const inviteMembersMutation = trpc.familyMembers.inviteMembers.useMutation({
    onSuccess: () => {
      setCurrentPage(1);
      membersQuery.refetch();
      setShowAddMemberDialog(false);
      setOperationSuccess(
        t("members.invitationSent") || "Invitation sent successfully!"
      );
      setTimeout(() => setOperationSuccess(""), 3000);
    },
    onError: (error) => {
      setOperationError(
        error.message || t("error.invitationFailed") || "Failed to send invitation"
      );
    },
  });

  const resendInviteMutation = trpc.familyMembers.resendInvite.useMutation({
    onSuccess: () => {
      membersQuery.refetch();
    },
  });

  const updateMemberNamesMutation = trpc.familyMembers.updateMemberNames.useMutation({
    onSuccess: () => {
      setCurrentPage(1);
      membersQuery.refetch();
      setShowEditNameDialog(false);
      setSelectedMemberForNameEdit(null);
      setOperationSuccess(t("members.nameUpdated") || "Member name updated successfully!");
      setTimeout(() => setOperationSuccess(""), 3000);
    },
    onError: (error) => {
      setOperationError(
        error.message || t("error.nameUpdateFailed") || "Failed to update member name"
      );
    },
  });

  const deactivateMemberMutation = trpc.familyMembers.deactivateMember.useMutation({
    onSuccess: () => {
      setCurrentPage(1);
      membersQuery.refetch();
      setOperationSuccess(t("members.memberDeactivated") || "Member deactivated successfully!");
      setTimeout(() => setOperationSuccess(""), 3000);
    },
    onError: (error) => {
      setOperationError(
        error.message || t("error.deactivationFailed") || "Failed to deactivate member"
      );
    },
  });

  const reactivateMemberMutation = trpc.familyMembers.reactivateMember.useMutation({
    onSuccess: () => {
      setCurrentPage(1);
      membersQuery.refetch();
      setOperationSuccess(t("members.memberReactivated") || "Member reactivated successfully!");
      setTimeout(() => setOperationSuccess(""), 3000);
    },
    onError: (error) => {
      setOperationError(
        error.message || t("error.reactivationFailed") || "Failed to reactivate member"
      );
    },
  });

  if (familyQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-rose-50 to-teal-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t("common.loading") || "Loading..."}</p>
        </div>
      </div>
    );
  }

  if (familyQuery.error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-rose-50 to-teal-50 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            {t("common.back") || "Back"}
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
            {t("error.familyNotFound") || "Family not found or you don't have access"}
          </div>
        </div>
      </div>
    );
  }

  const family = familyQuery.data;
  const { members = [], invitations = [] } = membersQuery.data || {};

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-rose-50 to-teal-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
          >
            <ArrowLeft className="w-5 h-5" />
            {t("common.back") || "Back"}
          </button>
        </div>

        {/* Family Info Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-start gap-6">
            {family.avatarUrl ? (
              <img
                src={family.avatarUrl}
                alt={family.surname}
                className="w-24 h-24 rounded-xl object-cover border-4 border-orange-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-orange-200 to-rose-200 flex items-center justify-center text-3xl font-bold text-orange-600">
                {family.surname.charAt(0)}
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {family.surname}{" "}
                <span className="text-lg text-gray-500 font-normal">
                  {t("family.family") || "Family"}
                </span>
              </h1>
              {family.description && (
                <p className="text-gray-600 mb-4">{family.description}</p>
              )}
              <p className="text-sm text-gray-500">
                {t("family.createdAt") || "Created"}:{" "}
                {new Date(family.createdAt).toLocaleDateString()}
              </p>
            </div>

            <button className="px-4 py-2 text-orange-600 border-2 border-orange-500 rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-2">
              <Edit2 className="w-4 h-4" />
              {t("common.edit") || "Edit"}
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {operationSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-600"></div>
            <p className="text-green-700 font-medium">{operationSuccess}</p>
          </div>
        )}

        {operationError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{operationError}</p>
            <button
              onClick={() => setOperationError("")}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        )}

        {/* Members Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {t("members.title") || "Family Members"}
            </h2>
            <button
              onClick={() => {
                setOperationError("");
                setShowAddMemberDialog(true);
              }}
              className="px-4 py-2 text-white font-semibold bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {t("members.invite") || "Invite Member"}
            </button>
          </div>

          <MemberList
            members={members.map((m: any) => ({
              id: m.family_members.id,
              firstName: m.family_members.firstName || undefined,
              lastName: m.family_members.lastName || undefined,
              name: m.users?.firstName || undefined,
              email: m.users?.emailAddresses || "",
              role: m.family_members.role,
              status: m.family_members.status,
              avatarUrl: m.users?.imageUrl || undefined,
              acceptedAt: m.family_members.acceptedAt,
            }))}
            invitations={invitations.map((i: any) => ({
              id: i.id,
              email: i.email,
              role: i.role,
              createdAt: i.createdAt,
              inviteExpiresAt: i.inviteExpiresAt,
            }))}
            currentUserRole="admin"
            onChangeRole={async (memberId, newRole) => {
              await changeRoleMutation.mutateAsync({
                familyId,
                memberId,
                role: newRole,
              });
            }}
            onRemove={async (memberId) => {
              await removeMemberMutation.mutateAsync({
                familyId,
                memberId,
              });
            }}
            onResendInvite={async (invitationId) => {
              await resendInviteMutation.mutateAsync({
                invitationId,
              });
            }}
            onEditMemberName={(member) => {
              setSelectedMemberForNameEdit(member);
              setShowEditNameDialog(true);
            }}
            onDeactivate={async (memberId) => {
              await deactivateMemberMutation.mutateAsync({
                familyId,
                memberId,
              });
            }}
            onReactivate={async (memberId) => {
              await reactivateMemberMutation.mutateAsync({
                familyId,
                memberId,
              });
            }}
            loading={
              changeRoleMutation.isPending ||
              removeMemberMutation.isPending ||
              resendInviteMutation.isPending ||
              updateMemberNamesMutation.isPending ||
              deactivateMemberMutation.isPending ||
              reactivateMemberMutation.isPending
            }
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalPages={membersQuery.data?.pagination?.totalPages || 1}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>

        {/* Add Member Dialog */}
        <AddMemberDialog
          isOpen={showAddMemberDialog}
          onClose={() => {
            setShowAddMemberDialog(false);
            setOperationError("");
          }}
          onAddMember={async (email, role) => {
            await inviteMembersMutation.mutateAsync({
              familyId,
              emails: [email],
              role,
            });
          }}
          loading={inviteMembersMutation.isPending}
          error={operationError}
        />

        {/* Edit Member Name Dialog */}
        <EditMemberNameDialog
          isOpen={showEditNameDialog}
          member={selectedMemberForNameEdit || undefined}
          onClose={() => {
            setShowEditNameDialog(false);
            setSelectedMemberForNameEdit(null);
            setOperationError("");
          }}
          onSaveName={async (firstName, lastName) => {
            if (selectedMemberForNameEdit) {
              await updateMemberNamesMutation.mutateAsync({
                familyId,
                memberId: selectedMemberForNameEdit.id,
                firstName,
                lastName,
              });
            }
          }}
          loading={updateMemberNamesMutation.isPending}
          error={operationError}
        />
      </div>
    </div>
  );
}
