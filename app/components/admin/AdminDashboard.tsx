import React, { useState, useEffect } from 'react';
import { trpc } from '~/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Badge } from '~/components/ui/badge';
import { Loader2, Users, MessageSquare, AlertCircle, TrendingUp, Activity } from 'lucide-react';
import ModerationQueuePanel from './ModerationQueuePanel';
import { MemberManagementPanel } from './MemberManagementPanel';
import FamiliesManagementPanel from './FamiliesManagementPanel';
import { InvitationsManagementPanel } from './InvitationsManagementPanel';
import { ClearanceLevelManagementPanel } from './ClearanceLevelManagementPanel';

interface DashboardStats {
  totalUsers: number;
  totalFamilies: number;
  totalMessages: number;
  flaggedItems: number;
  activeUsers: number;
  pendingReviews: number;
}

interface RecentActivity {
  id: string;
  type: 'user_joined' | 'message_flagged' | 'content_reviewed' | 'family_created';
  description: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error';
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalFamilies: 0,
    totalMessages: 0,
    flaggedItems: 0,
    activeUsers: 0,
    pendingReviews: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);

  // Fetch dashboard stats
  const { data: statsData, isLoading: statsLoading } = trpc.admin.getDashboardStats.useQuery();

  // Fetch recent activity
  const { data: activityData, isLoading: activityLoading } = trpc.admin.getRecentActivity.useQuery({
    limit: 10,
  });

  useEffect(() => {
    if (statsData) {
      setStats({
        totalUsers: statsData.totalUsers || 0,
        totalFamilies: statsData.totalFamilies || 0,
        totalMessages: statsData.totalMessages || 0,
        flaggedItems: statsData.flaggedItems || 0,
        activeUsers: statsData.activeUsers || 0,
        pendingReviews: statsData.pendingReviews || 0,
      });
    }
  }, [statsData]);

  useEffect(() => {
    if (activityData) {
      setRecentActivity(activityData);
    }
  }, [activityData]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_joined':
        return '👤';
      case 'message_flagged':
        return '🚩';
      case 'content_reviewed':
        return '✅';
      case 'family_created':
        return '👨‍👩‍👧‍👦';
      default:
        return '📝';
    }
  };

  const getActivityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
        <p className="text-slate-600">Manage families, users, and moderation</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-blue-100 text-blue-600' },
          { label: 'Total Families', value: stats.totalFamilies, icon: Users, color: 'bg-purple-100 text-purple-600' },
          { label: 'Total Messages', value: stats.totalMessages, icon: MessageSquare, color: 'bg-green-100 text-green-600' },
          { label: 'Active Users', value: stats.activeUsers, icon: Activity, color: 'bg-orange-100 text-orange-600' },
          { label: 'Flagged Items', value: stats.flaggedItems, icon: AlertCircle, color: 'bg-red-100 text-red-600' },
          { label: 'Pending Reviews', value: stats.pendingReviews, icon: TrendingUp, color: 'bg-yellow-100 text-yellow-600' },
        ].map((stat, idx) => (
          <Card key={idx} className="border-slate-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stat.value.toLocaleString()}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="families">Families</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="clearance">Clearance Levels</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest actions in your system</CardDescription>
                </CardHeader>
                <CardContent>
                  {activityLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  ) : recentActivity.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <p>No recent activity</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentActivity.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200"
                        >
                          <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${getActivityColor(activity.severity)}`}>
                              {activity.description}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <Badge
                            variant={
                              activity.severity === 'error'
                                ? 'destructive'
                                : activity.severity === 'warning'
                                  ? 'secondary'
                                  : 'default'
                            }
                          >
                            {activity.severity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <button className="w-full px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors">
                    Create Family
                  </button>
                  <button className="w-full px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-sm font-medium transition-colors">
                    Add User
                  </button>
                  <button className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition-colors">
                    Review Flagged Content
                  </button>
                  <button className="w-full px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors">
                    Export Reports
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Current system status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'Database', status: 'healthy' },
                  { label: 'API Server', status: 'healthy' },
                  { label: 'Message Queue', status: 'healthy' },
                  { label: 'Cache System', status: 'healthy' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-700 font-medium">{item.label}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-700 font-medium">{item.status}</span>
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Moderation Tab */}
        <TabsContent value="moderation" className="mt-6">
          <ModerationQueuePanel />
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-6">
          <MemberManagementPanel />
        </TabsContent>

        {/* Families Tab */}
        <TabsContent value="families" className="mt-6">
          <FamiliesManagementPanel onSelectFamily={setSelectedFamilyId} />
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="mt-6">
          {selectedFamilyId ? (
            <InvitationsManagementPanel familyId={selectedFamilyId} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-slate-600 mb-4">
                    Select a family from the Families tab to manage invitations
                  </p>
                  <TabsTrigger value="families" className="bg-blue-600 hover:bg-blue-700 text-white">
                    Go to Families
                  </TabsTrigger>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Clearance Levels Tab */}
        <TabsContent value="clearance" className="mt-6">
          <ClearanceLevelManagementPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
