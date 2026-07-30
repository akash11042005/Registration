// ============================================================
// Firebase Admin SDK -- server-only initialization
// Used exclusively by /api serverless functions. NEVER import
// this from src/ (client bundle) -- the service account key
// must never reach the browser.
// ============================================================
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

let app: App;

function getServiceAccount() {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) {
        throw new Error(
            'FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add the full service account JSON ' +
            '(Firebase Console -> Project Settings -> Service Accounts -> Generate new private key) ' +
            'as a single-line env var in Vercel.'
        );
    }
    try {
        return JSON.parse(raw);
    } catch {
        // Support base64-encoded value too, in case the raw JSON has quoting issues in Vercel's UI
        return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
    }
}

export function getAdminApp(): App {
    if (getApps().length > 0) {
        app = getApps()[0]!;
        return app;
    }
    const serviceAccount = getServiceAccount();
    app = initializeApp({
        credential: cert(serviceAccount),
    });
    return app;
}

export function getAdminDb(): Firestore {
    return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
    return getAuth(getAdminApp());
}
