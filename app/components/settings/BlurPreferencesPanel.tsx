'use client';

import { useState, useEffect } from 'react';
import { trpc } from '~/utils/trpc';
import { Button } from '~/components/ui/button';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Checkbox } from '~/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface BlurPreferencesPanelProps {
  familyId?: string;
  familyMembers?: Array<{
    id: string;
    name: string;
    email?: string;
  }>;
}

const BLUR_INTENSITY_OPTIONS = [
  { value: '25', label: 'Light', description: 'Subtle blur effect' },
  { value: '50', label: 'Medium', description: 'Standard blur effect' },
  { value: '75', label: 'Heavy', description: 'Strong blur effect' },
];

export function BlurPreferencesPanel({
  familyId: propFamilyId,
  familyMembers = [],
}: BlurPreferencesPanelProps = {}) {
  const [blurAllFaces, setBlurAllFaces] = useState(false);
  const [blurIntensity, setBlurIntensity] = useState('50');
  const [blurSpecificPeople, setBlurSpecificPeople] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Get user's families if familyId not provided
  const myFamiliesQuery = trpc.families.getMyFamilies.useQuery();
  const familyId = propFamilyId || myFamiliesQuery.data?.[0]?.id || '';

  // Fetch user's blur preferences
  const { data: preferences, isLoading } = trpc.faceBlur.getUserBlurPreferences.useQuery(
    { familyId },
    {
      enabled: !!familyId,
      retry: false,
    }
  );

  // Update mutation
  const updateMutation = trpc.faceBlur.updateUserBlurPreferences.useMutation({
    onSuccess: () => {
      setSaveStatus('success');
      toast.success('Blur preferences updated successfully');
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
    onError: (error: any) => {
      setSaveStatus('error');
      setErrorMessage(error.message || 'Failed to update preferences');
      toast.error(error.message || 'Failed to update preferences');
    },
  });

  // Load preferences when they're fetched
  useEffect(() => {
    if (preferences) {
      setBlurAllFaces(preferences.blurAllFaces || false);
      setBlurIntensity(String(preferences.blurIntensity || 50));
      setBlurSpecificPeople(preferences.blurSpecificPeople || []);
    }
  }, [preferences]);

  const handleSave = async () => {
    if (!familyId) {
      toast.error('No family selected');
      return;
    }

    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({
        familyId,
        blurAllFaces,
        blurIntensity: parseInt(blurIntensity),
        blurSpecificPeople,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const togglePersonBlur = (personId: string) => {
    setBlurSpecificPeople((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId]
    );
  };

  if (isLoading && !familyId) {
    return (
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-slate-900">Blur Preferences</CardTitle>
          <CardDescription className="mt-2 text-slate-600">
            Control how faces are blurred in your family's photos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Blur All Faces Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold text-slate-900">Blur All Faces</Label>
                <p className="text-sm text-slate-600 mt-1">
                  Automatically blur all detected faces in photos
                </p>
              </div>
              <Switch
                checked={blurAllFaces}
                onCheckedChange={setBlurAllFaces}
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Blur Intensity Selector */}
          {blurAllFaces && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <Label className="text-base font-semibold text-slate-900">Blur Intensity</Label>
              <Select value={blurIntensity} onValueChange={setBlurIntensity} disabled={isSaving}>
                <SelectTrigger className="border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLUR_INTENSITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-slate-500">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Specific People to Blur */}
          {!blurAllFaces && familyMembers.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <Label className="text-base font-semibold text-slate-900">Blur Specific People</Label>
              <div className="space-y-2">
                {familyMembers.map((member) => (
                  <div key={member.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`blur-${member.id}`}
                      checked={blurSpecificPeople.includes(member.id)}
                      onCheckedChange={() => togglePersonBlur(member.id)}
                      disabled={isSaving}
                    />
                    <Label
                      htmlFor={`blur-${member.id}`}
                      className="text-sm font-medium text-slate-700 cursor-pointer"
                    >
                      {member.name}
                      {member.email && <span className="text-xs text-slate-500 ml-2">({member.email})</span>}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Messages */}
          {saveStatus === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your blur preferences have been saved successfully.
              </AlertDescription>
            </Alert>
          )}

          {saveStatus === 'error' && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <Button
              onClick={handleSave}
              disabled={isSaving || updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {(isSaving || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
