import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { trpc } from "../../utils/trpc";
import { Loader2 } from "lucide-react";

interface Permission {
  key: string;
  label: string;
  description: string;
}

const AVAILABLE_PERMISSIONS: Permission[] = [
  {
    key: "view_media",
    label: "View Media",
    description: "Can view family photos and videos",
  },
  {
    key: "upload_media",
    label: "Upload Media",
    description: "Can upload photos and videos",
  },
  {
    key: "edit_family",
    label: "Edit Family",
    description: "Can modify family settings",
  },
  {
    key: "manage_members",
    label: "Manage Members",
    description: "Can add/remove family members",
  },
  {
    key: "manage_calls",
    label: "Manage Calls",
    description: "Can start and manage video calls",
  },
  {
    key: "stream_content",
    label: "Stream Content",
    description: "Can access streaming services",
  },
  {
    key: "manage_settings",
    label: "Manage Settings",
    description: "Can modify family settings",
  },
];

interface AgentPermissionsMatrixProps {
  agentId: string;
  agentName: string;
  onClose?: () => void;
}

export function AgentPermissionsMatrix({
  agentId,
  agentName,
  onClose,
}: AgentPermissionsMatrixProps) {
  const getPermissionsQuery = trpc.settings.getPermissionsByAgent.useQuery({
    agentId,
  });
  const setPermissionMutation = trpc.settings.setPermission.useMutation();

  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, boolean>>({});

  const currentPermissions = getPermissionsQuery.data || [];
  const permissionMap = currentPermissions.reduce(
    (acc: Record<string, boolean>, p: any) => {
      acc[p.permissionKey] = p.allowed;
      return acc;
    },
    {} as Record<string, boolean>
  );

  const handleToggle = (permissionKey: string, allowed: boolean) => {
    setUnsavedChanges({
      ...unsavedChanges,
      [permissionKey]: !unsavedChanges[permissionKey],
    });
  };

  const handleSave = async () => {
    try {
      // Get the current state of all permissions
      const currentState = AVAILABLE_PERMISSIONS.reduce(
        (acc, p) => {
          const changed = unsavedChanges[p.key];
          const current = permissionMap[p.key] ?? false;
          acc[p.key] = changed ? !current : current;
          return acc;
        },
        {} as Record<string, boolean>
      );

      // Save all permissions
      for (const [key, allowed] of Object.entries(currentState)) {
        await setPermissionMutation.mutateAsync({
          agentId,
          permissionKey: key,
          allowed,
        });
      }

      setUnsavedChanges({});
      getPermissionsQuery.refetch();
    } catch (error) {
      console.error("Failed to update permissions:", error);
    }
  };

  if (getPermissionsQuery.isLoading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
      </Card>
    );
  }

  const hasUnsaved = Object.keys(unsavedChanges).length > 0;

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <div className="p-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">
          Permissions for {agentName}
        </h3>

        <div className="space-y-3 mb-6">
          {AVAILABLE_PERMISSIONS.map((permission) => {
            const hasChanged = unsavedChanges[permission.key];
            const current = permissionMap[permission.key] ?? false;
            const isAllowed = hasChanged ? !current : current;

            return (
              <label
                key={permission.key}
                className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  isAllowed
                    ? "border-blue-200 bg-blue-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                } ${hasChanged ? "ring-2 ring-amber-400" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={isAllowed}
                  onChange={(e) => handleToggle(permission.key, e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{permission.label}</p>
                  <p className="text-sm text-slate-600">{permission.description}</p>
                </div>
              </label>
            );
          })}
        </div>

        {hasUnsaved && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
            <p className="text-sm text-amber-900">
              You have unsaved changes. Click Save to apply them.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={!hasUnsaved || setPermissionMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {setPermissionMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Permissions"
            )}
          </Button>
          {onClose && (
            <Button
              onClick={onClose}
              className="bg-slate-300 hover:bg-slate-400 text-slate-900"
            >
              Close
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
