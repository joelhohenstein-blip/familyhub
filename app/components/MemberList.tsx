import { Mail, MoreVertical, Shield, User, Clock, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { EditMemberDialog } from "./EditMemberDialog";

interface Member {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: "admin" | "member" | "guest";
  status: "active" | "invited" | "inactive";
  avatarUrl?: string;
  acceptedAt?: Date;
}

interface Invitation {
  id: string;
  email: string;
  role: "admin" | "member" | "guest";
  createdAt: Date;
  inviteExpiresAt: Date;
}

interface MemberListProps {
  members?: Member[];
  invitations?: Invitation[];
  onChangeRole?: (memberId: string, newRole: "admin" | "member" | "guest") => Promise<void>;
  onRemove?: (memberId: string) => Promise<void>;
  onResendInvite?: (invitationId: string) => Promise<void>;
  onEditMemberName?: (member: Member) => void;
  onDeactivate?: (memberId: string) => Promise<void>;
  onReactivate?: (memberId: string) => Promise<void>;
  currentUserRole?: "admin" | "member" | "guest";
  loading?: boolean;
  currentPage?: number;
  itemsPerPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

const getRoleColor = (role: string) => {
  switch (role) {
    case "admin":
      return "bg-purple-100 text-purple-800";
    case "member":
      return "bg-blue-100 text-blue-800";
    case "guest":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return {
        bgColor: "bg-green-100",
        textColor: "text-green-800",
        icon: <CheckCircle2 className="w-3 h-3" />,
        label: "Active",
      };
    case "invited":
      return {
        bgColor: "bg-yellow-100",
        textColor: "text-yellow-800",
        icon: <Clock className="w-3 h-3" />,
        label: "Pending",
      };
    case "inactive":
      return {
        bgColor: "bg-gray-100",
        textColor: "text-gray-800",
        icon: <User className="w-3 h-3" />,
        label: "Inactive",
      };
    default:
      return {
        bgColor: "bg-gray-100",
        textColor: "text-gray-800",
        icon: <User className="w-3 h-3" />,
        label: status,
      };
  }
};

export function MemberList({
  members = [],
  invitations = [],
  onChangeRole,
  onRemove,
  onResendInvite,
  onEditMemberName,
  onDeactivate,
  onReactivate,
  currentUserRole = "member",
  loading = false,
  currentPage = 1,
  itemsPerPage = 10,
  totalPages = 1,
  onPageChange,
}: MemberListProps) {
  const { t } = useTranslation();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<Member | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [deactivatingMemberId, setDeactivatingMemberId] = useState<string | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const isAdmin = currentUserRole === "admin";

  const handleRemoveClick = (memberId: string) => {
    setRemovingMemberId(memberId);
    setShowRemoveConfirm(true);
    setOpenMenuId(null);
  };

  const handleConfirmRemove = async () => {
    if (removingMemberId) {
      try {
        await onRemove?.(removingMemberId);
        setShowRemoveConfirm(false);
        setRemovingMemberId(null);
      } catch (err) {
        console.error("Failed to remove member:", err);
      }
    }
  };

  const handleDeactivateClick = (memberId: string) => {
    setDeactivatingMemberId(memberId);
    setShowDeactivateConfirm(true);
    setOpenMenuId(null);
  };

  const handleConfirmDeactivate = async () => {
    if (deactivatingMemberId) {
      try {
        await onDeactivate?.(deactivatingMemberId);
        setShowDeactivateConfirm(false);
        setDeactivatingMemberId(null);
      } catch (err) {
        console.error("Failed to deactivate member:", err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Members */}
      {members.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {t("members.active") || "Family Members"} ({members.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    {t("members.name") || "Name"}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    {t("members.email") || "Email"}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    {t("members.role") || "Role"}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    {t("members.status") || "Status"}
                  </th>
                  {isAdmin && (
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      {t("members.actions") || "Actions"}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center">
                            <User className="w-4 h-4 text-orange-600" />
                          </div>
                        )}
                        <span className="text-gray-900 font-medium">
                          {member.firstName && member.lastName
                            ? `${member.firstName} ${member.lastName}`
                            : member.name || "Member"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        {member.email}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(
                          member.role
                        )}`}
                      >
                        {member.role === "admin" && (
                          <Shield className="w-3 h-3" />
                        )}
                        {t(`roles.${member.role}`) || member.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {(() => {
                        const badge = getStatusBadge(member.status);
                        return (
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.bgColor} ${badge.textColor}`}
                          >
                            {badge.icon}
                            {t(`status.${member.status}`) || badge.label}
                          </span>
                        );
                      })()}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right relative">
                        <button
                          onClick={() =>
                            setOpenMenuId(
                              openMenuId === member.id ? null : member.id
                            )
                          }
                          className="text-gray-500 hover:text-gray-700 transition-colors p-1 hover:bg-gray-100 rounded"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenuId === member.id && (
                          <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
                            <button
                              onClick={() => {
                                onEditMemberName?.(member);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 border-b border-gray-100 transition-colors"
                            >
                              {t("members.editName") || "Edit Name"}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedMemberForEdit(member);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 border-b border-gray-100 transition-colors"
                            >
                              {t("members.changeRole") || "Change Role"}
                            </button>
                            {member.status === "active" ? (
                              <button
                                onClick={() => handleDeactivateClick(member.id)}
                                disabled={loading}
                                className="w-full text-left px-4 py-2 hover:bg-yellow-50 text-sm text-yellow-600 disabled:opacity-50 flex items-center gap-2 transition-colors border-b border-gray-100"
                              >
                                {t("members.deactivate") || "Deactivate"}
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  onReactivate?.(member.id);
                                  setOpenMenuId(null);
                                }}
                                disabled={loading}
                                className="w-full text-left px-4 py-2 hover:bg-green-50 text-sm text-green-600 disabled:opacity-50 flex items-center gap-2 transition-colors border-b border-gray-100"
                              >
                                {t("members.reactivate") || "Reactivate"}
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveClick(member.id)}
                              disabled={loading}
                              className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              {t("members.remove") || "Remove"}
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {members.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-600">
            {t("pagination.showing") || "Showing"} {(currentPage - 1) * itemsPerPage + 1} {t("pagination.to") || "to"} {Math.min(currentPage * itemsPerPage, (currentPage - 1) * itemsPerPage + members.length)} {t("pagination.of") || "of"} {(currentPage - 1) * itemsPerPage + members.length}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t("pagination.previous") || "Previous"}
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => onPageChange?.(page)}
                  disabled={loading}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    page === currentPage
                      ? "bg-orange-500 text-white"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t("pagination.next") || "Next"}
            </button>
          </div>
        </div>
      )}

      {/* Edit Member Dialog */}
      <EditMemberDialog
        isOpen={!!selectedMemberForEdit}
        member={selectedMemberForEdit || undefined}
        onClose={() => setSelectedMemberForEdit(null)}
        onChangeRole={async (newRole) => {
          if (selectedMemberForEdit) {
            await onChangeRole?.(selectedMemberForEdit.id, newRole);
          }
        }}
        loading={loading}
      />

      {/* Remove Confirmation Dialog */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t("members.confirmRemove") || "Remove Member?"}
              </h3>
              <p className="text-gray-600 mb-6">
                {t("members.confirmRemoveMessage") ||
                  "This action cannot be undone. The member will lose access to the family."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRemoveConfirm(false);
                    setRemovingMemberId(null);
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                >
                  {t("common.cancel") || "Cancel"}
                </button>
                <button
                  onClick={handleConfirmRemove}
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("common.removing") || "Removing..."}
                    </>
                  ) : (
                    t("members.remove") || "Remove"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Dialog */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t("members.confirmDeactivate") || "Deactivate Member?"}
              </h3>
              <p className="text-gray-600 mb-6">
                {t("members.confirmDeactivateMessage") ||
                  "The member will be marked as inactive and lose access to the family. You can reactivate them later."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeactivateConfirm(false);
                    setDeactivatingMemberId(null);
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                >
                  {t("common.cancel") || "Cancel"}
                </button>
                <button
                  onClick={handleConfirmDeactivate}
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("common.deactivating") || "Deactivating..."}
                    </>
                  ) : (
                    t("members.deactivate") || "Deactivate"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Invitations */}
      {invitations && invitations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {t("members.pending") || "Pending Invitations"} ({invitations.length})
          </h3>
          <div className="space-y-2">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-full bg-yellow-200 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {invitation.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t("members.invitedAs") || "Invited as"}{" "}
                      {t(`roles.${invitation.role}`) || invitation.role}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => onResendInvite?.(invitation.id)}
                    disabled={loading}
                    className="px-3 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 rounded transition-colors disabled:opacity-50"
                  >
                    {t("members.resend") || "Resend"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {members.length === 0 && invitations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>{t("members.empty") || "No members yet"}</p>
        </div>
      )}
    </div>
  );
}
