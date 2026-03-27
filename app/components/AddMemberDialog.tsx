import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Loader2, Check, AlertCircle } from "lucide-react";
import { z } from "zod";

interface AddMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (
    email: string,
    role: "admin" | "member" | "guest"
  ) => Promise<void>;
  loading?: boolean;
  error?: string;
}

const addMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "member", "guest"]),
});

export function AddMemberDialog({
  isOpen,
  onClose,
  onAddMember,
  loading = false,
  error: externalError,
}: AddMemberDialogProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "guest">("member");
  const [localError, setLocalError] = useState<string>("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    setSuccess(false);

    // Validate input
    try {
      addMemberSchema.parse({ email, role });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setLocalError(err.issues[0].message);
      }
      return;
    }

    try {
      await onAddMember(email, role);
      setSuccess(true);
      setEmail("");
      setRole("member");
      // Close after brief success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to add member"
      );
    }
  };

  if (!isOpen) return null;

  const displayError = externalError || localError;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {t("members.addMember") || "Add Family Member"}
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
                {t("members.inviteSent") || "Invitation sent successfully!"}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("common.email") || "Email Address"}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setLocalError("");
                  }}
                  disabled={loading}
                  placeholder={t("common.emailPlaceholder") || "member@example.com"}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t("common.role") || "Role"}
                </label>
                <div className="space-y-2">
                  {["admin", "member", "guest"].map((r) => (
                    <label
                      key={r}
                      className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r}
                        checked={role === r}
                        onChange={(e) =>
                          setRole(e.target.value as "admin" | "member" | "guest")
                        }
                        disabled={loading}
                        className="mt-1 w-4 h-4 text-orange-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 capitalize">
                          {t(`roles.${r}`) || r}
                        </p>
                        <p className="text-xs text-gray-500">
                          {r === "admin"
                            ? t("roles.adminDesc") || "Full access to family settings"
                            : r === "member"
                            ? t("roles.memberDesc") || "Can view and share content"
                            : t("roles.guestDesc") || "Limited access"}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {displayError && (
                <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{displayError}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                >
                  {t("common.cancel") || "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="flex-1 px-4 py-2 text-white bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 rounded-lg transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("common.sending") || "Sending..."}
                    </>
                  ) : (
                    t("members.sendInvite") || "Send Invite"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
