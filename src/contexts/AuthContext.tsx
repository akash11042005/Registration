import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  GoogleAuthProvider,
  type AuthError,
  type AuthCredential,
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
  emailVerified?: boolean;
}

// Populated when signInWithGoogle hits auth/account-exists-with-different-credential
// for an email that already has a password-based account. Holds what's needed to
// finish linking the two providers into a single uid once the user confirms their
// existing password (see linkPendingGoogleAccount below).
export interface PendingGoogleLink {
  email: string;
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
  // Duplicate-account (email/password vs. Google) handling:
  pendingGoogleLink: PendingGoogleLink | null;
  linkPendingGoogleAccount: (password: string) => Promise<AppUser>;
  cancelPendingGoogleLink: () => void;
  // Email verification:
  resendVerificationEmail: () => Promise<void>;
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
  const [pendingGoogleLink, setPendingGoogleLink] = useState<PendingGoogleLink | null>(null);
  // Kept in a ref (not state) purely as a stash for the AuthCredential object between
  // the failed signInWithPopup attempt and the follow-up linkPendingGoogleAccount call —
  // it's not serializable/renderable, so it doesn't belong in React state.
  const pendingGoogleCredRef = React.useRef<AuthCredential | null>(null);

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
          emailVerified: firebaseUser.emailVerified,
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
      setPendingGoogleLink(null);
      pendingGoogleCredRef.current = null;
      const res = await signInWithPopup(auth, googleProvider);
      const u: AppUser = {
        uid: res.user.uid,
        email: res.user.email || '',
        displayName: res.user.displayName || '',
        photoURL: res.user.photoURL || undefined,
        emailVerified: res.user.emailVerified,
      };
      setUser(u);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      await ensureUserDoc(u);
      return u;
    } catch (err: unknown) {
      const fbErr = err as AuthError;

      // This is the duplicate-account case: an email/password account already
      // exists for this Gmail address, so instead of letting Firebase silently
      // create a second uid for the Google credential, we stop and ask the
      // user to confirm their existing password so we can link the two
      // providers onto the SAME uid (see linkPendingGoogleAccount below).
      if (fbErr.code === 'auth/account-exists-with-different-credential') {
        const email = (fbErr.customData as { email?: string } | undefined)?.email;
        const cred = GoogleAuthProvider.credentialFromError(fbErr);

        if (email && cred) {
          try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (methods.includes('password')) {
              pendingGoogleCredRef.current = cred;
              setPendingGoogleLink({ email });
              setAuthError(
                `An account with ${email} already exists using a password. Enter that password to link your Google account — no new account will be created.`
              );
              throw new Error('account-exists-needs-link');
            }
          } catch (lookupErr) {
            if (lookupErr instanceof Error && lookupErr.message === 'account-exists-needs-link') throw lookupErr;
            // fetchSignInMethodsForEmail itself failed — fall through to generic handling below
          }
        }
      }

      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      if (msg === 'account-exists-needs-link') {
        // authError already set above with the specific linking instructions
      } else if (msg.includes('operation-not-allowed') || msg.includes('auth/configuration-not-found')) {
        setAuthError('Google sign-in is not enabled in this Firebase project. Please use email/password.');
      } else if (msg.includes('popup-closed')) {
        setAuthError('Sign-in popup was closed. Please try again.');
      } else {
        setAuthError(msg);
      }
      throw err;
    }
  };

  // Step 2 of the duplicate-account fix: called (e.g. from a small password
  // prompt shown when pendingGoogleLink is set) once the user re-enters the
  // password for their existing email/password account. Signs into that
  // existing uid, then attaches the stashed Google credential to it, so the
  // account ends up with BOTH providers on a single uid instead of two uids.
  const linkPendingGoogleAccount = async (password: string): Promise<AppUser> => {
    if (!pendingGoogleLink || !pendingGoogleCredRef.current) {
      throw new Error('No pending Google account link to complete.');
    }
    setAuthError(null);
    try {
      const { email } = pendingGoogleLink;
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await linkWithCredential(credential.user, pendingGoogleCredRef.current);

      const u: AppUser = {
        uid: credential.user.uid,
        email: credential.user.email || '',
        displayName: credential.user.displayName || '',
        photoURL: credential.user.photoURL || undefined,
        emailVerified: credential.user.emailVerified,
      };
      setUser(u);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      await ensureUserDoc(u);
      setPendingGoogleLink(null);
      pendingGoogleCredRef.current = null;
      return u;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not link Google account';
      if (msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setAuthError('Incorrect password. Please try again.');
      } else {
        setAuthError(msg);
      }
      throw err;
    }
  };

  const cancelPendingGoogleLink = () => {
    setPendingGoogleLink(null);
    pendingGoogleCredRef.current = null;
    setAuthError(null);
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
        emailVerified: credential.user.emailVerified,
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

    // 0. Duplicate-account guard: if this email already signed up via Google,
    // block the password signup here rather than letting Firebase create a
    // second, disconnected uid for the same person.
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0 && !methods.includes('password')) {
        setAuthError(
          `An account with ${email} already exists via Google sign-in. Please use "Continue with Google" instead.`
        );
        throw new Error('email-exists-google-only');
      }
    } catch (checkErr) {
      if (checkErr instanceof Error && checkErr.message === 'email-exists-google-only') throw checkErr;
      // Lookup itself failed (e.g. offline) — don't block signup on that, fall through as normal
    }

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
      try {
        await sendEmailVerification(credential.user);
      } catch (verifyErr) {
        // Don't block account creation if the verification email fails to send —
        // the user can retry via resendVerificationEmail() from the dashboard.
        console.warn('Could not send verification email:', verifyErr);
      }
      const u: AppUser = {
        uid: credential.user.uid,
        email: credential.user.email || '',
        displayName: displayName || credential.user.displayName || '',
        emailVerified: credential.user.emailVerified,
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

  // Called from TeamDashboardPage's "Resend verification email" button when
  // user.emailVerified is false. Uses auth.currentUser directly (not the local
  // `user` state) since it needs the live Firebase User object to call the SDK.
  const resendVerificationEmail = async () => {
    if (!auth.currentUser) {
      throw new Error('No signed-in user to send a verification email to.');
    }
    try {
      setAuthError(null);
      await sendEmailVerification(auth.currentUser);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not send verification email';
      if (msg.includes('too-many-requests')) {
        setAuthError('Too many requests — please wait a bit before trying again.');
      } else {
        setAuthError(msg);
      }
      throw err;
    }
  };

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
      pendingGoogleLink,
      linkPendingGoogleAccount,
      cancelPendingGoogleLink,
      resendVerificationEmail,
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