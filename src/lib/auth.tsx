import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from './supabase';
import { sendWelcomeEmail } from './email';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; message: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// NOTE: Admin role is now determined by the profiles table in Supabase
// Users can only become admins through server-side profile updates
// This prevents client-side privilege escalation

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (authUser: SupabaseUser) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', authUser.id)
        .maybeSingle();

      setUser({
        id: authUser.id,
        email: authUser.email || '',
        name: profile?.name || authUser.user_metadata?.name || 'User',
        role: profile?.role || (authUser.user_metadata?.role as 'user' | 'admin') || 'user',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchUserProfile(session.user);
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  const refreshUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) await fetchUserProfile(authUser);
  };

  const signIn = async (email: string, password: string) => {
    try {
      // REMOVED: Hardcoded demo/admin login
      // Admin role must now come from Supabase profiles table (server-verified)
      // This prevents client-side privilege escalation

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user) {
        await fetchUserProfile(data.user);
        return { success: true, message: 'Logged in successfully' };
      }

      return { success: false, message: 'Login failed' };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, message: 'An error occurred during sign in' };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user && data.session) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          name,
          role: 'user',
        });
        
        // Send welcome email (non-blocking, don't wait for it)
        sendWelcomeEmail(email, name).catch(err => 
          console.log('Welcome email could not be sent:', err)
        );
        
        return { success: true, message: 'Account created successfully' };
      }

      if (data.user && !data.session) {
        return { success: true, message: 'Signup successful. Please verify your email, then log in.' };
      }

      return { success: false, message: 'Signup failed' };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, message: 'An error occurred during sign up' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAdmin,
      signIn, 
      signUp, 
      signOut,
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
