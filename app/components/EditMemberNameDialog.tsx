import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Loader2, Check, AlertCircle } from "lucide-react";

interface EditMemberNameDialogProps {
  isOpen: boolean;
  member?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  onClose: () => void;
  onSaveName: (firstName: string, lastName: string) => Promise<void>;
  loading?: boolean;
  error?: string;
}

const NAME_REGEX = /^[a-zA-Z\s'-]+$/;

export function EditMemberNameDialog({
  isOpen,
  member,
  onClose,
  onSaveName,
  loading = false,
  error: externalError,
}: EditMemberNameDialogProps) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [localError, setLocalError] = useState<string>("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (member) {
      setFirstName(member.firstName || "");
      setLastName(member.lastName || "");
      setLocalError("");
    }
  }, [member, isOpen]);

  const validateNames = (): boolean => {
    setLocalError("");

    if (!firstName.trim()) {
      setLocalError("First name is required");
      return false;
    }

    if (!lastName.trim()) {
      setLocalError("Last name is required");
      return false;
    }

    if (firstName.length > 100) {
      setLocalError("First name must be 100 characters or less");
      return false;
    }

    if (lastName.length > 100) {
      setLocalError("Last name must be 100 characters or less");
      return false;
    }

    if (!NAME_REGEX.test(firstName)) {
      setLocalError("First name contains prohibited characters (use letters, spaces, hyphens, and apostrophes only)");
      return false;
    }

    if (!NAME_REGEX.test(lastName)) {
      setLocalError("Last name contains prohibited characters (use letters, spaces, hyphens, and apostrophes only)");
      return false;
    }

    return true;
  };

  const handleConfirm = async () => {
    if (!validateNames()) {
      return;
    }

    setLocalError("");
    setSuccess(false);

    try {
      await onSaveName(firstName.trim(), lastName.trim());
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to update member name"
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
            {t("members.editName") || "Edit Member Name"}
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
                {t("members.nameUpdated") || "Member name updated successfully!"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Member Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                  {t("common.member") || "Member"}
                </p>
                <p className="text-sm text-gray-600">{member.email}</p>
              </div>

              {/* First Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("common.firstName") || "First Name"}
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setLocalError("");
                  }}
                  disabled={loading}
                  placeholder="Enter first name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:opacity-50"
                />
              </div>

              {/* Last Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("common.lastName") || "Last Name"}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    setLocalError("");
                  }}
                  disabled={loading}
                  placeholder="Enter last name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:opacity-50"
                />
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
                  disabled={loading || (!firstName.trim() && !lastName.trim())}
                  className="flex-1 px-4 py-2 text-white bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 rounded-lg transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("common.saving") || "Saving..."}
                    </>
                  ) : (
                    t("common.save") || "Save"
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
