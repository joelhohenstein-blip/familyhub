'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Loader2, AlertCircle, CheckCircle, Copy, Link as LinkIcon } from 'lucide-react';
import { trpc } from '~/utils/trpc';

interface DigestSharingProps {
  familyId: string;
  digestId?: string;
}

export function DigestSharing({ familyId, digestId }: DigestSharingProps) {
  const [selectedDigestId, setSelectedDigestId] = useState<string>(digestId || '');
  const [expiresIn, setExpiresIn] = useState<number>(1440); // 24 hours in minutes
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const { data: digests } = trpc.digests.getAllUserDigests.useQuery(
    { familyId, limit: 50 },
    { enabled: !digestId }
  );

  const shareDigest = trpc.digests.shareDigest.useMutation({
    onMutate: () => {
      setStatus('idle');
      setErrorMessage('');
    },
    onSuccess: (data) => {
      setShareUrl(`${window.location.origin}${data.shareUrl}`);
      setStatus('success');
    },
    onError: (error) => {
      setStatus('error');
      setErrorMessage(error.message);
    },
  });

  const handleShare = () => {
    const idToShare = selectedDigestId || digestId;
    if (!idToShare) {
      setErrorMessage('Please select a digest to share');
      setStatus('error');
      return;
    }

    shareDigest.mutate({
      digestId: idToShare,
      expiresIn: expiresIn || undefined,
      guestEmail: guestEmail || undefined,
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Share Digest</CardTitle>
          <CardDescription>Generate a secure shareable link for family members or guests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!digestId && (
            <div className="space-y-2">
              <Label htmlFor="digestSelect">Select Digest</Label>
              <select
                id="digestSelect"
                value={selectedDigestId}
                onChange={(e) => setSelectedDigestId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Choose a digest...</option>
                {digests?.digests.map((digest) => (
                  <option key={digest.id} value={digest.id}>
                    {digest.title} ({new Date(digest.startDate).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="guestEmail">Guest Email (Optional)</Label>
            <Input
              id="guestEmail"
              type="email"
              placeholder="guest@example.com"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              disabled={shareDigest.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresIn">Link Expiration (Minutes)</Label>
            <Input
              id="expiresIn"
              type="number"
              min="60"
              max="10080"
              value={expiresIn}
              onChange={(e) => setExpiresIn(parseInt(e.target.value) || 1440)}
              disabled={shareDigest.isPending}
            />
            <p className="text-xs text-muted-foreground">
              {expiresIn && expiresIn > 0
                ? `Link expires in ${Math.round(expiresIn / 60)} hour(s)`
                : 'Leave empty for no expiration'}
            </p>
          </div>

          {status === 'error' && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <Button
            onClick={handleShare}
            disabled={shareDigest.isPending}
            className="w-full"
          >
            {shareDigest.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Link...
              </>
            ) : (
              'Generate Share Link'
            )}
          </Button>
        </CardContent>
      </Card>

      {shareUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Share Link Generated</CardTitle>
            <CardDescription>Copy this link to share the digest securely</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'success' && (
              <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span>Link generated successfully!</span>
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="font-mono text-xs"
                />
              </div>
              <Button
                onClick={handleCopyLink}
                variant="outline"
                size="sm"
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-700">
              <p className="flex items-start gap-2">
                <LinkIcon className="mt-0.5 h-3 w-3 flex-shrink-0" />
                <span>Share this link with family members or guests. They can view the digest without needing an account.</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
