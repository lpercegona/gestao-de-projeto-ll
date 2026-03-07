import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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

  // ─── Refs used to prevent duplicate / stale fetches ──────────────────────────
  const lastRoleFetchedForRef = useRef<string | null>(null); // userId that was last fetched
  const roleFetchInFlightRef = useRef(false);                // de-duplicates concurrent calls
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * fetchUserRole
   * - Wrapped in useCallback so its reference is stable across renders.
   * - Guards against concurrent / duplicate calls for the SAME userId.
   */
  const fetchUserRole = useCallback(async (userId: string) => {
    // Skip if we already have fresh data for this user.
    // NOTE: we intentionally do NOT guard on roleFetchInFlightRef here for the
    // userId check — two concurrent calls for the SAME user are fine because
    // the in-flight flag below will short-circuit the second one safely.
    if (lastRoleFetchedForRef.current === userId) {
      return;
    }

    // De-duplicate concurrent calls (e.g. listener + getSession racing).
    if (roleFetchInFlightRef.current) {
      return;
    }

    roleFetchInFlightRef.current = true;
    setRoleLoading(true);

    try {
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
          .maybeSingle(),
      ]);

      if (roleRes.error) {
        console.error('Error fetching user role:', roleRes.error);
        setUserRole(null);
      } else {
        setUserRole((roleRes.data?.role as AppRole) || null);
      }

      if (profileRes.error) {
        console.error('Error fetching profile:', profileRes.error);
        setOwnerId(null);
      } else {
        setOwnerId(profileRes.data?.owner_id || null);
      }

      // Mark this userId as "freshly fetched" so TOKEN_REFRESHED won't re-fetch.
      lastRoleFetchedForRef.current = userId;
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
      setOwnerId(null);
    } finally {
      roleFetchInFlightRef.current = false;
      setRoleLoading(false);
    }
  }, []); // no deps – only uses stable supabase client + refs + setters

  /**
   * refreshRole
   * Forces a fresh fetch by resetting the "already fetched" guard.
   * Safe to call manually (e.g. after an admin promotes a user).
   */
  const refreshRole = useCallback(async () => {
    if (user) {
      lastRoleFetchedForRef.current = null;   // invalidate userId cache
      roleFetchInFlightRef.current = false;   // reset in case a previous fetch got stuck
      await fetchUserRole(user.id);
    }
  }, [user, fetchUserRole]);

  useEffect(() => {
    // ── 1. Subscribe to auth state changes ──────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        const newUserId = newSession?.user?.id ?? null;

        // TOKEN_REFRESHED: update session token silently.
        // Do NOT update `user` state (prevents React tree re-renders / dialog closes).
        // Do NOT re-fetch role (data hasn't changed).
        if (event === 'TOKEN_REFRESHED') {
          setSession(prev =>
            prev?.user?.id === newUserId ? prev : newSession
          );
          // Still clear loading in case this is the very first event on boot.
          setLoading(false);
          return;
        }

        // For all other events (SIGNED_IN, SIGNED_OUT, USER_UPDATED …)
        setSession(newSession);
        setUser(prev => {
          if (prev?.id === newUserId) return prev;
          return newSession?.user ?? null;
        });

        if (newSession?.user) {
          // Reset guard when user identity changes (e.g. sign-in after sign-out).
          if (lastRoleFetchedForRef.current !== newUserId) {
            lastRoleFetchedForRef.current = null;
          }
          // Always attempt the fetch — the dedup guards inside fetchUserRole
          // will skip it if getSession() already handled it on boot.
          fetchUserRole(newSession.user.id);
        } else {
          setUserRole(null);
          setOwnerId(null);
          lastRoleFetchedForRef.current = null;
        }

        setLoading(false);
      }
    );

    // ── 2. Resolve the existing session once on mount ────────────────────────
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        fetchUserRole(existingSession.user.id);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRole]); // stable ref – effect runs only once

  // ── Auth helpers ─────────────────────────────────────────────────────────────

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
        data: { full_name: fullName },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Optimistic cleanup so the UI reacts before the async Supabase call resolves.
    setSession(null);
    setUser(null);
    setUserRole(null);
    setOwnerId(null);
    lastRoleFetchedForRef.current = null;

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
    return { error: result.error ?? null };
  };

  // ── Derived role booleans (memoised via useMemo would be fine but inline is ─
  // ── sufficient since these are primitive comparisons) ────────────────────────
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
