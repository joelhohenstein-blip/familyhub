import { useParams, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { trpc } from "~/utils/trpc";

export default function FamilyInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [inviteStatus, setInviteStatus] = useState<
    "loading" | "success" | "error"
  >("loading");
  const [familyName, setFamilyName] = useState<string | null>(null);

  const acceptInviteMutation = trpc.familyMembers.acceptInvite.useMutation({
    onSuccess: (data) => {
      setInviteStatus("success");
      setFamilyName(data.familyId);
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate(`/dashboard/family/${data.familyId}`);
      }, 3000);
    },
    onError: () => {
      setInviteStatus("error");
    },
  });

  useEffect(() => {
    if (!token) {
      setInviteStatus("error");
      return;
    }

    // Auto-accept the invite
    acceptInviteMutation.mutate({ token });
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-rose-50 to-teal-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        {inviteStatus === "loading" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {t("invite.processing") || "Processing Your Invitation"}
            </h2>
            <p className="text-gray-600">
              {t("invite.pleasewait") ||
                "Please wait while we add you to the family..."}
            </p>
          </div>
        )}

        {inviteStatus === "success" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t("invite.success") || "Welcome!"}
            </h2>
            <p className="text-gray-600 mb-6">
              {t("invite.successMessage") ||
                "You have successfully joined the family. Redirecting you to your family page..."}
            </p>
            <div className="flex justify-center">
              <div className="inline-block">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}

        {inviteStatus === "error" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t("invite.error") || "Invitation Invalid"}
            </h2>
            <p className="text-gray-600 mb-6">
              {t("invite.errorMessage") ||
                "This invitation link is invalid, expired, or has already been used. Please ask the family admin to send you a new invitation."}
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 text-white font-semibold bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {t("common.home") || "Go Home"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
