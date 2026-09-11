// Firebase configuration
// Values come from VITE_FIREBASE_* env vars (set in Vercel → Environment
// Variables, and in .env.local for local dev — see .env.example).

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const REQUIRED_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

const missing = REQUIRED_ENV_VARS.filter((key) => !import.meta.env[key]);
if (missing.length > 0) {
  // Fail loudly and immediately, rather than silently falling back to a
  // fake demo project — that used to produce confusing downstream errors
  // (auth/firestore calls failing in ways that look unrelated to config)
  // instead of one clear message pointing at the actual cause.
  throw new Error(
    `Firebase is not configured: missing ${missing.join(', ')}. ` +
    'Set these in Vercel → Project → Settings → Environment Variables (or .env.local for local dev).'
  );
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase (prevent duplicate initialization in dev hot-reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;