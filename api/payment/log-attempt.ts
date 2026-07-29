// ============================================================
// POST /api/payment/log-attempt
//
// Logs a payment attempt that did NOT succeed — either the user
// cancelled the Razorpay popup, or a payment method was declined.
// Called from src/lib/razorpay.ts's failure/dismiss paths.
//
// This exists purely for admin visibility ("why did this person
// never complete registration?") — it never touches slot counts,
// registrations, or anything security-relevant. A logging failure
// here should never block or confuse the user's actual checkout flow.
// ============================================================
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDb } from '../_lib/firebaseadmin.js';
import { verifyCallerUid } from '../_lib/verifyAuth.js';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
        status, // 'failed' | 'cancelled'
        orderId,
        paymentId, // present for genuine failures (card declined etc.), absent for a plain cancel
        uid,
        taskId,
        errorCode,
        errorDescription,
        errorReason,
    } = (req.body || {}) as {
        status?: 'failed' | 'cancelled';
        orderId?: string;
        paymentId?: string;
        uid?: string;
        taskId?: number;
        errorCode?: string;
        errorDescription?: string;
        errorReason?: string;
    };

    if (status !== 'failed' && status !== 'cancelled') {
        return res.status(400).json({ error: 'Invalid status' });
    }

    // This endpoint is purely for admin visibility and must never block the
    // user's flow — so an unverifiable uid isn't rejected outright, it's just
    // dropped from the logged record rather than trusted as-is.
    let verifiedUid: string | null = null;
    if (uid) {
        const authResult = await verifyCallerUid(req, uid);
        verifiedUid = authResult.ok ? authResult.uid : null;
    }

    try {
        const db = getAdminDb();
        // Use the real Razorpay payment ID as the doc ID when we have one (failed
        // attempts still get one) so it lines up with a later successful retry's
        // audit trail; otherwise let Firestore generate one for a plain cancel.
        const ref = paymentId ? db.collection('payments').doc(paymentId) : db.collection('payments').doc();

        await ref.set({
            paymentId: paymentId || null,
            razorpayOrderId: orderId || null,
            uid: verifiedUid,
            taskId: typeof taskId === 'number' ? taskId : null,
            status,
            gatewayResponse: {
                errorCode: errorCode || null,
                errorDescription: errorDescription || null,
                errorReason: errorReason || null,
            },
            createdAt: new Date().toISOString(),
            createdAtServer: FieldValue.serverTimestamp(),
        }, { merge: true });

        return res.status(200).json({ logged: true });
    } catch (err) {
        console.error('log-attempt error (non-fatal):', err);
        // Never fail the user's flow over a logging error.
        return res.status(200).json({ logged: false });
    }
}