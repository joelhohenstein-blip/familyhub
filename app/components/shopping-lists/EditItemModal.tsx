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
import { AlertCircle, Check } from "lucide-react";

type TaskList = any;
type ShoppingListItem = any;

interface EditItemModalProps {
  list: TaskList;
  item: ShoppingListItem | null;
  familyId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const categoryOptions = [
  { value: "produce", label: "Produce" },
  { value: "meat", label: "Meat" },
  { value: "dairy", label: "Dairy" },
  { value: "pantry", label: "Pantry" },
  { value: "household", label: "Household" },
  { value: "other", label: "Other" },
];

const unitOptions = [
  { value: "piece", label: "Piece" },
  { value: "kg", label: "Kilogram (kg)" },
  { value: "lbs", label: "Pounds (lbs)" },
  { value: "ml", label: "Milliliter (ml)" },
  { value: "L", label: "Liter (L)" },
  { value: "dozen", label: "Dozen" },
  { value: "oz", label: "Ounce (oz)" },
  { value: "cup", label: "Cup" },
  { value: "tbsp", label: "Tablespoon (tbsp)" },
  { value: "tsp", label: "Teaspoon (tsp)" },
];

export function EditItemModal({
  list,
  item,
  familyId,
  isOpen,
  onClose,
  onSuccess,
}: EditItemModalProps) {
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState<number | null>(null);
  const [unit, setUnit] = useState<string>("");
  const [category, setCategory] = useState("other");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Reset form when item changes or modal opens
  useEffect(() => {
    if (item && isOpen) {
      setItemName(item.itemName || "");
      setQuantity(item.quantity || null);
      setUnit(item.unit || "");
      setCategory(item.category || "other");
      setError("");
      setSuccess(false);
    }
  }, [item, isOpen]);

  const updateMutation = trpc.shoppingLists.updateItem.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        onSuccess?.();
      }, 1500);
    },
    onError: (err) => {
      setError(err.message || "Failed to update item");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemName.trim()) {
      setError("Item name cannot be empty");
      return;
    }

    if (!item?.id) {
      setError("Item not found");
      return;
    }

    setError("");

    try {
      await updateMutation.mutateAsync({
        itemId: item.id,
        itemName: itemName.trim(),
        quantity: quantity || undefined,
        unit: unit ? (unit as "piece" | "kg" | "lbs" | "ml" | "L" | "dozen" | "oz" | "cup" | "tbsp" | "tsp") : undefined,
        category: category as "produce" | "meat" | "dairy" | "pantry" | "household" | "other",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>
            Update "{item.itemName}" in "{list.title}"
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex gap-2 text-green-700 text-sm">
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>Item updated successfully!</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Name */}
          <div className="space-y-2">
            <label htmlFor="itemName" className="block text-sm font-medium text-gray-700">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              id="itemName"
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g., Apples"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              disabled={updateMutation.isPending || success}
            />
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
              Quantity
            </label>
            <input
              id="quantity"
              type="number"
              min="0"
              step="0.1"
              value={quantity || ""}
              onChange={(e) =>
                setQuantity(e.target.value ? parseFloat(e.target.value) : null)
              }
              placeholder="e.g., 5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              disabled={updateMutation.isPending || success}
            />
          </div>

          {/* Unit */}
          <div className="space-y-2">
            <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
              Unit
            </label>
            <select
              id="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              disabled={updateMutation.isPending || success}
            >
              <option value="">-- No unit --</option>
              {unitOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              disabled={updateMutation.isPending || success}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </form>

        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={updateMutation.isPending || success}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={updateMutation.isPending || success || !itemName.trim()}
            className="px-4 py-2 text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {updateMutation.isPending ? "Updating..." : "Update Item"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
