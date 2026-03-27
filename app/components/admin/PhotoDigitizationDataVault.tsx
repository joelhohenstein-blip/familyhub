import React, { useState } from 'react';
import { trpc } from '~/utils/trpc';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import {
  Download,
  Lock,
  Unlock,
  Loader2,
  AlertTriangle,
  FileText,
  Mail,
  Calendar,
  Eye,
  EyeOff,
  Shield,
  Archive,
} from 'lucide-react';

interface PhotoDigitizationDataVaultProps {
  orderId: string;
  orderNumber: string;
}

export default function PhotoDigitizationDataVault({
  orderId,
  orderNumber,
}: PhotoDigitizationDataVaultProps) {
  const [showEmail, setShowEmail] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [lockReason, setLockReason] = useState('');

  // Fetch all data vault items
  const foldersQuery = trpc.photoDigitization.getFoldersForOrder.useQuery({
    orderId,
  });

  const customerEmailQuery = trpc.photoDigitization.getCustomerEmail.useQuery(
    { orderId }
  );

  const orderDataQuery = trpc.photoDigitization.getOrderWithPaymentTimeline.useQuery(
    { orderId }
  );

  const folderAccessLogQuery = trpc.photoDigitization.getFolderAccessLog.useQuery(
    { folderId: selectedFolderId || '' },
    { enabled: !!selectedFolderId }
  );

  // Mutations
  const createFolderMutation = trpc.photoDigitization.createPrivateFolder.useMutation();
  const lockFolderMutation = trpc.photoDigitization.lockPrivateFolder.useMutation();
  const unlockFolderMutation = trpc.photoDigitization.unlockPrivateFolder.useMutation();

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await createFolderMutation.mutateAsync({
        orderId,
        folderName: newFolderName,
        description: `Data vault for order ${orderNumber}`,
      });

      setNewFolderName('');
      foldersQuery.refetch();
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  // Lock folder
  const handleLockFolder = async (folderId: string) => {
    if (!lockReason.trim()) {
      window.alert('Please provide a reason for locking this folder');
      return;
    }

    try {
      await lockFolderMutation.mutateAsync({
        folderId,
        reason: lockReason,
      });

      setLockReason('');
      setSelectedFolderId(null);
      foldersQuery.refetch();
    } catch (error) {
      console.error('Failed to lock folder:', error);
    }
  };

  // Unlock folder
  const handleUnlockFolder = async (folderId: string) => {
    if (!window.confirm('Unlock this folder?')) return;

    try {
      await unlockFolderMutation.mutateAsync({ folderId });
      foldersQuery.refetch();
    } catch (error) {
      console.error('Failed to unlock folder:', error);
    }
  };

  // Export data
  const handleExportData = () => {
    const data = {
      orderId,
      orderNumber,
      exportedAt: new Date().toISOString(),
      folders: foldersQuery.data?.folders || [],
      customerEmail: showEmail ? customerEmailQuery.data?.email : '[ENCRYPTED]',
      orderData: orderDataQuery.data?.data,
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vault-export-${orderNumber}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const folders = foldersQuery.data?.folders || [];
  const selectedFolder = folders.find((f: any) => f.id === selectedFolderId);

  return (
    <div className="space-y-4">
      {/* Security Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">
                Secure Data Vault
              </p>
              <p className="text-xs text-blue-800">
                All data in this vault is encrypted at rest and in transit. Access is
                logged and audited. Only authorized admins can view and export data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Vault Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Customer Email Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" />
              Customer Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customerEmailQuery.isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                <span className="text-sm text-gray-600">Loading...</span>
              </div>
            ) : customerEmailQuery.data?.email ? (
              <>
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <p className="text-sm font-mono break-all">
                    {showEmail ? customerEmailQuery.data.email : '••••••••@••••••'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowEmail(!showEmail)}
                >
                  {showEmail ? (
                    <>
                      <EyeOff className="h-3 w-3 mr-2" />
                      Hide
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3 mr-2" />
                      Show
                    </>
                  )}
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-500">No email stored</p>
            )}
          </CardContent>
        </Card>

        {/* Payment Data Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Payment Invoice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {orderDataQuery.isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                <span className="text-sm text-gray-600">Loading...</span>
              </div>
            ) : orderDataQuery.data?.data?.payment ? (
              <>
                <div className="text-sm">
                  <p className="text-gray-600">Status</p>
                  <Badge className="mt-1 bg-green-100 text-green-800">
                    {orderDataQuery.data.data.payment.status}
                  </Badge>
                </div>
                <div className="text-sm">
                  <p className="text-gray-600">Amount</p>
                  <p className="font-semibold">
                    ${orderDataQuery.data.data.payment.estimatedPrice || 'N/A'}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="w-full mt-2">
                  <Download className="h-3 w-3 mr-2" />
                  Download Invoice
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-500">No payment data</p>
            )}
          </CardContent>
        </Card>

        {/* Timeline Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {orderDataQuery.isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                <span className="text-sm text-gray-600">Loading...</span>
              </div>
            ) : orderDataQuery.data?.data?.timeline ? (
              <div className="text-sm space-y-2">
                <div>
                  <p className="text-gray-600">Created</p>
                  <p className="text-xs">
                    {new Date(
                      orderDataQuery.data.data.timeline.dates?.inquiry || new Date()
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Due Date</p>
                  <p className="text-xs">
                    {orderDataQuery.data.data.timeline.dates?.completed
                      ? new Date(
                          orderDataQuery.data.data.timeline.dates.completed
                        ).toLocaleDateString()
                      : 'Pending'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No timeline data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Private Folders Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Secure Folders
              </CardTitle>
              <CardDescription>
                Access-controlled storage for sensitive project data
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={handleCreateFolder}
              disabled={createFolderMutation.isPending}
            >
              {createFolderMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Archive className="h-4 w-4 mr-2" />
              )}
              New Folder
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create Folder Input */}
          <div className="flex gap-2 pb-4 border-b">
            <input
              type="text"
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button
              size="sm"
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
            >
              Create
            </Button>
          </div>

          {/* Folders List */}
          {foldersQuery.isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <p className="ml-2 text-gray-600">Loading folders...</p>
            </div>
          ) : folders.length === 0 ? (
            <p className="text-center py-6 text-gray-500">
              No secure folders created yet.
            </p>
          ) : (
            <div className="space-y-2">
              {folders.map((folder: any) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedFolderId === folder.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{folder.folderName}</p>
                        {folder.isLocked && (
                          <Lock className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      {folder.description && (
                        <p className="text-xs text-gray-600 mb-1">
                          {folder.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {folder.contentCount} items •{' '}
                        {folder.lastAccessedAt
                          ? new Date(folder.lastAccessedAt).toLocaleDateString()
                          : 'Never accessed'}
                      </p>
                    </div>
                    <Badge
                      className={`ml-2 ${
                        folder.isLocked
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {folder.isLocked ? 'Locked' : 'Unlocked'}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Folder Details */}
      {selectedFolderId && selectedFolder ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{selectedFolder.folderName}</CardTitle>
                {selectedFolder.description && (
                  <CardDescription>{selectedFolder.description}</CardDescription>
                )}
              </div>
              <div className="flex gap-2">
                {selectedFolder.isLocked ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUnlockFolder(selectedFolder.id)}
                  >
                    <Unlock className="h-4 w-4 mr-1" />
                    Unlock
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleLockFolder(selectedFolder.id)}
                    disabled={!lockReason.trim()}
                  >
                    <Lock className="h-4 w-4 mr-1" />
                    Lock
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lock/Unlock Section */}
            {!selectedFolder.isLocked && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <label className="block text-sm font-semibold text-amber-900 mb-2">
                  Lock Reason (Required to lock)
                </label>
                <textarea
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  placeholder="Explain why this folder needs to be locked..."
                  className="w-full px-3 py-2 border border-amber-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows={2}
                />
              </div>
            )}

            {selectedFolder.isLocked && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-900">
                      This folder is locked
                    </p>
                    {selectedFolder.lockedReason && (
                      <p className="text-xs text-red-800 mt-1">
                        Reason: {selectedFolder.lockedReason}
                      </p>
                    )}
                    {selectedFolder.lockedUntil && (
                      <p className="text-xs text-red-800 mt-1">
                        Until:{' '}
                        {new Date(selectedFolder.lockedUntil).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Folder Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  Content Count
                </p>
                <p className="text-2xl font-bold text-indigo-600">
                  {selectedFolder.contentCount}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  Last Accessed
                </p>
                <p className="text-sm">
                  {selectedFolder.lastAccessedAt
                    ? new Date(selectedFolder.lastAccessedAt).toLocaleDateString()
                    : 'Never'}
                </p>
              </div>
            </div>

            {/* Access Log */}
            {folderAccessLogQuery.data?.log && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Recent Access Log
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {folderAccessLogQuery.data.log.slice(0, 5).map((log: any, idx: number) => (
                    <div
                      key={idx}
                      className="text-xs p-2 bg-gray-50 rounded border border-gray-200"
                    >
                      <p className="text-gray-700">
                        {new Date(log.accessedAt || log.createdAt).toLocaleString()}
                      </p>
                      {log.action && (
                        <p className="text-gray-600">{log.action}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Export Data Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
          <CardDescription>
            Export all secure vault data for backup or compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> Exported files contain sensitive data. Keep them
              secure and comply with data protection regulations.
            </p>
          </div>
          <Button onClick={handleExportData} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Export as JSON
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
