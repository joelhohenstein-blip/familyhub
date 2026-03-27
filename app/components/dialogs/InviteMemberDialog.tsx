"use client";

import { useState } from "react";
import { trpc } from "~/utils/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Loader2, Copy, Check, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";

interface InviteMemberDialogProps {
  familyId: string;
  onInviteSuccess?: () => void;
}

type Role = "admin" | "member" | "guest";

export function InviteMemberDialog({
  familyId,
  onInviteSuccess,
}: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [expirationDays, setExpirationDays] = useState("7");
  const [copied, setCopied] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [inviteType, setInviteType] = useState<"email" | "link">("link");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const { data: pendingInvites, refetch: refetchPendingInvites } =
    trpc.invites.getInviteDetails.useQuery(
      { familyId },
      { enabled: open && !!familyId }
    );

  const generateLinkMutation = trpc.invites.generateInviteLink.useMutation({
    onSuccess: (data: any) => {
      setGeneratedLink(data.inviteLink);
      setMessage({
        type: "success",
        text: "Invite link generated successfully!",
      });
    },
    onError: (error: any) => {
      setMessage({ type: "error", text: error.message });
    },
  });

  const emailInviteMutation = trpc.familyMembers.inviteMembers.useMutation({
    onSuccess: (data: any) => {
      setMessage({
        type: "success",
        text: data.message || "Invitations sent successfully!",
      });
      setEmail("");
      setRole("member");
      refetchPendingInvites();
      onInviteSuccess?.();
    },
    onError: (error: any) => {
      setMessage({ type: "error", text: error.message });
    },
  });

  const revokeInviteMutation = trpc.invites.revokeInvite.useMutation({
    onSuccess: () => {
      setMessage({ type: "success", text: "Invitation revoked successfully" });
      refetchPendingInvites();
    },
    onError: (error: any) => {
      setMessage({ type: "error", text: error.message });
    },
  });

  const handleGenerateLink = () => {
    if (!email) {
      setMessage({ type: "error", text: "Please enter an email address" });
      return;
    }

    generateLinkMutation.mutate({
      familyId,
      email,
      role,
      expirationDays: parseInt(expirationDays),
    });
  };

  const handleEmailInvite = () => {
    if (!email) {
      setMessage({ type: "error", text: "Please enter an email address" });
      return;
    }

    emailInviteMutation.mutate({
      familyId,
      emails: [email],
      role,
    });
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRevokeInvite = (invitationId: string) => {
    revokeInviteMutation.mutate({
      familyId,
      invitationId,
    });
  };

  const activeInvites = pendingInvites?.activeInvites || [];
  const expiredInvites = pendingInvites?.expiredInvites || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Invite Member</Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invite Family Member</DialogTitle>
          <DialogDescription>
            Generate a shareable invite link or send an email invitation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"}>
              {message.type === "error" ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Invite Type Selection */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="link"
                checked={inviteType === "link"}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteType(e.target.value as "link" | "email")}
              />
              <span>Generate Shareable Link</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="email"
                checked={inviteType === "email"}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteType(e.target.value as "link" | "email")}
              />
              <span>Send Email Invitation</span>
            </label>
          </div>

          {/* Invite Form */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                placeholder="member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Role</label>
              <Select value={role} onValueChange={(v: string) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {role === "admin" && "Can manage family, members, and settings"}
                {role === "member" && "Can access all family features"}
                {role === "guest" && "Can view content but cannot create or modify"}
              </p>
            </div>

            {inviteType === "link" && (
              <div>
                <label className="text-sm font-medium">Expires In (days)</label>
                <Select
                  value={expirationDays}
                  onValueChange={(value: string) => setExpirationDays(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={
                inviteType === "link"
                  ? handleGenerateLink
                  : handleEmailInvite
              }
              disabled={
                generateLinkMutation.isPending || emailInviteMutation.isPending
              }
              className="w-full"
            >
              {(generateLinkMutation.isPending ||
                emailInviteMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {inviteType === "link" ? "Generate Link" : "Send Invitation"}
            </Button>
          </div>

          {/* Generated Link Display */}
          {generatedLink && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="text-sm font-medium block mb-2">Invite Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Share this link with the member. They can accept the invitation
                without creating a new account.
              </p>
            </div>
          )}

          {/* Pending Invites List */}
          {activeInvites.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-3">Active Invitations</h3>
              <div className="space-y-2">
                {activeInvites.map((invite: any) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div>
                      <p className="text-sm font-medium">{invite.email}</p>
                      <p className="text-xs text-gray-500">
                        Role: {invite.role} | Expires:{" "}
                        {new Date(invite.inviteExpiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevokeInvite(invite.id)}
                      disabled={revokeInviteMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expiredInvites.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
              <p>
                <strong>{expiredInvites.length} expired invitation(s)</strong> can
                be renewed by generating a new link.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
