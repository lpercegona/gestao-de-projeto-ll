import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';

type AppRole = 'master_admin' | 'admin' | 'collaborator' | 'client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roleLoading: boolean;
  userRole: AppRole | null;
  isMasterAdmin: boolean;
  isAdmin: boolean;
  isCollaborator: boolean;
  isClient: boolean;
  isAdminOrMaster: boolean;
  ownerId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const fetchUserRole = async (userId: string) => {
    setRoleLoading(true);
    try {
      // Fetch role and owner_id in parallel
      const [roleRes, profileRes] = await Promise.all([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('owner_id')
          .eq('user_id', userId)
          .maybeSingle()
      ]);

      if (roleRes.error) {
        console.error('Error fetching user role:', roleRes.error);
        setUserRole(null);
      } else {
        setUserRole(roleRes.data?.role as AppRole || null);
      }

      if (profileRes.error) {
        console.error('Error fetching profile:', profileRes.error);
        setOwnerId(null);
      } else {
        setOwnerId(profileRes.data?.owner_id || null);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
      setOwnerId(null);
    } finally {
      setRoleLoading(false);
    }
  };

  const refreshRole = async () => {
    if (user) {
      await fetchUserRole(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer role fetch to avoid blocking
          setTimeout(() => fetchUserRole(session.user.id), 0);
        } else {
          setUserRole(null);
          setOwnerId(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName }
      }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Optimistic cleanup to prevent transient redirects (e.g. /first-access)
    // while Supabase auth state event is still propagating.
    setSession(null);
    setUser(null);
    setUserRole(null);
    setOwnerId(null);

    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });

    if (result.error) {
      return { error: result.error };
    }

    return { error: null };
  };

  const isMasterAdmin = userRole === 'master_admin';
  const isAdmin = userRole === 'admin';
  const isCollaborator = userRole === 'collaborator';
  const isClient = userRole === 'client';
  const isAdminOrMaster = isMasterAdmin || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        roleLoading,
        userRole,
        isMasterAdmin,
        isAdmin,
        isCollaborator,
        isClient,
        isAdminOrMaster,
        ownerId,
        signIn,
        signUp,
        signOut,
        refreshRole,
        resetPassword,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
