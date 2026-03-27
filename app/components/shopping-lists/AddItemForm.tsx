import { useState } from "react";
import { trpc } from "~/utils/trpc";
import { Plus } from "lucide-react";

interface AddItemFormProps {
  listId: string;
  onSuccess?: () => void;
}

export function AddItemForm({ listId, onSuccess }: AddItemFormProps) {
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState<number>();
  const [unit, setUnit] = useState<string>("");
  const [category, setCategory] = useState("other");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const addMutation = trpc.shoppingLists.addItem.useMutation({
    onSuccess: () => {
      setItemName("");
      setQuantity(undefined);
      setUnit("");
      setCategory("other");
      setError("");
      setShowForm(false);
      onSuccess?.();
    },
    onError: (err) => {
      setError(err.message || "Failed to add item");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!itemName.trim()) {
      setError("Item name is required");
      return;
    }

    try {
      await addMutation.mutateAsync({
        listId,
        itemName: itemName.trim(),
        quantity: quantity ? Number(quantity) : undefined,
        unit: (unit || undefined) as "piece" | "kg" | "lbs" | "ml" | "L" | "dozen" | "oz" | "cup" | "tbsp" | "tsp" | undefined,
        category: category as "produce" | "meat" | "dairy" | "pantry" | "household" | "other",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Item
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {/* Item Name */}
        <div className="space-y-1">
          <label htmlFor="itemName" className="block text-xs font-medium text-gray-700">
            Item Name *
          </label>
          <input
            id="itemName"
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g., Milk"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            disabled={addMutation.isPending}
            autoFocus
          />
        </div>

        {/* Quantity */}
        <div className="space-y-1">
          <label htmlFor="quantity" className="block text-xs font-medium text-gray-700">
            Quantity
          </label>
          <input
            id="quantity"
            type="number"
            min="0"
            value={quantity ?? ""}
            onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="e.g., 2"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            disabled={addMutation.isPending}
          />
        </div>

        {/* Unit */}
        <div className="space-y-1">
          <label htmlFor="unit" className="block text-xs font-medium text-gray-700">
            Unit
          </label>
          <select
            id="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            disabled={addMutation.isPending}
          >
            <option value="">Select unit</option>
            <option value="piece">Piece</option>
            <option value="kg">Kg</option>
            <option value="lbs">Lbs</option>
            <option value="ml">Ml</option>
            <option value="L">L</option>
            <option value="dozen">Dozen</option>
            <option value="oz">Oz</option>
            <option value="cup">Cup</option>
            <option value="tbsp">Tbsp</option>
            <option value="tsp">Tsp</option>
          </select>
        </div>

        {/* Category */}
        <div className="space-y-1">
          <label htmlFor="category" className="block text-xs font-medium text-gray-700">
            Category *
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            disabled={addMutation.isPending}
          >
            <option value="produce">Produce</option>
            <option value="meat">Meat</option>
            <option value="dairy">Dairy</option>
            <option value="pantry">Pantry</option>
            <option value="household">Household</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="px-3 py-1 text-sm text-gray-700 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
          disabled={addMutation.isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={addMutation.isPending}
          className="px-3 py-1 text-sm text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
        >
          {addMutation.isPending ? "Adding..." : "Add Item"}
        </button>
      </div>
    </form>
  );
}
