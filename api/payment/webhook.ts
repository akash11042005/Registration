// ============================================================
// POST /api/payment/webhook
// Configure in Razorpay Dashboard → Settings → Webhooks:
//   URL: https://aayodhyam.in/api/payment/webhook
//   Active events: payment.captured
//   Copy the "Secret" it gives you into RAZORPAY_WEBHOOK_SECRET
//
// This fires from RAZORPAY'S SERVERS the moment a payment is
// captured — completely independent of the student's browser,
// tab, network, or the 2-second redirect timer. If verify.ts
// already completed (the normal path), this is a no-op. If it
// didn't (browser died, network dropped, tab closed early —
// exactly what happened to revati/mrunal), THIS is what creates
// the registration instead, using the draft saved in
// pendingRegistrations by create-order.ts. Retries automatically
// (Razorpay retries failed webhooks for ~24h), so it's more
// reliable than any client-side fix could ever be.
// ============================================================
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { getAdminDb } from '../_lib/firebaseadmin.js';
import { completeRegistration, isValidRegistration } from '../_lib/completeRegistration.js';

// Razorpay needs the RAW request body to verify the signature —
// Vercel's default JSON body parsing must be disabled here.
export const config = {
    api: { bodyParser: false },
};

function readRawBody(req: VercelRequest): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('RAZORPAY_WEBHOOK_SECRET is not configured');
        return res.status(500).json({ error: 'Webhook not configured' });
    }

    const rawBody = await readRawBody(req);
    const signature = req.headers['x-razorpay-signature'] as string | undefined;

    if (!signature) {
        return res.status(400).json({ error: 'Missing signature' });
    }

    const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    const signatureValid =
        expectedSignature.length === signature.length &&
        crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));

    if (!signatureValid) {
        console.warn('Webhook signature mismatch — rejecting');
        return res.status(400).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(rawBody.toString('utf8'));

    // Always acknowledge fast with 200 once verified, even if we skip —
    // Razorpay will keep retrying non-2xx responses, which we don't want
    // for events we intentionally ignore.
    if (payload.event !== 'payment.captured') {
        return res.status(200).json({ ok: true, skipped: 'not payment.captured' });
    }

    const payment = payload.payload?.payment?.entity;
    if (!payment?.id || !payment?.order_id) {
        console.error('Webhook payload missing payment id/order_id', payload);
        return res.status(200).json({ ok: true, skipped: 'malformed payload' });
    }

    const razorpay_payment_id: string = payment.id;
    const razorpay_order_id: string = payment.order_id;

    try {
        const db = getAdminDb();

        // Already handled via the normal verify.ts path? Nothing to do.
        const existingPayment = await db.collection('payments').doc(razorpay_payment_id).get();
        if (existingPayment.exists) {
            return res.status(200).json({ ok: true, skipped: 'already processed via verify.ts' });
        }

        // Pull the draft saved at create-order time.
        const pendingSnap = await db.collection('pendingRegistrations').doc(razorpay_order_id).get();
        if (!pendingSnap.exists) {
            // No draft AND no payment record — nothing we can safely do automatically.
            // Flag for manual follow-up rather than silently dropping real money.
            await db.collection('payment_issues').add({
                reason: 'webhook_no_pending_draft',
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                amount: Number(payment.amount) / 100,
                createdAt: new Date().toISOString(),
            });
            console.error('Webhook: no pendingRegistrations draft for order', razorpay_order_id);
            return res.status(200).json({ ok: true, skipped: 'no pending draft — flagged for manual review' });
        }

        const pendingData = pendingSnap.data() as { registration: unknown; totalFee: number };
        if (!isValidRegistration(pendingData.registration)) {
            console.error('Webhook: stored draft failed validation', razorpay_order_id);
            return res.status(200).json({ ok: true, skipped: 'invalid stored draft' });
        }

        const result = await completeRegistration(db, {
            razorpay_order_id,
            razorpay_payment_id,
            registration: pendingData.registration,
            totalFee: pendingData.totalFee,
            paymentMethod: payment.method,
            holdId: null,
        });

        if (result.type === 'full' || result.type === 'duplicate_user_reg') {
            await db.collection('payment_issues').add({
                reason: result.type === 'full' ? 'task_full_after_payment_webhook' : 'duplicate_registration_webhook',
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                registration: pendingData.registration,
                createdAt: new Date().toISOString(),
            });
        }

        // Clean up the draft either way — it's served its purpose.
        await pendingSnap.ref.delete();

        console.log('Webhook completed registration for order', razorpay_order_id, result.type);
        return res.status(200).json({ ok: true, result: result.type });
    } catch (err) {
        console.error('Webhook processing error:', err);
        // Return 500 so Razorpay retries this one — it's a real failure, not an intentional skip.
        return res.status(500).json({ error: 'Internal error' });
    }
}