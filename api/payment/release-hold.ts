// ============================================================
// POST /api/payment/release-hold
//
// Called when the user cancels/dismisses the Razorpay checkout,
// or navigates away/closes the tab while a hold is active (via
// navigator.sendBeacon — see RegistrationPage.tsx). Frees the
// 2-minute reservation immediately instead of making other users
// wait out the full hold duration on a slot nobody is actually
// still trying to pay for.
//
// Non-fatal by design: a logging/release failure here should
// never block or confuse the user's own flow — worst case the
// hold just expires on its own via reserve-slot.ts's lazy cleanup.
// ============================================================
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDb } from '../_lib/firebaseadmin.js';
import { getVerifiedCallerUid } from '../_lib/verifyAuth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { holdId } = (req.body || {}) as { holdId?: string };
    if (!holdId) {
        return res.status(400).json({ error: 'Missing holdId' });
    }

    // navigator.sendBeacon (used for the tab-close cleanup path in
    // RegistrationPage.tsx) can't send custom headers, so there's often no
    // Authorization header here at all — that's expected, not tampering.
    // We only use this to BLOCK a mismatched, authenticated attempt to
    // release someone else's hold; a missing token still allows release.
    const callerUid = await getVerifiedCallerUid(req);

    let db: ReturnType<typeof getAdminDb>;
    try {
        db = getAdminDb();
    } catch (err) {
        console.error('Firebase Admin initialization error (release-hold, non-fatal):', err);
        // Never fail the user's flow over this — the hold will still expire on its own.
        return res.status(200).json({ released: false });
    }

    const holdRef = db.collection('slotHolds').doc(holdId);

    try {
        const released = await db.runTransaction(async (tx) => {
            const holdSnap = await tx.get(holdRef);
            if (!holdSnap.exists) {
                // Already released, already expired-and-cleaned-up, or already
                // consumed into a real registration by verify.ts — nothing to do.
                return false;
            }
            const { taskId, uid: holdOwnerUid } = holdSnap.data() as { taskId: number; uid?: string };

            // A verified caller trying to release a hold that isn't theirs —
            // refuse. (No caller identity at all, e.g. sendBeacon, is allowed
            // through, since that's the expected shape of the cleanup path.)
            if (callerUid && holdOwnerUid && callerUid !== holdOwnerUid) {
                return false;
            }

            const taskCountRef = db.collection('taskCounts').doc(String(taskId));
            const countSnap = await tx.get(taskCountRef);
            const currentHeld = countSnap.exists ? (countSnap.data() as { held?: number }).held || 0 : 0;
            // Clamp at 0 — never let a release push the counter negative.
            const clampedHeld = Math.max(0, currentHeld - 1);
            tx.delete(holdRef);
            tx.set(taskCountRef, { held: clampedHeld }, { merge: true });
            return true;
        });

        return res.status(200).json({ released });
    } catch (err) {
        console.error('release-hold error (non-fatal):', err);
        return res.status(200).json({ released: false });
    }
}