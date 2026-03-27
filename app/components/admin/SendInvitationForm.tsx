import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { trpc } from "../../utils/trpc";
import { Loader2, X } from "lucide-react";

interface SendInvitationFormProps {
  familyId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SendInvitationForm({
  familyId,
  onSuccess,
  onCancel,
}: SendInvitationFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const inviteMembersMutation = trpc.familyMembers.inviteMembers.useMutation();

  // Email validation regex
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    // Validate email
    if (!email.trim()) {
      setError("Email address is required");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      const result = await inviteMembersMutation.mutateAsync({
        familyId,
        emails: [email],
        role: role as "admin" | "member" | "guest",
      });

      setSuccessMessage(`Invitation sent to ${email}`);
      setEmail("");
      setRole("member");

      // Clear message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("");
        onSuccess?.();
      }, 3000);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to send invitation";
      setError(errorMsg);
    }
  };

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Send Invitation
          </h3>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {successMessage}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="person@example.com"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={inviteMembersMutation.isPending}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={inviteMembersMutation.isPending}
            >
              <option value="guest">Guest</option>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={inviteMembersMutation.isPending || !email.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inviteMembersMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Invitation"
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                onClick={onCancel}
                className="bg-slate-200 hover:bg-slate-300 text-slate-900"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>
    </Card>
  );
}
