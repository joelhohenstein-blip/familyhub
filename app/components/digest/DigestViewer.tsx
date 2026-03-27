'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Loader2, AlertCircle, Calendar } from 'lucide-react';
import { trpc } from '~/utils/trpc';

interface DigestViewerProps {
  familyId: string;
}

export function DigestViewer({ familyId }: DigestViewerProps) {
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: digestData, isLoading } = trpc.digests.getDigestByDateRange.useQuery(
    {
      familyId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
    {
      enabled: isSearching,
    }
  );

  const handleSearch = () => {
    if (!startDate || !endDate) {
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return;
    }

    setIsSearching(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>View Digest</CardTitle>
          <CardDescription>View your AI-generated family digest for a selected date range</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="viewStartDate">Start Date</Label>
              <Input
                id="viewStartDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="viewEndDate">End Date</Label>
              <Input
                id="viewEndDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <Button onClick={handleSearch} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              'Search Digests'
            )}
          </Button>
        </CardContent>
      </Card>

      {isSearching && isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {isSearching && !isLoading && digestData && (
        <>
          {digestData.found ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{digestData.digest?.title}</CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(digestData.digest?.startDate!).toLocaleDateString()} -{' '}
                      {new Date(digestData.digest?.endDate!).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {digestData.digest?.content}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground" />
                <h3 className="font-medium text-foreground">No Digest Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  No digest exists for the selected date range. Try generating a new one.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
