import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { trpc } from './trpc';

export interface FamilyInfo {
  id: string;
  surname: string;
  ownerId: string;
  avatarUrl?: string | null;
  description?: string | null;
  role?: string;
  status?: string;
}

interface FamilyContextType {
  isLoaded: boolean;
  currentFamily: FamilyInfo | null;
  families: FamilyInfo[];
  switchFamily: (familyId: string) => void;
  refetch: () => void;
}

const FamilyContext = createContext<FamilyContextType | null>(null);

function FamilyProviderInner({ children }: { children: ReactNode }) {
  const [isClient, setIsClient] = useState(false);
  const [currentFamilyId, setCurrentFamilyId] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch user's families
  const familiesQuery = trpc.families.getMyFamilies.useQuery(undefined, {
    enabled: isClient,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const utils = trpc.useUtils();

  // Set the first family as default if not set
  useEffect(() => {
    if (isClient && familiesQuery.data && familiesQuery.data.length > 0 && !currentFamilyId) {
      setCurrentFamilyId(familiesQuery.data[0].id);
      // Store in localStorage for persistence
      localStorage.setItem('selectedFamilyId', familiesQuery.data[0].id);
    }
  }, [familiesQuery.data, isClient, currentFamilyId]);

  // Load selected family from localStorage on mount
  useEffect(() => {
    if (isClient && !currentFamilyId) {
      const savedFamilyId = localStorage.getItem('selectedFamilyId');
      if (savedFamilyId) {
        setCurrentFamilyId(savedFamilyId);
      }
    }
  }, [isClient, currentFamilyId]);

  const switchFamily = (familyId: string) => {
    setCurrentFamilyId(familyId);
    localStorage.setItem('selectedFamilyId', familyId);
  };

  const refetch = () => {
    familiesQuery.refetch();
  };

  const families = (familiesQuery.data ?? []) as FamilyInfo[];
  const currentFamily = families.find(f => f.id === currentFamilyId) ?? families[0] ?? null;

  const value: FamilyContextType = {
    isLoaded: isClient && familiesQuery.isSuccess,
    currentFamily,
    families,
    switchFamily,
    refetch,
  };

  return (
    <FamilyContext.Provider value={value}>
      {children}
    </FamilyContext.Provider>
  );
}

interface FamilyProviderProps {
  children: ReactNode;
}

export function FamilyProvider({ children }: FamilyProviderProps) {
  return <FamilyProviderInner>{children}</FamilyProviderInner>;
}

export function useFamily(): FamilyContextType {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
}
