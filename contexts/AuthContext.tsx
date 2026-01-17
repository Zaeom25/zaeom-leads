import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Profile } from '../types';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    role: 'admin' | 'seller' | 'org_owner' | 'org_member' | 'system_admin' | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
    signInWithGoogle: () => Promise<{ data: any; error: any }>;
    signUp: (email: string, password: string, metadata?: any) => Promise<{ data: any; error: any }>;
    verifyOtp: (email: string, token: string) => Promise<{ data: any; error: any }>;
    resendOtp: (email: string) => Promise<{ data: any; error: any }>;
    resetPassword: (email: string) => Promise<{ data: any; error: any }>;
    updatePassword: (password: string) => Promise<{ data: any; error: any }>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    isPasswordRecovery: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

    useEffect(() => {
        let mounted = true;

        // Capture hash immediately to detect invite flow
        if (window.location.hash.includes('type=invite')) {
            setIsPasswordRecovery(true);
        }

        const initSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (mounted) {
                    setSession(session);
                    setUser(session?.user ?? null);
                    setLoading(false); // Set loading false as soon as we have session/user
                    if (session?.user) {
                        fetchProfile(session.user.id);
                    }
                }
            } catch (error) {
                console.error('Session init error:', error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return;



            setSession(session);
            setUser(session?.user ?? null);

            if (_event === 'PASSWORD_RECOVERY') {
                setIsPasswordRecovery(true);
            } else if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || _event === 'INITIAL_SESSION') {
                if (session?.user) {
                    // We use the functional update of setProfile to check current state if needed,
                    // but here we just blindly fetch if user exists to ensure consistency.
                    // To avoid loops, we can check if the ID matches current state in a ref if really needed,
                    // but simpler is better: if we have a user, ensure we have a profile.
                    // NON-BLOCKING: We remove await to ensure setLoading(false) runs immediately.
                    fetchProfile(session.user.id);
                }
                if (window.location.hash.includes('type=invite')) {
                    setIsPasswordRecovery(true);
                }
            } else if (_event === 'SIGNED_OUT') {
                setIsPasswordRecovery(false);
                setProfile(null);
            }

            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) console.error('Error fetching profile:', error);
            if (data) setProfile(data as Profile);
        } catch (error) {
            console.error('Error in fetchProfile:', error);
        }
        // Don't set loading false here necessarily, as it might be used for manual refresh
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    const signIn = async (email: string, password: string) => {
        return supabase.auth.signInWithPassword({ email, password });
    };

    const signInWithGoogle = async () => {
        return supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
    };

    const signUp = async (email: string, password: string, metadata?: any) => {
        return supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin,
                data: metadata
            }
        });
    };

    const verifyOtp = async (email: string, token: string) => {
        return supabase.auth.verifyOtp({
            email,
            token,
            type: 'signup'
        });
    };

    const resendOtp = async (email: string) => {
        return supabase.auth.resend({
            type: 'signup',
            email
        });
    };

    const resetPassword = async (email: string) => {
        return supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });
    };

    const updatePassword = async (password: string) => {
        return supabase.auth.updateUser({ password });
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            session,
            user,
            profile,
            role: profile?.role ?? null,
            loading,
            signIn,
            signInWithGoogle,
            signUp,
            verifyOtp,
            resendOtp,
            resetPassword,
            updatePassword,
            signOut,
            refreshProfile,
            isPasswordRecovery
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
