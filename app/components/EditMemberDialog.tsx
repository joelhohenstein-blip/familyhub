import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Loader2, Check, AlertCircle, Shield, Users, Lock, Edit2 } from "lucide-react";

interface EditMemberDialogProps {
  isOpen: boolean;
  member?: {
    id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    role: "admin" | "member" | "guest";
  };
  onClose: () => void;
  onChangeRole: (newRole: "admin" | "member" | "guest") => Promise<void>;
  onEditName?: () => void;
  loading?: boolean;
  error?: string;
}

const roleDescriptions: Record<
  "admin" | "member" | "guest",
  { icon: React.ReactNode; description: string }
> = {
  admin: {
    icon: <Shield className="w-5 h-5" />,
    description: "Full access to family settings and member management",
  },
  member: {
    icon: <Users className="w-5 h-5" />,
    description: "Can view and share content with the family",
  },
  guest: {
    icon: <Lock className="w-5 h-5" />,
    description: "Limited access to view shared content only",
  },
};

export function EditMemberDialog({
  isOpen,
  member,
  onClose,
  onChangeRole,
  onEditName,
  loading = false,
  error: externalError,
}: EditMemberDialogProps) {
  const { t } = useTranslation();
  const [selectedRole, setSelectedRole] = useState<"admin" | "member" | "guest">(
    member?.role || "member"
  );
  const [localError, setLocalError] = useState<string>("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (member) {
      setSelectedRole(member.role);
    }
  }, [member]);

  const handleConfirm = async () => {
    setLocalError("");
    setSuccess(false);

    if (selectedRole === member?.role) {
      setLocalError(t("members.sameRole") || "Member already has this role");
      return;
    }

    try {
      await onChangeRole(selectedRole);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to change role"
      );
    }
  };

  if (!isOpen || !member) return null;

  const displayError = externalError || localError;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {t("members.changeRole") || "Change Member Role"}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-green-700 font-medium text-center">
                {t("members.roleUpdated") ||
                  `${member.name || member.email}'s role updated!`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Member Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs text-gray-500 uppercase font-semibold">
                    {t("common.member") || "Member"}
                  </p>
                  {onEditName && (
                    <button
                      onClick={onEditName}
                      disabled={loading}
                      className="text-xs px-2 py-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <Edit2 className="w-3 h-3" />
                      {t("common.edit") || "Edit"}
                    </button>
                  )}
                </div>
                <p className="font-medium text-gray-900">
                  {member.firstName && member.lastName
                    ? `${member.firstName} ${member.lastName}`
                    : member.name || member.email}
                </p>
                <p className="text-sm text-gray-600">{member.email}</p>
              </div>

              {/* Current Role */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-600 uppercase font-semibold mb-2">
                  {t("members.currentRole") || "Current Role"}
                </p>
                <div className="flex items-center gap-2">
                  <div className="text-blue-600">
                    {roleDescriptions[member.role].icon}
                  </div>
                  <div>
                    <p className="font-medium text-blue-900 capitalize">
                      {t(`roles.${member.role}`) || member.role}
                    </p>
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  {t("common.selectNewRole") || "Select New Role"}
                </p>
                <div className="space-y-2">
                  {(["admin", "member", "guest"] as const).map((role) => (
                    <button
                      key={role}
                      onClick={() => {
                        setSelectedRole(role);
                        setLocalError("");
                      }}
                      disabled={loading}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedRole === role
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 hover:border-orange-300"
                      } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedRole === role
                              ? "border-orange-500 bg-orange-500"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedRole === role && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 capitalize flex items-center gap-2">
                            <span className="text-gray-600">
                              {roleDescriptions[role].icon}
                            </span>
                            {t(`roles.${role}`) || role}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {role === "admin"
                              ? t("roles.adminDesc") ||
                                "Full access to family settings and member management"
                              : role === "member"
                              ? t("roles.memberDesc") ||
                                "Can view and share content with the family"
                              : t("roles.guestDesc") ||
                                "Limited access to view shared content only"}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {displayError && (
                <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{displayError}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                >
                  {t("common.cancel") || "Cancel"}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading || selectedRole === member.role}
                  className="flex-1 px-4 py-2 text-white bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 rounded-lg transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("common.saving") || "Saving..."}
                    </>
                  ) : (
                    t("common.confirm") || "Confirm"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
