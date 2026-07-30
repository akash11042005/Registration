import { auth } from '@/lib/firebase';

// ============================================================
// Wraps fetch() to attach the current signed-in user's Firebase ID
// token as `Authorization: Bearer <token>` -- required by the
// /api/payment/* endpoints (see api/_lib/verifyAuth.ts) so the
// server can confirm the caller actually IS the uid the request
// claims to be, instead of trusting an unverified uid in the body.
//
// Firebase's SDK automatically refreshes the underlying token as
// needed; getIdToken() (no force-refresh arg) returns the cached
// token if it's still valid, so this is cheap to call every time.
// ============================================================
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;

    const headers = new Headers(init.headers || {});
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(input, { ...init, headers });
}
