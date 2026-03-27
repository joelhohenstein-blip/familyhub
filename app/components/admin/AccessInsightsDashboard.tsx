"use client";

import { useMemo } from "react";
import { trpc } from "~/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface AccessInsightsDashboardProps {
  familyId: string;
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export function AccessInsightsDashboard({
  familyId,
}: AccessInsightsDashboardProps) {
  const { data: insights, isLoading } =
    trpc.auditLogs.getAggregatedInsights.useQuery(
      { familyId, days: 7 },
      { enabled: !!familyId }
    );

  const chartData = useMemo(() => {
    if (!insights) return null;

    // Prepare data for change type chart
    const changeTypeData = Object.entries(insights.changesByType).map(
      ([type, count]) => ({
        name: type.replace(/_/g, " "),
        value: count,
      })
    );

    // Prepare data for admin activity chart
    const adminActivityData = Object.entries(insights.adminActivity).map(
      ([adminId, count]) => ({
        name: adminId.slice(0, 8) + "...",
        changes: count,
      })
    );

    // Prepare data for top modified members
    const topMembersData = Object.entries(insights.topModifiedMembers)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([memberId, count]) => ({
        name: memberId.slice(0, 8) + "...",
        modifications: count,
      }));

    return {
      changeTypeData,
      adminActivityData,
      topMembersData,
    };
  }, [insights]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!insights) {
    return <div className="text-center text-gray-500 py-8">No data available</div>;
  }

  const summary = insights.summary;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.totalChanges}</div>
            <p className="text-xs text-gray-500 mt-1">Last {insights.periodDays} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Role Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.roleChanges}</div>
            <p className="text-xs text-gray-500 mt-1">Member role assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Permission Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {summary.permissionGrants + summary.permissionRevokes}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              +{summary.permissionGrants} / -{summary.permissionRevokes}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Member Deactivations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {summary.memberDeactivations}
            </div>
            <p className="text-xs text-gray-500 mt-1">Access suspended</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Member Reactivations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {summary.memberReactivations}
            </div>
            <p className="text-xs text-gray-500 mt-1">Access restored</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Object.keys(insights.adminActivity).length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Made access changes</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {chartData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Change Type Distribution */}
          {chartData.changeTypeData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Change Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.changeTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.changeTypeData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Admin Activity */}
          {chartData.adminActivityData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Admin Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.adminActivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="changes" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Top Modified Members */}
          {chartData.topMembersData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Modified Members</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.topMembersData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" />
                    <Tooltip />
                    <Bar dataKey="modifications" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recent Changes */}
      {insights.recentChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Access Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.recentChanges.map((log: any, idx: number) => (
                <div
                  key={idx}
                  className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-gray-50 rounded"
                >
                  <p className="font-medium text-sm">{log.actionType}</p>
                  <p className="text-xs text-gray-600 mt-1">{log.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString()
                      : "Unknown time"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
