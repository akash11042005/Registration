// ============================================================
// Shared request-authentication helper for /api/payment/* functions.
//
// Every payment endpoint receives a `uid` in its JSON body, but a
// JSON body is just text anyone can send — without this, nothing
// stopped a script from calling reserve-slot/verify/log-attempt/
// release-hold with someone ELSE's uid and interfering with their
// slot hold or registration. This verifies the Firebase ID token
// sent in the `Authorization: Bearer <token>` header (see
// src/lib/authFetch.ts on the client) actually belongs to the uid
// the request claims to be acting as.
// ============================================================
import type { VercelRequest } from '@vercel/node';
import { getAdminAuth } from './firebaseadmin.js';

export interface AuthResult {
    ok: true;
    uid: string;
}
export interface AuthFailure {
    ok: false;
    status: number;
    error: string;
}

/**
 * Verifies the Authorization: Bearer <Firebase ID token> header on `req`
 * actually belongs to `claimedUid`. Returns { ok: true, uid } on success,
 * or { ok: false, status, error } to send straight back as the response.
 */
export async function verifyCallerUid(req: VercelRequest, claimedUid: string): Promise<AuthResult | AuthFailure> {
    const authHeader = req.headers.authorization || '';
    const match = /^Bearer (.+)$/.exec(authHeader);
    if (!match) {
        return { ok: false, status: 401, error: 'Missing authentication token.' };
    }

    try {
        const decoded = await getAdminAuth().verifyIdToken(match[1]);
        if (decoded.uid !== claimedUid) {
            return { ok: false, status: 403, error: 'Authentication token does not match the request.' };
        }
        return { ok: true, uid: decoded.uid };
    } catch (err) {
        console.error('ID token verification failed:', err);
        return { ok: false, status: 401, error: 'Invalid or expired authentication token. Please sign in again.' };
    }
}

/**
 * Like verifyCallerUid, but for endpoints that don't receive a claimed uid
 * up front (e.g. release-hold, which only gets a holdId and must look up
 * whose hold it is before it can check ownership). Just verifies the token
 * is valid and returns the uid it belongs to, or null if missing/invalid.
 */
export async function getVerifiedCallerUid(req: VercelRequest): Promise<string | null> {
    const authHeader = req.headers.authorization || '';
    const match = /^Bearer (.+)$/.exec(authHeader);
    if (!match) return null;
    try {
        const decoded = await getAdminAuth().verifyIdToken(match[1]);
        return decoded.uid;
    } catch (err) {
        console.error('ID token verification failed:', err);
        return null;
    }
}

/**
 * Like getVerifiedCallerUid, but also returns the token's email — for
 * admin-only endpoints (e.g. export-registrations) that need to check the
 * caller's email against an admin allowlist rather than match a claimed uid.
 * Decodes the token once and returns both fields together so callers don't
 * have to verify the same token twice.
 */
export async function getVerifiedCaller(req: VercelRequest): Promise<{ uid: string; email: string | null } | null> {
    const authHeader = req.headers.authorization || '';
    const match = /^Bearer (.+)$/.exec(authHeader);
    if (!match) return null;
    try {
        const decoded = await getAdminAuth().verifyIdToken(match[1]);
        return { uid: decoded.uid, email: decoded.email ?? null };
    } catch (err) {
        console.error('ID token verification failed:', err);
        return null;
    }
}