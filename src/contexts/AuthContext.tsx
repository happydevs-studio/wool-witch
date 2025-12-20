import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkAdminStatus(userId: string) {
    try {
      const { data, error } = await (supabase as any)
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        throw error;
      }
      
      const isAdminUser = (data as any)?.role === 'admin';
      setIsAdmin(isAdminUser);
    } catch (error) {
      // Keep minimal error logging for debugging
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  }

  async function signInWithGoogle() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const isLocal = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1');
    
    if (isLocal) {
      // Mock Google Auth for local development
      
      // Create a mock user that simulates Google sign-in
      const mockEmail = `google.user.${Date.now()}@gmail.com`;
      const mockPassword = 'google-auth-mock-password';
      
      try {
        // First, try to sign up the mock user
        const { error: signUpError } = await supabase.auth.signUp({
          email: mockEmail,
          password: mockPassword,
          options: {
            data: {
              full_name: 'Google User',
              avatar_url: 'https://via.placeholder.com/150/0066CC/FFFFFF?text=G',
              provider: 'google'
            }
          }
        });
        
        if (signUpError && !signUpError.message.includes('already registered')) {
          throw signUpError;
        }
        
        // Then sign in with the mock credentials
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: mockEmail,
          password: mockPassword,
        });
        
        if (signInError) throw signInError;
      } catch (error) {
        console.error('Mock Google auth error:', error);
        throw new Error('Mock Google authentication failed');
      }
    } else {
      // Production Google OAuth
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`
        }
      });
      
      if (error) {
        throw error;
      }
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAdmin,
        isAuthenticated: !!user,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
