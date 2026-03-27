import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { trpc } from "../../utils/trpc";
import { Loader2, Trash2, UserPlus } from "lucide-react";

export function FamilyManagementSection() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [showForm, setShowForm] = useState(false);
  const [familyId, setFamilyId] = useState<string>("");

  // Get user's families first
  const myFamiliesQuery = trpc.families.getMyFamilies.useQuery();
  const currentFamily = myFamiliesQuery.data?.[0];

  // Get members for the current family
  const membersQuery = trpc.familyMembers.getMembers.useQuery(
    { familyId: currentFamily?.id || "" },
    { enabled: !!currentFamily?.id }
  );

  const inviteMembersMutation = trpc.familyMembers.inviteMembers.useMutation();
  const removeMemberMutation = trpc.familyMembers.removeFromFamily.useMutation();

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFamily?.id) return;

    try {
      await inviteMembersMutation.mutateAsync({
        familyId: currentFamily.id,
        emails: [email],
        role: role as "admin" | "member" | "guest",
      });
      setEmail("");
      setRole("member");
      setShowForm(false);
      membersQuery.refetch();
    } catch (error) {
      console.error("Failed to add member:", error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentFamily?.id) return;
    if (confirm("Are you sure you want to remove this member?")) {
      try {
        await removeMemberMutation.mutateAsync({
          familyId: currentFamily.id,
          memberId,
        });
        membersQuery.refetch();
      } catch (error) {
        console.error("Failed to remove member:", error);
      }
    }
  };

  if (myFamiliesQuery.isLoading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
      </Card>
    );
  }

  if (!currentFamily) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm">
        <div className="p-8 text-center">
          <p className="text-slate-600 mb-4">No family created yet.</p>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            Create Family
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <div className="p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Family Members</h2>
        <p className="text-slate-600 mb-6">Manage members of {currentFamily.surname}</p>

        {/* Add Member Form */}
        {showForm ? (
          <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Family Member</h3>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="member@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="guest">Guest</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={inviteMembersMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {inviteMembersMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Member"
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-slate-300 hover:bg-slate-400 text-slate-900"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <Button
            onClick={() => setShowForm(true)}
            className="mb-8 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Family Member
          </Button>
        )}

        {/* Members List */}
        {membersQuery.isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-3">
            {membersQuery.data && (membersQuery.data as any).members && (membersQuery.data as any).members.length > 0 ? (
              (membersQuery.data as any).members.map((member: any) => (
                <div
                  key={member.family_members.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{member.users.email}</p>
                    <p className="text-sm text-slate-500 capitalize">{member.family_members.role}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.family_members.id)}
                    disabled={removeMemberMutation.isPending}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>No family members yet. Add one to get started!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
