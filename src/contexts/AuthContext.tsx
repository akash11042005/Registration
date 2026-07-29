import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { ADMIN_EMAILS } from '@/lib/constants';
import { ensureUserDoc } from '@/lib/ensureUserDoc';

export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  isDemoMode: boolean;
  signInWithGoogle: () => Promise<AppUser>;
  signInWithEmail: (email: string, password: string) => Promise<AppUser>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<AppUser>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const TOKEN_KEY = 'aay_auth_token';
const USER_KEY = 'aay_auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const isAdmin = !!user && (ADMIN_EMAILS.includes((user.email ?? '').toLowerCase()) || user.role === 'admin');

  // Firebase auth state observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const u: AppUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || undefined,
        };
        setUser(u);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
        ensureUserDoc(u);
      } else {
        setUser(null);
        localStorage.removeItem(USER_KEY);
      }
      setLoading(false);
    }, (error) => {
      console.warn('Firebase auth state notice:', error);
      setIsDemoMode(true);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async (): Promise<AppUser> => {
    try {
      setAuthError(null);
      const res = await signInWithPopup(auth, googleProvider);
      const u: AppUser = {
        uid: res.user.uid,
        email: res.user.email || '',
        displayName: res.user.displayName || '',
        photoURL: res.user.photoURL || undefined,
      };
      setUser(u);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      await ensureUserDoc(u);
      return u;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      if (msg.includes('operation-not-allowed') || msg.includes('auth/configuration-not-found')) {
        setAuthError('Google sign-in is not enabled in this Firebase project. Please use email/password.');
      } else if (msg.includes('popup-closed')) {
        setAuthError('Sign-in popup was closed. Please try again.');
      } else {
        setAuthError(msg);
      }
      throw err;
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<AppUser> => {
    setAuthError(null);
    // 1. Try Backend API Database Server (if one is deployed alongside the app)
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setUser(data.user);
        return data.user as AppUser;
      } else if (data.error) {
        setAuthError(data.error);
        throw new Error(data.error);
      }
    } catch {
      // Backend not reachable, or returned something unexpected — fall through to Firebase
    }

    // 2. Real Firebase Auth
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const u: AppUser = {
        uid: credential.user.uid,
        email: credential.user.email || '',
        displayName: credential.user.displayName || '',
      };
      setUser(u);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      await ensureUserDoc(u);
      return u;
    } catch (fbErr: unknown) {
      const msg = fbErr instanceof Error ? fbErr.message : 'Sign-in failed';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setAuthError('Invalid email or password. Please try again.');
      } else {
        setAuthError(msg);
      }
      throw fbErr;
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string): Promise<AppUser> => {
    setAuthError(null);
    // 1. Try Backend API Database Server (if one is deployed alongside the app)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setUser(data.user);
        return data.user as AppUser;
      } else if (data.error) {
        setAuthError(data.error);
        throw new Error(data.error);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) throw err;
      // Backend not reachable, or returned something unexpected — fall through to Firebase
    }

    // 2. Real Firebase Auth
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }
      const u: AppUser = {
        uid: credential.user.uid,
        email: credential.user.email || '',
        displayName: displayName || credential.user.displayName || '',
      };
      setUser(u);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      await ensureUserDoc(u);
      return u;
    } catch (fbErr: unknown) {
      const msg = fbErr instanceof Error ? fbErr.message : 'Sign-up failed';
      if (msg.includes('email-already-in-use')) {
        setAuthError('An account with this email already exists. Please sign in instead.');
      } else {
        setAuthError(msg);
      }
      throw fbErr;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch { }
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('aay_reg_draft');
  };

  const resetPassword = async (email: string) => {
    try {
      setAuthError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password reset failed';
      setAuthError(msg);
      throw err;
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAdmin,
      isDemoMode,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      resetPassword,
      authError,
      clearAuthError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}