import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { trpc } from './trpc';

// Client-side user type (dates are serialized to strings by tRPC)
export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  user: AuthUser | null;
  signIn: () => void;
  signOut: () => void;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function AuthProviderInner({ children }: { children: ReactNode }) {
  // Only use useNavigate on client side to avoid hydration mismatch
  const navigate = typeof window !== 'undefined' ? useNavigate() : null;
  const [authTimeout, setAuthTimeout] = useState(false);
  const utils = trpc.useUtils();

  // Add a timeout for auth loading (5 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthTimeout(true);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

  // Query session - only on client to avoid hydration mismatch
  // On server, isLoaded will be false until client hydrates
  const isClient = typeof window !== 'undefined';
  const sessionQuery = trpc.auth.me.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    suspense: false,
    enabled: isClient, // Only query on client
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async (data) => {
      // Set the cookie to clear
      document.cookie = data.sessionCookie;
      // Invalidate the session query
      await utils.auth.me.invalidate();
      // Redirect to login
      if (navigate) {
        navigate('/login');
      }
    },
  });

  const signIn = useCallback(() => {
    if (navigate) {
      navigate('/login');
    }
  }, [navigate]);

  const signOut = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  const refetch = useCallback(() => {
    sessionQuery.refetch();
  }, [sessionQuery]);

  const value: AuthContextType = {
    isLoaded: sessionQuery.data !== undefined || authTimeout,
    isSignedIn: sessionQuery.data?.isSignedIn ?? false,
    userId: sessionQuery.data?.user?.id ?? null,
    user: sessionQuery.data?.user ?? null,
    signIn,
    signOut,
    refetch,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return <AuthProviderInner>{children}</AuthProviderInner>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
