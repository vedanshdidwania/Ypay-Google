import React, { useEffect, useState, createContext, useContext } from 'react';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileSubscription: { unsubscribe: () => void } | null = null;

    const setupProfile = async (userId: string) => {
      await fetchProfile(userId);
      
      // Cleanup existing subscription if any
      if (profileSubscription) {
        profileSubscription.unsubscribe();
      }

      // Subscribe to profile changes
      const channel = supabase
        .channel(`profile:${userId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        }, (payload) => {
          setProfile(payload.new as UserProfile);
        })
        .subscribe();

      profileSubscription = {
        unsubscribe: () => {
          supabase.removeChannel(channel);
        }
      };
    };

    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session error:', error.message);
        if (error.message.includes('Refresh Token Not Found') || error.message.includes('Invalid Refresh Token')) {
          supabase.auth.signOut();
        }
        setUser(null);
        setLoading(false);
        return;
      }
      
      setUser(session?.user ?? null);
      if (session?.user) {
        setupProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(session?.user ?? null);
      if (session?.user) {
        setupProfile(session.user.id);
      } else {
        setProfile(null);
        if (profileSubscription) {
          profileSubscription.unsubscribe();
          profileSubscription = null;
        }
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (profileSubscription) {
        profileSubscription.unsubscribe();
      }
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
