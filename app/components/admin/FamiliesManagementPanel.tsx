import { useState } from 'react';
import { trpc } from '~/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Badge } from '~/components/ui/badge';
import { Loader2, Plus, Edit2, Trash2, Search } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';

interface Family {
  id: string;
  surname: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface FamiliesManagementPanelProps {
  onSelectFamily?: (familyId: string) => void;
}

export default function FamiliesManagementPanel({ onSelectFamily }: FamiliesManagementPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newSurname, setNewSurname] = useState('');

  // Fetch families
  const { data: familiesData, isLoading, refetch } = trpc.families.getAll.useQuery({
    search: searchQuery,
  });

  const families = familiesData?.families || [];

  // Delete family mutation
  const deleteFamilyMutation = trpc.families.delete.useMutation({
    onSuccess: () => {
      setSelectedFamily(null);
      setDeleteConfirmOpen(false);
      refetch();
    },
  });

  // Update family mutation
  const updateFamilyMutation = trpc.families.update.useMutation({
    onSuccess: () => {
      setEditMode(false);
      refetch();
    },
  });

  const handleDeleteFamily = async () => {
    if (!selectedFamily) return;
    await deleteFamilyMutation.mutateAsync({ familyId: selectedFamily.id });
  };

  const handleUpdateFamily = async () => {
    if (!selectedFamily || !newSurname.trim()) return;
    await updateFamilyMutation.mutateAsync({
      familyId: selectedFamily.id,
      surname: newSurname,
    });
    setSelectedFamily({ ...selectedFamily, surname: newSurname });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Families List */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Family Directory</CardTitle>
            <CardDescription>Manage all families in the system</CardDescription>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search families..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border-slate-300"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : families.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-slate-500">
                <p>No families found</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {families.map((family: Family) => (
                  <button
                    key={family.id}
                    onClick={() => {
                      setSelectedFamily(family);
                      setNewSurname(family.surname);
                      setEditMode(false);
                      onSelectFamily?.(family.id);
                    }}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                      selectedFamily?.id === family.id
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{family.surname}</h4>
                        <p className="text-xs text-slate-500 mt-2">
                          Created {new Date(family.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant="default"
                      >
                        active
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Family Details */}
      {selectedFamily && (
        <div className="lg:col-span-1">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Family Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!editMode ? (
                <>
                  <div>
                    <Label className="text-xs text-slate-600 uppercase">Family Surname</Label>
                    <p className="text-lg font-semibold text-slate-900 mt-1">{selectedFamily.surname}</p>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-600 uppercase">Created</Label>
                    <p className="text-sm text-slate-600 mt-1">
                      {new Date(selectedFamily.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditMode(true)}
                      className="flex-1 border-slate-300"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteConfirmOpen(true)}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="surname">Family Surname</Label>
                    <Input
                      id="surname"
                      value={newSurname}
                      onChange={(e) => setNewSurname(e.target.value)}
                      placeholder="Enter family surname"
                      className="bg-white border-slate-300"
                    />
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      size="sm"
                      onClick={handleUpdateFamily}
                      disabled={updateFamilyMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {updateFamilyMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditMode(false);
                        setNewSurname(selectedFamily.surname);
                      }}
                      className="flex-1 border-slate-300"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Family</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the {selectedFamily?.surname} family? This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFamily}
              disabled={deleteFamilyMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteFamilyMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
