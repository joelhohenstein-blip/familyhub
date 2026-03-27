import { useState } from 'react';
import { trpc } from '~/utils/trpc';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  Copy,
  Check,
  AlertCircle,
  Link2,
  Mail,
  Loader2,
} from 'lucide-react';

interface TimelineSharingProps {
  familyId: string;
  highlightId?: string; // If provided, share single highlight; otherwise share entire timeline
}

export function TimelineSharing({
  familyId,
  highlightId,
}: TimelineSharingProps) {
  const [selectedType, setSelectedType] = useState<'highlight' | 'timeline'>(
    highlightId ? 'highlight' : 'timeline'
  );
  const [expiresIn, setExpiresIn] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>('');

  const shareHighlight = trpc.timeline.shareHighlight.useMutation({
    onSuccess: (data) => {
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(fullUrl);
      setError('');
    },
    onError: (error) => {
      setError(error.message || 'Failed to share highlight');
      setShareUrl('');
    },
  });

  const shareTimeline = trpc.timeline.shareTimeline.useMutation({
    onSuccess: (data) => {
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(fullUrl);
      setError('');
    },
    onError: (error) => {
      setError(error.message || 'Failed to share timeline');
      setShareUrl('');
    },
  });

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShareUrl('');

    try {
      const expirationMinutes = expiresIn && expiresIn !== 'never' ? parseInt(expiresIn) : undefined;

      if (selectedType === 'highlight' && highlightId) {
        await shareHighlight.mutateAsync({
          highlightId,
          expiresIn: expirationMinutes,
          guestEmail: guestEmail || undefined,
        });
      } else {
        await shareTimeline.mutateAsync({
          familyId,
          expiresIn: expirationMinutes,
          guestEmail: guestEmail || undefined,
        });
      }
    } catch (err) {
      setError('An error occurred while creating the share link');
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const isPending = shareHighlight.isPending || shareTimeline.isPending;

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Share Timeline</h2>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <form onSubmit={handleShare} className="space-y-6">
        {/* Share Type Selection */}
        {highlightId && (
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-3">
              What would you like to share?
            </Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="shareType"
                  value="highlight"
                  checked={selectedType === 'highlight'}
                  onChange={() => setSelectedType('highlight')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">This highlight</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="shareType"
                  value="timeline"
                  checked={selectedType === 'timeline'}
                  onChange={() => setSelectedType('timeline')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Entire timeline</span>
              </label>
            </div>
          </div>
        )}

        {/* Expiration Time */}
        <div>
          <Label htmlFor="expiresIn" className="block text-sm font-medium text-gray-700 mb-2">
            Expiration <span className="text-gray-400 text-xs">(Optional)</span>
          </Label>
          <Select value={expiresIn} onValueChange={setExpiresIn}>
            <SelectTrigger id="expiresIn">
              <SelectValue placeholder="Never expires" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="never">Never expires</SelectItem>
              <SelectItem value="1440">24 hours</SelectItem>
              <SelectItem value="10080">7 days</SelectItem>
              <SelectItem value="43200">30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Guest Email */}
        <div>
          <Label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700 mb-2">
            Guest Email <span className="text-gray-400 text-xs">(Optional)</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
            <Input
              id="guestEmail"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="recipient@example.com"
              className="pl-10"
            />
          </div>
        </div>

        {/* Share Button */}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Link...
            </>
          ) : (
            <>
              <Link2 className="w-4 h-4 mr-2" />
              Generate Share Link
            </>
          )}
        </Button>

        {/* Share Result */}
        {shareUrl && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 font-medium mb-3">Share link generated!</p>
            <div className="flex gap-2">
              <Input
                type="text"
                value={shareUrl}
                readOnly
                className="bg-white text-sm"
              />
              <Button
                type="button"
                onClick={handleCopyToClipboard}
                variant="outline"
                className="flex-shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
            <p className="mt-3 text-xs text-green-600">
              Link copied! Share it with your friends and family.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
