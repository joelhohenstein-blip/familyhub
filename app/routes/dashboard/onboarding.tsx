import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Check } from "lucide-react";
import { trpc } from "~/utils/trpc";
import { FamilyForm } from "~/components/FamilyForm";
import { InviteMembersForm } from "~/components/InviteMembersForm";

type OnboardingStep = "family" | "avatar" | "invite" | "roles";

export default function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("family");
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyData, setFamilyData] = useState<{
    surname: string;
    avatarUrl?: string;
  } | null>(null);

  const createFamilyMutation = trpc.families.create.useMutation();
  const updateAvatarMutation = trpc.families.updateFamilyAvatar.useMutation();
  const inviteMutation = trpc.familyMembers.inviteMembers.useMutation();

  const steps: { id: OnboardingStep; label: string; icon?: string }[] = [
    { id: "family", label: t("onboarding.steps.family") || "Create Family" },
    { id: "avatar", label: t("onboarding.steps.avatar") || "Add Avatar" },
    { id: "invite", label: t("onboarding.steps.invite") || "Invite Members" },
    {
      id: "roles",
      label: t("onboarding.steps.roles") || "Set Member Roles",
    },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const handleCreateFamily = async (data: {
    surname: string;
    avatarUrl?: string;
    description?: string;
  }) => {
    try {
      const newFamily = await createFamilyMutation.mutateAsync({
        surname: data.surname,
        avatarUrl: data.avatarUrl,
        description: data.description,
      });

      setFamilyId(newFamily.id);
      setFamilyData(data);
      setCurrentStep("avatar");
    } catch (error) {
      console.error("Failed to create family:", error);
      throw error;
    }
  };

  const handleUpdateAvatar = async (data: {
    surname: string;
    avatarUrl?: string;
    description?: string;
  }) => {
    if (!familyId) return;

    try {
      if (data.avatarUrl) {
        await updateAvatarMutation.mutateAsync({
          familyId,
          avatarUrl: data.avatarUrl,
        });
      }

      setFamilyData(data);
      setCurrentStep("invite");
    } catch (error) {
      console.error("Failed to update avatar:", error);
      throw error;
    }
  };

  const handleInviteMembers = async (data: {
    emails: string[];
    role: "admin" | "member" | "guest";
  }) => {
    if (!familyId) return;

    try {
      await inviteMutation.mutateAsync({
        familyId,
        emails: data.emails,
        role: data.role,
      });

      setCurrentStep("roles");
    } catch (error) {
      console.error("Failed to invite members:", error);
      throw error;
    }
  };

  const handleComplete = () => {
    if (familyId) {
      navigate(`/dashboard/family/${familyId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-rose-50 to-teal-50 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">
            <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-teal-500 bg-clip-text text-transparent">
              {t("onboarding.title") || "Welcome to FamilyHub"}
            </span>
          </h1>
          <p className="text-lg text-gray-600">
            {t("onboarding.subtitle") ||
              "Let's set up your family. Follow these steps to get started."}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    index <= currentStepIndex
                      ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {index < currentStepIndex ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-1 mx-2 rounded transition-all ${
                      index < currentStepIndex
                        ? "bg-gradient-to-r from-orange-500 to-rose-500"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm">
            {steps.map((step) => (
              <span
                key={step.id}
                className="text-center text-gray-600 w-20 text-xs"
              >
                {step.label}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          {currentStep === "family" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {t("onboarding.family.title") || "Create Your Family"}
              </h2>
              <FamilyForm
                onSubmit={handleCreateFamily}
                loading={createFamilyMutation.isPending}
                error={
                  createFamilyMutation.error?.message ||
                  (createFamilyMutation.error as any)?.message
                }
              />
            </div>
          )}

          {currentStep === "avatar" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {t("onboarding.avatar.title") || "Add Family Avatar"}
              </h2>
              <p className="text-gray-600 mb-6">
                {t("onboarding.avatar.description") ||
                  "Upload a photo to represent your family (optional)."}
              </p>
              <FamilyForm
                initialValues={familyData || undefined}
                onSubmit={handleUpdateAvatar}
                loading={updateAvatarMutation.isPending}
                error={
                  updateAvatarMutation.error?.message ||
                  (updateAvatarMutation.error as any)?.message
                }
              />
            </div>
          )}

          {currentStep === "invite" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {t("onboarding.invite.title") || "Invite Family Members"}
              </h2>
              <p className="text-gray-600 mb-6">
                {t("onboarding.invite.description") ||
                  "Invite people to join your family (optional - you can add them later)."}
              </p>
              <InviteMembersForm
                onSubmit={handleInviteMembers}
                loading={inviteMutation.isPending}
                error={
                  inviteMutation.error?.message ||
                  (inviteMutation.error as any)?.message
                }
              />
              <button
                onClick={() => setCurrentStep("roles")}
                className="w-full mt-4 py-3 text-orange-600 font-semibold border-2 border-orange-500 rounded-lg hover:bg-orange-50 transition-all duration-200"
              >
                {t("onboarding.skip") || "Skip for Now"}
              </button>
            </div>
          )}

          {currentStep === "roles" && (
            <div className="text-center">
              <div className="mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t("onboarding.complete.title") || "All Set!"}
              </h2>
              <p className="text-gray-600 mb-8">
                {t("onboarding.complete.description") ||
                  "Your family is ready. You can now access your family hub and manage members."}
              </p>
              <button
                onClick={handleComplete}
                className="w-full py-3 text-white font-semibold bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {t("onboarding.viewFamily") || "View Your Family"}
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        {currentStep !== "family" && currentStep !== "roles" && (
          <button
            onClick={() => {
              const prevIndex = Math.max(0, currentStepIndex - 1);
              setCurrentStep(steps[prevIndex].id);
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            {t("common.back") || "Back"}
          </button>
        )}
      </div>
    </div>
  );
}
