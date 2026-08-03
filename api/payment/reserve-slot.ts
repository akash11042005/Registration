// ============================================================
// POST /api/payment/reserve-slot
//
// Called the moment a user clicks "Pay" — BEFORE the Razorpay
// checkout opens. Temporarily reserves one slot for 2 minutes so
// two people can't both think a nearly-full task still has room
// while they're mid-checkout. If they complete payment, this hold
// is converted into the real registration (api/payment/verify.ts).
// If they cancel or abandon the page, it's released — either
// immediately (release-hold.ts) or automatically once expired.
//
// IMPORTANT — this is a UX courtesy, not the security boundary.
// The hard, race-condition-safe capacity check remains the
// Firestore transaction inside api/payment/verify.ts, which never
// trusts anything about holds being honestly reported.
// ============================================================
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDb } from '../_lib/firebaseadmin.js';
import { verifyCallerUid } from '../_lib/verifyAuth.js';
import { FieldValue } from 'firebase-admin/firestore';

const MAX_TEAMS_PER_TASK = 8;
const HOLD_DURATION_MS = 2 * 60 * 1000; // 2 minutes

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { taskId, uid: rawUid } = (req.body || {}) as { taskId?: number; uid?: string };
    const uid = typeof rawUid === 'string' ? rawUid.trim() : '';

    if (typeof taskId !== 'number' || taskId <= 0 || !Number.isInteger(taskId) || !uid) {
        return res.status(400).json({ error: 'Missing or invalid taskId or uid' });
    }

    const authResult = await verifyCallerUid(req, uid);
    if (!authResult.ok) {
        return res.status(authResult.status).json({ error: authResult.error });
    }

    let db: ReturnType<typeof getAdminDb>;
    try {
        db = getAdminDb();
    } catch (err) {
        console.error('Firebase Admin initialization error:', err);
        return res.status(500).json({ error: 'Server is not configured correctly. Please contact the organizers.' });
    }
    const taskCountRef = db.collection('taskCounts').doc(String(taskId));
    const holdsRef = db.collection('slotHolds');

    try {
        // ── Step 1: lazily expire this task's stale holds (best-effort, transactional verification) ──
        // Reads stale holds outside transaction, then inside the transaction verifies if each hold
        // document still exists before deleting and counting towards held decrement to prevent counter drift.
        const now = Date.now();
        const staleHolds = await holdsRef
            .where('taskId', '==', taskId)
            .where('expiresAt', '<=', now)
            .get();

        if (!staleHolds.empty) {
            await db.runTransaction(async (tx) => {
                let deletedCount = 0;
                for (const d of staleHolds.docs) {
                    const snap = await tx.get(d.ref);
                    if (snap.exists) {
                        tx.delete(d.ref);
                        deletedCount++;
                    }
                }
                if (deletedCount > 0) {
                    const countSnap = await tx.get(taskCountRef);
                    const currentHeld = countSnap.exists ? (countSnap.data() as { held?: number }).held || 0 : 0;
                    const clampedHeld = Math.max(0, currentHeld - deletedCount);
                    tx.set(taskCountRef, { taskId, held: clampedHeld }, { merge: true });
                }
            }).catch(() => {
                // Non-fatal — worst case an expired hold lingers an extra request cycle.
            });
        }

        // ── Step 2: reuse an existing active hold for this uid+task if one exists ──
        const now2 = Date.now();
        const existingHold = await holdsRef
            .where('taskId', '==', taskId)
            .where('uid', '==', uid)
            .where('expiresAt', '>', now2)
            .limit(1)
            .get();

        if (!existingHold.empty) {
            const doc = existingHold.docs[0];
            const expiresAt = now2 + HOLD_DURATION_MS;
            await doc.ref.update({ expiresAt }); // renew instead of stacking a second hold
            return res.status(200).json({ holdId: doc.id, expiresAt, holdSeconds: HOLD_DURATION_MS / 1000 });
        }

        // ── Step 3: atomic reserve ──
        const result = await db.runTransaction(async (tx) => {
            const countSnap = await tx.get(taskCountRef);
            const data = countSnap.exists ? countSnap.data() as { count?: number; held?: number } : {};
            const confirmed = data.count || 0;
            const held = Math.max(0, data.held || 0);

            if (confirmed + held >= MAX_TEAMS_PER_TASK) {
                return { full: true as const };
            }

            const holdRef = holdsRef.doc();
            const expiresAt = Date.now() + HOLD_DURATION_MS;
            tx.set(holdRef, { taskId, uid, createdAt: FieldValue.serverTimestamp(), expiresAt });
            tx.set(taskCountRef, { taskId, held: FieldValue.increment(1) }, { merge: true });

            return { full: false as const, holdId: holdRef.id, expiresAt };
        });

        if (result.full) {
            return res.status(409).json({
                error: 'This problem statement just reached its team cap. Please choose another before paying.',
            });
        }

        return res.status(200).json({ holdId: result.holdId, expiresAt: result.expiresAt, holdSeconds: HOLD_DURATION_MS / 1000 });
    } catch (err) {
        console.error('reserve-slot error:', err);
        return res.status(500).json({ error: 'Could not reserve a slot. Please try again.' });
    }
}