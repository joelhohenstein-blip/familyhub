import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { trpc } from "~/utils/trpc";
import { MemberList } from "~/components/MemberList";
import { AddMemberDialog } from "~/components/AddMemberDialog";
import { EditMemberNameDialog } from "~/components/EditMemberNameDialog";
import { useState } from "react";
import { SidebarProvider } from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/app-sidebar";
import { SiteHeader } from "~/components/site-header";

interface Member {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: "admin" | "member" | "guest";
  status: "active" | "invited" | "inactive";
}

export default function MembersPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [selectedMemberForNameEdit, setSelectedMemberForNameEdit] = useState<Member | null>(null);
  const [operationError, setOperationError] = useState<string>("");
  const [operationSuccess, setOperationSuccess] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch user's families
  const myFamiliesQuery = trpc.families.getMyFamilies.useQuery();
  const defaultFamilyId = myFamiliesQuery.data?.[0]?.id;

  // Fetch family details if we have a family ID
  const familyQuery = trpc.families.getFamilyDetails.useQuery(
    { familyId: defaultFamilyId || "" },
    { enabled: !!defaultFamilyId }
  );

  // Fetch family members
  const membersQuery = trpc.familyMembers.getMembers.useQuery(
    {
      familyId: defaultFamilyId || "",
      page: currentPage,
      limit: itemsPerPage,
    },
    { enabled: !!defaultFamilyId }
  );

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

  if (!defaultFamilyId) {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <SiteHeader />
            <div className="flex-1 bg-gradient-to-b from-orange-50 via-rose-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8 flex items-center justify-center">
              <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6 text-yellow-700 dark:text-yellow-200 text-center">
                {myFamiliesQuery.isLoading
                  ? t("common.loading") || "Loading..."
                  : t("family.noDefaultFamily") || "No default family set. Please create or select a family."}
              </div>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (familyQuery.isLoading) {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <SiteHeader />
            <div className="flex-1 bg-gradient-to-b from-orange-50 via-rose-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-300">{t("common.loading") || "Loading..."}</p>
              </div>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (familyQuery.error) {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <SiteHeader />
            <div className="flex-1 bg-gradient-to-b from-orange-50 via-rose-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
              <div className="max-w-4xl mx-auto">
                <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6 text-red-700 dark:text-red-200">
                  {t("error.familyNotFound") || "Family not found or you don't have access"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  const family = familyQuery.data;
  const { members = [], invitations = [] } = membersQuery.data || {};

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <SiteHeader />
          <div className="flex-1 overflow-auto bg-gradient-to-b from-orange-50 via-rose-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {t("members.title") || "Family Members"}
                </h1>
              </div>

              {/* Status Messages */}
              {operationSuccess && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400"></div>
                  <p className="text-green-700 dark:text-green-200 font-medium">{operationSuccess}</p>
                </div>
              )}

              {operationError && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-red-700 dark:text-red-200">{operationError}</p>
                  <button
                    onClick={() => setOperationError("")}
                    className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Members Section */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {family?.surname} {t("family.family") || "Family"}
                    </h2>
                    {family?.description && (
                      <p className="text-gray-600 dark:text-gray-300">{family.description}</p>
                    )}
                  </div>
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
                      familyId: defaultFamilyId,
                      memberId,
                      role: newRole,
                    });
                  }}
                  onRemove={async (memberId) => {
                    await removeMemberMutation.mutateAsync({
                      familyId: defaultFamilyId,
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
                      familyId: defaultFamilyId,
                      memberId,
                    });
                  }}
                  onReactivate={async (memberId) => {
                    await reactivateMemberMutation.mutateAsync({
                      familyId: defaultFamilyId,
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
            </div>
          </div>
        </div>
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
            familyId: defaultFamilyId,
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
              familyId: defaultFamilyId,
              memberId: selectedMemberForNameEdit.id,
              firstName,
              lastName,
            });
          }
        }}
        loading={updateMemberNamesMutation.isPending}
        error={operationError}
      />
    </SidebarProvider>
  );
}
