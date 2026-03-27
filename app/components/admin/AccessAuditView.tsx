"use client";

import { useState } from "react";
import { trpc } from "~/utils/trpc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Loader2, Download } from "lucide-react";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface AccessAuditViewProps {
  familyId: string;
}

export function AccessAuditView({ familyId }: AccessAuditViewProps) {
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [filters, setFilters] = useState({
    userId: "",
    actionType: "",
    resourceType: "",
    startDate: "",
    endDate: "",
  });

  const { data, isLoading } = trpc.auditLogs.getAuditLogs.useQuery(
    {
      familyId,
      userId: filters.userId ? filters.userId : undefined,
      actionType: filters.actionType ? filters.actionType : undefined,
      resourceType: filters.resourceType ? filters.resourceType : undefined,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      page,
      limit: 20,
    },
    { enabled: !!familyId }
  );

  const { mutate: exportLogs, isPending: isExporting } =
    trpc.auditLogs.exportAuditLogs.useMutation({
      onSuccess: (result: any) => {
        // Generate CSV
        const headers = [
          "Timestamp",
          "Action Type",
          "Actor",
          "Target ID",
          "Target Type",
          "Description",
        ];
        const csv = [
          headers.join(","),
          ...result.logs.map((log: any) =>
            [
              log.timestamp,
              log.actionType,
              log.actor,
              log.targetId,
              log.targetType,
              `"${log.description.replace(/"/g, '""')}"`,
            ].join(",")
          ),
        ].join("\n");

        // Download
        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString()}.csv`;
        a.click();
      },
      onError: () => {
        setMessage({ type: "error", text: "Failed to export logs" });
      },
    });

  const handleExport = () => {
    exportLogs({
      familyId,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    });
  };

  const logs = data?.logs || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            placeholder="Actor User ID"
            value={filters.userId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFilters({ ...filters, userId: e.target.value })
            }
          />

          <Select
            value={filters.actionType}
            onValueChange={(value: string) =>
              setFilters({ ...filters, actionType: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Action Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Actions</SelectItem>
              <SelectItem value="ASSIGN_ROLE">Role Assignment</SelectItem>
              <SelectItem value="GRANT_PERMISSION">Grant Permission</SelectItem>
              <SelectItem value="REVOKE_PERMISSION">Revoke Permission</SelectItem>
              <SelectItem value="DEACTIVATE_MEMBER">Deactivate Member</SelectItem>
              <SelectItem value="REACTIVATE_MEMBER">Reactivate Member</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={filters.startDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFilters({ ...filters, startDate: e.target.value })
            }
            placeholder="Start Date"
          />

          <Input
            type="date"
            value={filters.endDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFilters({ ...filters, endDate: e.target.value })
            }
            placeholder="End Date"
          />

          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Audit Logs</h2>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-gray-500">No audit logs found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="text-sm">
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString()
                      : "Unknown"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {log.actionType}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{log.actorId}</TableCell>
                  <TableCell className="text-sm">
                    {log.targetType}: {log.targetId}
                  </TableCell>
                  <TableCell className="text-sm max-w-md">
                    {log.description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600">
              Page {page} of {pagination.totalPages} ({pagination.totalLogs} total)
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={page === pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Security Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-900">
          <strong>Security:</strong> All audit logs are immutable and tamper-evident.
          They are retained for 90 days and cannot be modified or deleted by users.
        </p>
      </div>
    </div>
  );
}
