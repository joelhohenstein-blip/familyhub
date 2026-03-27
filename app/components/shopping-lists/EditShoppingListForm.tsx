import { useState, useEffect } from "react";
import { trpc } from "~/utils/trpc";

type TaskList = any;

interface EditShoppingListFormProps {
  list: TaskList;
  onSuccess?: () => void;
}

export function EditShoppingListForm({
  list,
  onSuccess,
}: EditShoppingListFormProps) {
  const [title, setTitle] = useState(list.title);
  const createdAtDate = typeof list.createdAt === 'string' ? new Date(list.createdAt) : list.createdAt;
  const [date, setDate] = useState(createdAtDate ? createdAtDate.toISOString().split('T')[0] : "");
  const [notes, setNotes] = useState(list.description || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const updateMutation = trpc.shoppingLists.updateList.useMutation({
    onSuccess: () => {
      setError("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onSuccess?.();
    },
    onError: (err) => {
      setError(err.message || "Failed to update shopping list");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("List name is required");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        listId: list.id,
        title: title.trim(),
        notes: notes.trim() || undefined,
        date: date ? new Date(date).toISOString() : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          Shopping list updated successfully!
        </div>
      )}

      {/* List Name */}
      <div className="space-y-2">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          List Name *
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Weekly Groceries"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          disabled={updateMutation.isPending}
        />
      </div>

      {/* Date */}
      <div className="space-y-2">
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
          Date
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          disabled={updateMutation.isPending}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes for this shopping list..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
          disabled={updateMutation.isPending}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={updateMutation.isPending}
        className="w-full py-2 text-white font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200"
      >
        {updateMutation.isPending ? "Updating..." : "Update Shopping List"}
      </button>
    </form>
  );
}
