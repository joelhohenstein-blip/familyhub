import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface InviteMembersFormProps {
  onSubmit: (data: {
    emails: string[];
    role: "admin" | "member" | "guest";
  }) => Promise<void>;
  loading?: boolean;
  error?: string;
}

export function InviteMembersForm({
  onSubmit,
  loading = false,
  error,
}: InviteMembersFormProps) {
  const { t } = useTranslation();
  const [emails, setEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "guest">("member");
  const [formError, setFormError] = useState<string>(error || "");
  const [emailError, setEmailError] = useState<string>("");

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAddEmail = () => {
    const trimmedEmail = currentEmail.trim();

    if (!trimmedEmail) {
      setEmailError("Email is required");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setEmailError("Invalid email address");
      return;
    }

    if (emails.includes(trimmedEmail)) {
      setEmailError("Email already added");
      return;
    }

    setEmails([...emails, trimmedEmail]);
    setCurrentEmail("");
    setEmailError("");
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails(emails.filter((e) => e !== emailToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (emails.length === 0) {
      setFormError("Add at least one email address");
      return;
    }

    try {
      await onSubmit({
        emails,
        role,
      });
      setEmails([]);
      setCurrentEmail("");
      setRole("member");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to send invitations"
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {(formError || error) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {formError || error}
        </div>
      )}

      {/* Email Input */}
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          {t("invite.email") || "Email Address"}
        </label>
        <div className="flex gap-2">
          <input
            id="email"
            type="email"
            value={currentEmail}
            onChange={(e) => {
              setCurrentEmail(e.target.value);
              setEmailError("");
            }}
            onKeyPress={handleKeyPress}
            placeholder="name@example.com"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            disabled={loading}
          />
          <button
            type="button"
            onClick={handleAddEmail}
            disabled={loading}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("invite.add") || "Add"}
          </button>
        </div>
        {emailError && (
          <p className="text-sm text-red-500">{emailError}</p>
        )}
      </div>

      {/* Email List */}
      {emails.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t("invite.list") || "Invited Emails"} ({emails.length})
          </label>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            {emails.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between bg-white p-3 rounded border border-gray-200"
              >
                <span className="text-sm text-gray-700">{email}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveEmail(email)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Selector */}
      <div className="space-y-2">
        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
          {t("invite.role") || "Role"}
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as "admin" | "member" | "guest")}
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
        >
          <option value="member">{t("roles.member") || "Member"}</option>
          <option value="guest">{t("roles.guest") || "Guest"}</option>
          <option value="admin">{t("roles.admin") || "Admin"}</option>
        </select>
        <p className="text-xs text-gray-500">
          {role === "admin"
            ? "Full access to family settings"
            : role === "member"
            ? "Can view and share content"
            : "Limited access"}
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || emails.length === 0}
        className="w-full py-3 text-white font-semibold bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        {loading ? "Sending invitations..." : "Send Invitations"}
      </button>
    </form>
  );
}
