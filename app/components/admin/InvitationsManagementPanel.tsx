import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { trpc } from "../../utils/trpc";
import {
  Loader2,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical,
} from "lucide-react";
import { SendInvitationForm } from "./SendInvitationForm";

interface InvitationsManagementPanelProps {
  familyId: string;
}

export function InvitationsManagementPanel({
  familyId,
}: InvitationsManagementPanelProps) {
  const [showSendForm, setShowSendForm] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const pendingInvitationsQuery =
    trpc.familyMembers.getPendingInvitations.useQuery({
      familyId,
    });

  const resendInviteMutation = trpc.familyMembers.resendInvite.useMutation();
  const cancelInviteMutation = trpc.familyMembers.cancelInvite.useMutation();

  const handleResendInvite = async (invitationId: string, email: string) => {
    setActionError("");
    setActionSuccess("");

    try {
      await resendInviteMutation.mutateAsync({
        invitationId,
      });
      setActionSuccess(`Invitation resent to ${email}`);
      setExpandedMenu(null);
      pendingInvitationsQuery.refetch();

      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to resend invitation";
      setActionError(errorMsg);
    }
  };

  const handleCancelInvite = async (invitationId: string, email: string) => {
    setActionError("");
    setActionSuccess("");

    if (!confirm(`Are you sure you want to cancel the invitation for ${email}?`)) {
      return;
    }

    try {
      await cancelInviteMutation.mutateAsync({
        invitationId,
      });
      setActionSuccess(`Invitation cancelled for ${email}`);
      setExpandedMenu(null);
      pendingInvitationsQuery.refetch();

      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to cancel invitation";
      setActionError(errorMsg);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isExpired = (expiresAt: Date) => {
    return new Date(expiresAt) < new Date();
  };

  if (pendingInvitationsQuery.isLoading) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm">
        <div className="p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </div>
      </Card>
    );
  }

  const { pending = [], accepted = [], cancelled = [] } =
    pendingInvitationsQuery.data || {};

  return (
    <div className="space-y-6">
      {/* Action Messages */}
      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {actionSuccess}
        </div>
      )}

      {/* Send Invitation Form */}
      {showSendForm ? (
        <SendInvitationForm
          familyId={familyId}
          onSuccess={() => {
            setShowSendForm(false);
            pendingInvitationsQuery.refetch();
          }}
          onCancel={() => setShowSendForm(false)}
        />
      ) : (
        <Card className="bg-white border-slate-200 shadow-sm">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Send Invitation
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Invite new members to your family
              </p>
            </div>
            <Button
              onClick={() => setShowSendForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </div>
        </Card>
      )}

      {/* Pending Invitations */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Pending Invitations ({pending.length})
          </h3>

          {pending.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      Role
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      Sent
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      Expires
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((invitation: any) => (
                    <tr
                      key={invitation.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-900">
                        {invitation.email}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                          {invitation.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 capitalize">
                          {invitation.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {formatDate(invitation.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={
                            isExpired(invitation.inviteExpiresAt)
                              ? "text-red-600 font-medium"
                              : "text-slate-600"
                          }
                        >
                          {isExpired(invitation.inviteExpiresAt)
                            ? "Expired"
                            : formatDate(invitation.inviteExpiresAt)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="relative">
                          <button
                            onClick={() =>
                              setExpandedMenu(
                                expandedMenu === invitation.id
                                  ? null
                                  : invitation.id
                              )
                            }
                            disabled={
                              resendInviteMutation.isPending ||
                              cancelInviteMutation.isPending
                            }
                            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {expandedMenu === invitation.id && (
                            <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                              <button
                                onClick={() =>
                                  handleResendInvite(
                                    invitation.id,
                                    invitation.email
                                  )
                                }
                                disabled={resendInviteMutation.isPending}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors first:rounded-t-lg disabled:opacity-50"
                              >
                                {resendInviteMutation.isPending ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-2 animate-spin inline" />
                                    Resending...
                                  </>
                                ) : (
                                  "Resend Invitation"
                                )}
                              </button>
                              <button
                                onClick={() =>
                                  handleCancelInvite(
                                    invitation.id,
                                    invitation.email
                                  )
                                }
                                disabled={cancelInviteMutation.isPending}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors last:rounded-b-lg disabled:opacity-50"
                              >
                                {cancelInviteMutation.isPending ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-2 animate-spin inline" />
                                    Cancelling...
                                  </>
                                ) : (
                                  "Cancel Invitation"
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Mail className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No pending invitations</p>
            </div>
          )}
        </div>
      </Card>

      {/* Accepted Invitations */}
      {accepted.length > 0 && (
        <Card className="bg-white border-slate-200 shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Accepted Invitations ({accepted.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      Role
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      Accepted On
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accepted.map((invitation: any) => (
                    <tr
                      key={invitation.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-900">
                        {invitation.email}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                          {invitation.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {formatDate(invitation.acceptedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Cancelled Invitations */}
      {cancelled.length > 0 && (
        <Card className="bg-white border-slate-200 shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-slate-400" />
              Cancelled Invitations ({cancelled.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      Role
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      Cancelled On
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cancelled.map((invitation: any) => (
                    <tr
                      key={invitation.id}
                      className="border-b border-slate-100 text-slate-400"
                    >
                      <td className="py-3 px-4">{invitation.email}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 capitalize">
                          {invitation.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {formatDate(invitation.cancelledAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
