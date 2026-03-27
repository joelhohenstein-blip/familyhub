/**
 * Get the current user's role in a specific family
 */
export const getCurrentFamilyRole = (
  families: Array<{ id: string; role: string }>,
  familyId: string
): 'admin' | 'member' | 'guest' | null => {
  const family = families.find((f) => f.id === familyId);
  if (!family) return null;
  return family.role as 'admin' | 'member' | 'guest';
};

/**
 * Check if the current user is an admin in a family
 */
export const isUserFamilyAdmin = (
  families: Array<{ id: string; role: string }>,
  familyId: string
): boolean => {
  return getCurrentFamilyRole(families, familyId) === 'admin';
};

/**
 * Check if the user has a specific permission in a family
 */
export const hasPermission = (
  role: 'admin' | 'member' | 'guest' | null,
  permission: 'manage_members' | 'change_roles' | 'remove_members' | 'view_members'
): boolean => {
  if (!role) return false;

  const permissions: Record<string, string[]> = {
    admin: [
      'manage_members',
      'change_roles',
      'remove_members',
      'view_members',
    ],
    member: ['view_members'],
    guest: [],
  };

  return permissions[role]?.includes(permission) ?? false;
};

/**
 * Validate email format
 */
export const validateMemberEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate UUID format
 */
export const validateMemberId = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Check if a member can be removed
 * Returns false for family owner
 */
export const canRemoveMember = (
  memberUserId: string,
  familyOwnerId: string
): boolean => {
  return memberUserId !== familyOwnerId;
};

/**
 * Check if current user can change a member's role
 */
export const canChangeMemberRole = (
  currentUserRole: 'admin' | 'member' | 'guest' | null,
  targetMemberRole: 'admin' | 'member' | 'guest'
): boolean => {
  if (currentUserRole !== 'admin') return false;
  // Additional business logic can be added here
  return true;
};

/**
 * Get role color classes for UI display
 */
export const getRoleColorClasses = (
  role: 'admin' | 'member' | 'guest'
): { bg: string; text: string } => {
  switch (role) {
    case 'admin':
      return { bg: 'bg-purple-100', text: 'text-purple-800' };
    case 'member':
      return { bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'guest':
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
  }
};

/**
 * Get status color classes for UI display
 */
export const getStatusColorClasses = (
  status: 'active' | 'invited' | 'inactive'
): { bg: string; text: string } => {
  switch (status) {
    case 'active':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    case 'invited':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    case 'inactive':
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
  }
};
