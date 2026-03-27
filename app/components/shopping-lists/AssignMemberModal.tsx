import { useState } from "react";
import { trpc } from "~/utils/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Check, AlertCircle } from "lucide-react";

type TaskList = any;
type ShoppingListItem = any;
type FamilyMember = any;

interface AssignMemberModalProps {
  list: TaskList;
  items: ShoppingListItem[];
  familyId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AssignMemberModal({
  list,
  items,
  familyId,
  isOpen,
  onClose,
  onSuccess,
}: AssignMemberModalProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fetch family members
  const { data: membersData, isLoading: membersLoading } =
    trpc.familyMembers.getMembers.useQuery(
      { familyId, limit: 100 },
      { enabled: isOpen }
    );

  const assignMutation = trpc.shoppingLists.updateItem.useMutation({
    onSuccess: () => {
      setSelectedItems(new Set());
      setSelectedMemberId("");
    },
  });

  const handleToggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleAssign = async () => {
    if (selectedItems.size === 0) {
      setError("Please select at least one item");
      return;
    }

    if (!selectedMemberId) {
      setError("Please select a member to assign items to");
      return;
    }

    // Validate member exists in the family
    const memberExists = members.some(
      (memberJoin) => memberJoin.family_members.id === selectedMemberId
    );

    if (!memberExists) {
      setError("Selected member is no longer in the family. Please select another member.");
      return;
    }

    setError("");
    let successCount = 0;

    try {
      for (const itemId of selectedItems) {
        await assignMutation.mutateAsync({
          itemId,
          assignedTo: selectedMemberId,
        });
        successCount++;
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedItems(new Set());
        setSelectedMemberId("");
        onClose();
        onSuccess?.();
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to assign items";
      // Check if it's a non-member error
      if (errorMsg.includes("Member not found")) {
        setError(
          "The selected member is no longer in your family. Please select a different member."
        );
      } else {
        setError(
          successCount > 0
            ? `${errorMsg} (${successCount}/${selectedItems.size} assigned)`
            : errorMsg
        );
      }
    }
  };

  // Get unassigned items
  const unassignedItems = items.filter(
    (item) => !item.assignedTo
  );

  const members = membersData?.members || [];

  const selectedMember = members.find(
    (m) => m.family_members.id === selectedMemberId
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Items to Member</DialogTitle>
          <DialogDescription>
            Assign items in "{list.title}" to a family member
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Items assigned successfully!
          </div>
        )}

        <div className="space-y-4">
          {/* Items List */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Items ({selectedItems.size} selected)
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {unassignedItems.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  All items are already assigned
                </p>
              ) : (
                unassignedItems.map((item) => {
                  const isSelected = selectedItems.has(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggleItem(item.id)}
                      className="w-full text-left p-2 rounded-lg hover:bg-gray-50 border border-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected
                              ? "bg-orange-500 border-orange-500"
                              : "border-gray-300 hover:border-orange-500"
                          }`}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {item.itemName}
                          </p>
                          {item.quantity && (
                            <p className="text-xs text-gray-500">
                              Qty: {item.quantity} {item.unit || ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Member Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Assign to Member
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            >
              <option value="">-- Select a member --</option>
              {membersLoading ? (
                <option disabled>Loading members...</option>
              ) : (
                members.map((memberJoin) => {
                  const member = memberJoin.family_members;
                  return (
                    <option key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* Preview */}
          {selectedMember && selectedItems.size > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                Will assign {selectedItems.size} item(s) to{" "}
                <strong>
                  {selectedMember.family_members.firstName}{" "}
                  {selectedMember.family_members.lastName}
                </strong>
              </p>
            </div>
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
            onClick={handleAssign}
            disabled={
              assignMutation.isPending ||
              selectedItems.size === 0 ||
              !selectedMemberId
            }
            className="px-4 py-2 text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {assignMutation.isPending ? "Assigning..." : "Assign Items"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
