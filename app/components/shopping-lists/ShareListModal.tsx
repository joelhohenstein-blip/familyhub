import { useState, useEffect } from "react";
import { trpc } from "~/utils/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Check } from "lucide-react";

type TaskList = any;
type FamilyMember = any;

interface ShareListModalProps {
  list: TaskList;
  familyId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ShareListModal({
  list,
  familyId,
  isOpen,
  onClose,
  onSuccess,
}: ShareListModalProps) {
  const [selectedMembers, setSelectedMembers] = useState<
    Map<string, "view" | "edit">
  >(new Map());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fetch family members
  const { data: membersData, isLoading: membersLoading } =
    trpc.familyMembers.getMembers.useQuery(
      { familyId, limit: 100 },
      { enabled: isOpen }
    );

  const shareMutation = trpc.shoppingLists.shareList.useMutation({
    onSuccess: () => {
      setError("");
      setSuccess(true);
      setSelectedMembers(new Map());
      setTimeout(() => {
        setSuccess(false);
        onClose();
        onSuccess?.();
      }, 2000);
    },
    onError: (err) => {
      setError(err.message || "Failed to share list");
    },
  });

  const handleToggleMember = (memberId: string) => {
    const newSelected = new Map(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.set(memberId, "view");
    }
    setSelectedMembers(newSelected);
  };

  const handleAccessLevelChange = (
    memberId: string,
    level: "view" | "edit"
  ) => {
    const newSelected = new Map(selectedMembers);
    newSelected.set(memberId, level);
    setSelectedMembers(newSelected);
  };

  const handleShare = async () => {
    if (selectedMembers.size === 0) {
      setError("Please select at least one member to share with");
      return;
    }

    const membersToShare = Array.from(selectedMembers.entries()).map(
      ([memberId, accessLevel]) => ({
        memberId,
        accessLevel,
      })
    );

    try {
      await shareMutation.mutateAsync({
        listId: list.id,
        members: membersToShare,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const members = membersData?.members || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Shopping List</DialogTitle>
          <DialogDescription>
            Share "{list.title}" with family members
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            List shared successfully!
          </div>
        )}

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {membersLoading ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Loading family members...
            </p>
          ) : members.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No family members found
            </p>
          ) : (
            members.map((memberJoin) => {
              const member = memberJoin.family_members;
              const user = memberJoin.users;
              const isSelected = selectedMembers.has(member.id);
              const accessLevel = selectedMembers.get(member.id) || "view";

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-gray-100"
                >
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleMember(member.id)}
                      className="flex items-center gap-2 w-full text-left"
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected
                            ? "bg-orange-500 border-orange-500"
                            : "border-gray-300 hover:border-orange-500"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-gray-900">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </button>
                  </div>

                  {isSelected && (
                    <select
                      value={accessLevel}
                      onChange={(e) =>
                        handleAccessLevelChange(
                          member.id,
                          e.target.value as "view" | "edit"
                        )
                      }
                      className="ml-2 px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="view">View</option>
                      <option value="edit">Edit</option>
                    </select>
                  )}
                </div>
              );
            })
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={shareMutation.isPending || selectedMembers.size === 0}
            className="px-4 py-2 text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {shareMutation.isPending ? "Sharing..." : "Share"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
