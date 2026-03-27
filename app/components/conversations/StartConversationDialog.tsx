import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import { trpc } from '~/utils/trpc';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '~/components/ui/dialog';

interface FamilyMember {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
}

interface StartConversationDialogProps {
  familyId: string;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationStarted?: (conversationId: string) => void;
}

export const StartConversationDialog: React.FC<StartConversationDialogProps> = ({
  familyId,
  currentUserId,
  open,
  onOpenChange,
  onConversationStarted,
}) => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Query to get family members
  const getFamilyMembersQuery = trpc.familyMembers.getMembers.useQuery(
    { familyId },
    { enabled: open && !!familyId }
  );

  // Mutation to start conversation
  const startConversationMutation = trpc.conversations.startConversation.useMutation({
    onSuccess: (conversation) => {
      onConversationStarted?.(conversation.id);
      onOpenChange(false);
      setSelectedMemberId(null);
      setError(null);
    },
    onError: (err) => {
      setError(err.message || 'Failed to start conversation');
    },
  });

  // Update members list when query data changes
  useEffect(() => {
    if (getFamilyMembersQuery.data) {
      // Filter out current user - handle the joined structure from getMembers
      const otherMembers = (getFamilyMembersQuery.data as any).members
        ?.map((member: any) => ({
          id: member.family_members.id,
          userId: member.family_members.userId,
          firstName: member.users.firstName,
          lastName: member.users.lastName,
          email: member.users.email,
          role: member.family_members.role,
          avatarUrl: member.users.avatarUrl,
        }))
        .filter((member: any) => member.userId !== currentUserId) || [];
      setMembers(otherMembers);
    }
  }, [getFamilyMembersQuery.data, currentUserId]);

  const handleStartConversation = async () => {
    if (!selectedMemberId) {
      setError('Please select a family member');
      return;
    }

    setIsLoading(true);
    try {
      await startConversationMutation.mutateAsync({
        familyId,
        otherUserId: selectedMemberId,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getMemberName = (member: FamilyMember): string => {
    if (member.firstName && member.lastName) {
      return `${member.firstName} ${member.lastName}`;
    }
    if (member.firstName) {
      return member.firstName;
    }
    if (member.email) {
      return member.email.split('@')[0];
    }
    return 'Unknown User';
  };

  const getMemberInitials = (member: FamilyMember): string => {
    const firstName = member.firstName?.charAt(0) || '';
    const lastName = member.lastName?.charAt(0) || '';
    return (firstName + lastName).toUpperCase() || '?';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a New Conversation</DialogTitle>
          <DialogDescription>
            Select a family member to start a 1-on-1 chat
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 text-sm">{error}</p>
              </div>
            </div>
          )}

          {getFamilyMembersQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No other family members available</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {members.map((member) => (
                <button
                  key={member.userId}
                  onClick={() => setSelectedMemberId(member.userId)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedMemberId === member.userId
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-xs">
                        {getMemberInitials(member)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {getMemberName(member)}
                      </p>
                      {member.role && (
                        <p className="text-xs text-gray-500 truncate capitalize">
                          {member.role}
                        </p>
                      )}
                    </div>
                    {selectedMemberId === member.userId && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartConversation}
              disabled={!selectedMemberId || isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Start Chat'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
