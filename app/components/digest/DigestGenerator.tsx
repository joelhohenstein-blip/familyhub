'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { trpc } from '~/utils/trpc';

interface DigestGeneratorProps {
  familyId: string;
  onDigestGenerated?: () => void;
}

export function DigestGenerator({ familyId, onDigestGenerated }: DigestGeneratorProps) {
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const generateSummary = trpc.digests.generateSummary.useMutation({
    onMutate: () => {
      setIsLoading(true);
      setStatus('idle');
      setErrorMessage('');
    },
    onSuccess: () => {
      setStatus('success');
      setIsLoading(false);
      setTimeout(() => {
        setStatus('idle');
        onDigestGenerated?.();
      }, 2000);
    },
    onError: (error) => {
      setStatus('error');
      setErrorMessage(error.message);
      setIsLoading(false);
    },
  });

  const handleGenerate = () => {
    if (!startDate || !endDate) {
      setErrorMessage('Please select both start and end dates');
      setStatus('error');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setErrorMessage('Start date must be before end date');
      setStatus('error');
      return;
    }

    generateSummary.mutate({
      familyId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generate Summary</CardTitle>
        <CardDescription>Create an AI-assisted summary of recent family activities</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        {status === 'error' && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {status === 'success' && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span>Digest generated successfully!</span>
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Summary...
            </>
          ) : (
            'Generate Summary'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
