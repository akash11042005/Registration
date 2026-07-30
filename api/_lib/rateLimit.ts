// ============================================================
// Simple Firestore-backed rate limiter for /api serverless functions.
//
// Serverless functions are stateless between invocations, so an
// in-memory counter wouldn't work -- every request could hit a fresh
// instance. This uses a small Firestore doc per rate-limit key
// (typically caller IP) with a fixed time window, checked/updated
// inside a transaction so concurrent requests can't race past the
// limit.
// ============================================================
import type { VercelRequest } from '@vercel/node';
import type { Firestore } from 'firebase-admin/firestore';

/**
 * Best-effort caller IP from Vercel's forwarded-for header. Not
 * spoof-proof against someone crafting the header directly, but
 * Vercel's own edge sets/overwrites this for real traffic, and this
 * is a courtesy throttle, not a security boundary -- the real
 * boundaries remain signature verification and Firestore transactions.
 */
export function getCallerIp(req: VercelRequest): string {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return (ip || 'unknown').split(',')[0].trim();
}

/**
 * Returns true if the request is within the allowed rate, false if it
 * should be rejected (429). `key` should already include both the
 * endpoint name and identifying info (e.g. `create-order:${ip}`) so
 * different endpoints don't share the same budget.
 */
export async function checkRateLimit(
    db: Firestore,
    key: string,
    limit: number,
    windowMs: number
): Promise<boolean> {
    const ref = db.collection('rateLimits').doc(key);
    const now = Date.now();

    try {
        return await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const data = snap.exists ? (snap.data() as { count?: number; windowStart?: number }) : {};

            if (!data.windowStart || now - data.windowStart > windowMs) {
                // New window -- reset.
                tx.set(ref, { count: 1, windowStart: now });
                return true;
            }

            if ((data.count || 0) >= limit) {
                return false;
            }

            tx.set(ref, { count: (data.count || 0) + 1, windowStart: data.windowStart }, { merge: true });
            return true;
        });
    } catch (err) {
        // Fail OPEN, not closed -- a rate-limit check failing shouldn't be
        // able to take down the actual feature it's protecting.
        console.error('Rate limit check failed (allowing request through):', err);
        return true;
    }
}
