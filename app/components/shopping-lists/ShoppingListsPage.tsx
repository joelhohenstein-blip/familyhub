import { useState } from "react";
import { trpc } from "~/utils/trpc";
import { useTranslation } from "react-i18next";
import { CreateShoppingListForm } from "./CreateShoppingListForm";
import { EditShoppingListForm } from "./EditShoppingListForm";
import { ShoppingListDetail } from "./ShoppingListDetail";
import { Trash2 } from "lucide-react";

interface ShoppingListsPageProps {
  familyId: string;
}

export function ShoppingListsPage({ familyId }: ShoppingListsPageProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"view" | "create" | "edit">(
    "view"
  );
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Fetch lists
  const { data: listsData, isLoading, refetch } = trpc.shoppingLists.getListsByFamily.useQuery(
    {
      familyId,
      limit: 50,
    },
    { enabled: !!familyId }
  );

  // Fetch selected list details
  const { data: listDetailsData } = trpc.shoppingLists.getListById.useQuery(
    { listId: selectedListId! },
    { enabled: !!selectedListId && activeTab === "view" }
  );

  // Delete mutation
  const deleteMutation = trpc.shoppingLists.deleteList.useMutation({
    onSuccess: () => {
      setSelectedListId(null);
      refetch();
    },
  });

  // Subscribe to updates
  trpc.shoppingLists.onShoppingListUpdate.useSubscription(
    { familyId },
    {
      onData: () => {
        refetch();
      },
    }
  );

  const lists = listsData?.lists || [];
  const selectedList = lists.find((l) => l.id === selectedListId) as any;
  const listDetails = listDetailsData?.list as any;
  const items = (listDetailsData?.items || []) as any[];

  const handleDeleteList = (listId: string) => {
    if (confirm("Delete this shopping list? This cannot be undone.")) {
      deleteMutation.mutate({ listId });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("view")}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === "view"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          My Shopping Lists
        </button>
        <button
          onClick={() => setActiveTab("create")}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === "create"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Create New
        </button>
        {selectedList && (
          <button
            onClick={() => setActiveTab("edit")}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === "edit"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Edit Selected
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - List of Lists or Forms */}
        <div className="lg:col-span-1 space-y-4">
          {activeTab === "view" && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Your Shopping Lists</h3>
              {isLoading ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : lists.length > 0 ? (
                <div className="space-y-2">
                  {lists.map((list) => (
                    <div
                      key={list.id}
                      onClick={() => {
                        setSelectedListId(list.id);
                        setActiveTab("view");
                      }}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedListId === list.id
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 hover:border-orange-300"
                      }`}
                    >
                      <p className="font-medium text-gray-900">{list.title}</p>
                      <p className="text-xs text-gray-500">
                        {list.itemCount} items
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No shopping lists yet
                </div>
              )}
            </div>
          )}

          {activeTab === "create" && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Create Shopping List</h3>
              <CreateShoppingListForm
                familyId={familyId}
                onSuccess={() => {
                  refetch();
                  setActiveTab("view");
                }}
              />
            </div>
          )}

          {activeTab === "edit" && selectedList && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Edit List</h3>
              <EditShoppingListForm
                list={selectedList}
                onSuccess={() => {
                  refetch();
                  setActiveTab("view");
                }}
              />
            </div>
          )}
        </div>

        {/* Right Column - List Details */}
        <div className="lg:col-span-2">
          {activeTab === "view" && selectedListId && listDetails ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div />
                <button
                  onClick={() => handleDeleteList(selectedListId)}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete List
                </button>
              </div>
              <ShoppingListDetail
                list={listDetails}
                items={items}
                familyId={familyId}
                onRefresh={() => refetch()}
              />
            </div>
          ) : activeTab === "view" ? (
            <div className="text-center py-12 text-gray-500">
              <p>Select a shopping list to view its items</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
