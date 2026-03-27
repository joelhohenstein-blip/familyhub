import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Plus, Edit2, Trash2 } from "lucide-react";

interface ClearanceLevel {
  id: string;
  name: string;
  description: string;
  level: number;
}

export function ClearanceLevelManagementPanel() {
  const [levels, setLevels] = useState<ClearanceLevel[]>([
    { id: "1", name: "Public", description: "Visible to everyone", level: 0 },
    { id: "2", name: "Family", description: "Visible to family members", level: 1 },
    { id: "3", name: "Private", description: "Visible to self only", level: 2 },
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setLevels(levels.filter((level) => level.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Clearance Levels</h2>
          <p className="text-slate-600 mt-1">Manage content visibility levels for your family</p>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Level
        </Button>
      </div>

      <div className="grid gap-4">
        {levels.map((level) => (
          <Card key={level.id} className="p-4 border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{level.name}</h3>
                <p className="text-sm text-slate-600 mt-1">{level.description}</p>
                <div className="mt-2">
                  <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                    Level {level.level}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingId(level.id)}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(level.id)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {levels.length === 0 && (
        <Card className="p-8 text-center border-slate-200">
          <p className="text-slate-600">No clearance levels created yet.</p>
          <Button
            onClick={() => setIsCreating(true)}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Create Your First Level
          </Button>
        </Card>
      )}
    </div>
  );
}
