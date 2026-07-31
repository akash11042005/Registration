// ============================================================
// POST /api/payment/cleanup-stale-holds
//
// Full reconciliation of every task's `held` count against the
// actual slotHolds documents in Firestore — not an incremental
// decrement based on assumed prior state. This matters because a
// held count can drift out of sync with reality (e.g. an
// interrupted operation from before other fixes were in place
// leaves `held` incremented with no matching slotHolds document
// left to reconcile against) — a naive "decrement what I can find"
// approach can't fix that kind of orphaned drift, but recomputing
// the true value directly from source data always self-heals it.
//
// Reads the whole slotHolds collection unfiltered (no per-field
// query, so no composite index needed) and every taskCounts doc,
// then for each task sets `held` to the exact count of its still-
// live (non-expired) holds — deleting the expired ones along the
// way. Cheap at this scale (a handful of tasks, rarely more than a
// few active holds at once).
//
// Called fire-and-forget from ProblemStatementsPage.tsx on mount —
// browsing the problem statements list happens far more often than
// retrying one specific task, so this gives a much faster, more
// reliable self-heal than waiting on reserve-slot.ts's per-task
// lazy cleanup alone.
//
// Purely a UX courtesy cleanup, not a security boundary — no auth
// required, since it only ever corrects aggregate counts to match
// reality, never touches anyone's actual registration data.
// ============================================================
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDb } from '../_lib/firebaseadmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let db: ReturnType<typeof getAdminDb>;
    try {
        db = getAdminDb();
    } catch (err) {
        console.error('Firebase Admin initialization error (cleanup-stale-holds, non-fatal):', err);
        // Never fail the page load over this — it's a background courtesy sweep.
        return res.status(200).json({ reconciled: 0 });
    }

    try {
        const now = Date.now();

        const [allHolds, allTaskCounts] = await Promise.all([
            db.collection('slotHolds').get(),
            db.collection('taskCounts').get(),
        ]);

        // True live (non-expired) hold count per task, computed from actual documents.
        const liveHeldByTask = new Map<number, number>();
        const expiredHoldRefs: FirebaseFirestore.DocumentReference[] = [];

        for (const doc of allHolds.docs) {
            const data = doc.data() as { taskId?: number; expiresAt?: number };
            if (typeof data.taskId !== 'number') continue;
            if (typeof data.expiresAt === 'number' && data.expiresAt <= now) {
                expiredHoldRefs.push(doc.ref);
            } else {
                liveHeldByTask.set(data.taskId, (liveHeldByTask.get(data.taskId) || 0) + 1);
            }
        }

        // Every task currently in taskCounts needs checking too — this is what
        // catches an orphaned `held` value that has zero matching hold documents.
        const taskIdsToReconcile = new Set<number>(liveHeldByTask.keys());
        for (const doc of allTaskCounts.docs) {
            const taskId = Number(doc.id);
            if (!Number.isNaN(taskId)) taskIdsToReconcile.add(taskId);
        }

        let reconciled = 0;
        for (const taskId of taskIdsToReconcile) {
            const taskCountRef = db.collection('taskCounts').doc(String(taskId));
            const trueHeld = liveHeldByTask.get(taskId) || 0;
            const snap = await taskCountRef.get();
            const currentHeld = snap.exists ? (snap.data() as { held?: number }).held || 0 : 0;
            if (currentHeld !== trueHeld) {
                await taskCountRef.set({ held: trueHeld }, { merge: true });
                reconciled++;
            }
        }

        if (expiredHoldRefs.length > 0) {
            const batch = db.batch();
            expiredHoldRefs.forEach((ref) => batch.delete(ref));
            await batch.commit();
        }

        return res.status(200).json({ reconciled, expiredHoldsRemoved: expiredHoldRefs.length });
    } catch (err) {
        console.error('cleanup-stale-holds error (non-fatal):', err);
        return res.status(200).json({ reconciled: 0 });
    }
}