import { useMemo, useState } from "react";
import { trpc } from "~/utils/trpc";
import { Check, Trash2, Edit2, Share2, Calendar, Users } from "lucide-react";
import { AddItemForm } from "./AddItemForm";
import { ShareListModal } from "./ShareListModal";
import { LinkToEventModal } from "./LinkToEventModal";
import { AssignMemberModal } from "./AssignMemberModal";
import { EditItemModal } from "./EditItemModal";

type TaskList = any;
type ShoppingListItem = any;

interface ShoppingListDetailProps {
  list: TaskList;
  items: ShoppingListItem[];
  familyId: string;
  onRefresh?: () => void;
}

const categoryLabels: Record<string, string> = {
  produce: "🥬 Produce",
  meat: "🥩 Meat",
  dairy: "🥛 Dairy",
  pantry: "📦 Pantry",
  household: "🧹 Household",
  other: "📝 Other",
};

const unitLabels: Record<string, string> = {
  piece: "pc",
  kg: "kg",
  lbs: "lbs",
  ml: "ml",
  L: "L",
  dozen: "dozen",
  oz: "oz",
  cup: "cup",
  tbsp: "tbsp",
  tsp: "tsp",
};

export function ShoppingListDetail({
  list,
  items,
  familyId,
  onRefresh,
}: ShoppingListDetailProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [linkEventModalOpen, setLinkEventModalOpen] = useState(false);
  const [assignMemberModalOpen, setAssignMemberModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedItemToEdit, setSelectedItemToEdit] = useState<ShoppingListItem | null>(null);

  const updateMutation = trpc.shoppingLists.updateItem.useMutation({
    onSuccess: () => {
      onRefresh?.();
    },
  });

  const deleteMutation = trpc.shoppingLists.deleteItem.useMutation({
    onSuccess: () => {
      onRefresh?.();
    },
  });

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, ShoppingListItem[]> = {
      produce: [],
      meat: [],
      dairy: [],
      pantry: [],
      household: [],
      other: [],
    };

    items.forEach((item) => {
      const category = (item.category || "other") as keyof typeof grouped;
      if (category in grouped) {
        grouped[category].push(item);
      }
    });

    return grouped;
  }, [items]);

  // Separate checked and unchecked items
  const getCheckedAndUnchecked = (categoryItems: ShoppingListItem[]) => {
    const unchecked = categoryItems.filter((item) => !item.isChecked);
    const checked = categoryItems.filter((item) => item.isChecked);
    return { unchecked, checked };
  };

  const handleToggleCheck = (itemId: string, isChecked: boolean) => {
    updateMutation.mutate({
      itemId,
      isChecked: !isChecked,
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm("Delete this item?")) {
      deleteMutation.mutate({ itemId });
    }
  };

  const handleEditItem = (item: ShoppingListItem) => {
    setSelectedItemToEdit(item);
    setEditModalOpen(true);
  };

  const categoriesWithItems = Object.entries(itemsByCategory).filter(
    ([_, items]) => items.length > 0
  );

  return (
    <div className="space-y-4">
      {/* List Header */}
      <div className="bg-gradient-to-r from-orange-50 to-rose-50 p-4 rounded-lg border border-orange-200">
        <h2 className="text-2xl font-bold text-gray-900">{list.title}</h2>
        {list.description && (
          <p className="text-sm text-gray-600 mt-1">{list.description}</p>
        )}
        <p className="text-xs text-gray-500 mt-2">
          {items.length} items
          {items.filter((i) => i.isChecked).length > 0 &&
            ` • ${items.filter((i) => i.isChecked).length} completed`}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShareModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Share List
        </button>
        <button
          onClick={() => setLinkEventModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
        >
          <Calendar className="w-4 h-4" />
          Link to Event
        </button>
        <button
          onClick={() => setAssignMemberModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors"
        >
          <Users className="w-4 h-4" />
          Assign Items
        </button>
      </div>

      {/* Add Item Form */}
      <AddItemForm listId={list.id} onSuccess={onRefresh} />

      {/* Items by Category */}
      {categoriesWithItems.length > 0 ? (
        <div className="space-y-4">
          {categoriesWithItems.map(([category, categoryItems]) => {
            const { unchecked, checked } = getCheckedAndUnchecked(categoryItems);
            const allItems = [...unchecked, ...checked];

            return (
              <div key={category} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-100 to-orange-50 px-4 py-2 border-b border-orange-200">
                  <h3 className="font-semibold text-gray-900">
                    {categoryLabels[category] || category}
                  </h3>
                </div>

                <div className="divide-y divide-gray-100">
                  {allItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 flex items-center gap-3 transition-colors ${
                        item.isChecked
                          ? "bg-gray-50"
                          : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleCheck(item.id, item.isChecked)}
                        disabled={updateMutation.isPending}
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          item.isChecked
                            ? "bg-green-500 border-green-500"
                            : "border-gray-300 hover:border-orange-500"
                        }`}
                      >
                        {item.isChecked && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </button>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium transition-colors ${
                            item.isChecked
                              ? "text-gray-500 line-through"
                              : "text-gray-900"
                          }`}
                        >
                          {item.itemName}
                        </p>
                        {(item.quantity || item.unit) && (
                          <p className="text-sm text-gray-500">
                            {item.quantity} {item.unit ? unitLabels[item.unit] : ""}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex gap-2">
                        <button
                          onClick={() => handleEditItem(item)}
                          disabled={updateMutation.isPending}
                          className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                          title="Edit item"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={deleteMutation.isPending}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No items in this list yet.</p>
          <p className="text-sm">Add items using the form above.</p>
        </div>
      )}

      {/* Modals */}
      <ShareListModal
        list={list}
        familyId={familyId}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onSuccess={onRefresh}
      />

      <LinkToEventModal
        list={list}
        familyId={familyId}
        isOpen={linkEventModalOpen}
        onClose={() => setLinkEventModalOpen(false)}
        onSuccess={onRefresh}
      />

      <AssignMemberModal
        list={list}
        items={items}
        familyId={familyId}
        isOpen={assignMemberModalOpen}
        onClose={() => setAssignMemberModalOpen(false)}
        onSuccess={onRefresh}
      />

      <EditItemModal
        list={list}
        item={selectedItemToEdit}
        familyId={familyId}
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedItemToEdit(null);
        }}
        onSuccess={onRefresh}
      />
    </div>
  );
}
