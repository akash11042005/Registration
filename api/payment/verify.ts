// ============================================================
// POST /api/payment/verify
// Verifies the Razorpay payment signature server-side, then
// writes the registration via the shared completeRegistration()
// transaction (also used by webhook.ts as a fallback path if
// this request never arrives — see webhook.ts).
// ============================================================
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { getAdminDb } from '../_lib/firebaseadmin.js';
import { verifyCallerUid } from '../_lib/verifyAuth.js';
import { completeRegistration, isValidRegistration } from '../_lib/completeRegistration.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const keyId = process.env.RAZORPAY_KEY_ID;
    if (!keySecret || !keyId) {
        console.error('Razorpay keys are not configured on the server');
        return res.status(500).json({ error: 'Payment gateway is not configured. Please contact the organizers.' });
    }

    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        registration,
        holdId,
    } = (req.body || {}) as {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
        registration?: unknown;
        holdId?: string;
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing payment verification fields' });
    }
    if (!isValidRegistration(registration)) {
        return res.status(400).json({ error: 'Missing or invalid team registration details' });
    }

    const authResult = await verifyCallerUid(req, registration.uid);
    if (!authResult.ok) {
        return res.status(authResult.status).json({ error: authResult.error });
    }

    // ── Step 1: verify the HMAC signature Razorpay attaches to the checkout callback ──
    const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

    const signatureValid =
        expectedSignature.length === razorpay_signature.length &&
        crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpay_signature));

    if (!signatureValid) {
        console.warn('Razorpay signature mismatch for order', razorpay_order_id);
        return res.status(400).json({ error: 'Payment verification failed. If money was deducted, contact the organizers with your payment ID.' });
    }

    // ── Step 2: double-check the payment itself with Razorpay (defence in depth) ──
    let totalFee: number;
    let paymentMethod: string | undefined;
    try {
        const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        if (payment.status !== 'captured' && payment.status !== 'authorized') {
            return res.status(400).json({ error: `Payment status is "${payment.status}", not completed. Please retry.` });
        }
        totalFee = Number(payment.amount) / 100;
        paymentMethod = payment.method;
    } catch (err) {
        console.error('Razorpay payment fetch error:', err);
        return res.status(500).json({ error: 'Could not confirm payment with Razorpay. Please contact the organizers with your payment ID.' });
    }

    let db: ReturnType<typeof getAdminDb>;
    try {
        db = getAdminDb();
    } catch (err) {
        console.error('Firebase Admin initialization error:', err);
        return res.status(500).json({
            error: 'Payment was verified but the server is not configured correctly. Please contact the organizers with your Payment ID: ' + razorpay_payment_id,
        });
    }

    // ── Step 3: create the registration via the SAME transaction logic the webhook uses ──
    try {
        const result = await completeRegistration(db, {
            razorpay_order_id,
            razorpay_payment_id,
            registration,
            totalFee,
            paymentMethod,
            holdId: holdId || null,
        });

        if (result.type === 'duplicate_payment') {
            return res.status(200).json(result.registration);
        }

        if (result.type === 'duplicate_user_reg') {
            await db.collection('payment_issues').add({
                reason: 'duplicate_registration_attempt',
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                registration,
                totalFee,
                existingRegistrationId: result.existingRegistrationId,
                createdAt: new Date().toISOString(),
            });
            return res.status(409).json({
                error: 'You already have a registration on file. This payment was received but a second registration was not created — our team will contact you about a refund. Please note your Payment ID: ' + razorpay_payment_id,
            });
        }

        if (result.type === 'full') {
            await db.collection('payment_issues').add({
                reason: 'task_full_after_payment',
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                registration,
                totalFee,
                createdAt: new Date().toISOString(),
            });
            return res.status(409).json({
                error: 'Your payment was received, but this problem statement filled up in the meantime. Our team will contact you to reassign your task or process a refund — please note your Payment ID: ' + razorpay_payment_id,
            });
        }

        // Success — clean up the pendingRegistrations draft; the webhook won't need it now.
        await db.collection('pendingRegistrations').doc(razorpay_order_id).delete().catch(() => {
            // Non-fatal: draft cleanup failing doesn't affect the student's registration.
        });

        return res.status(200).json({ ...result.docData, id: result.regDocId });
    } catch (err) {
        console.error('Registration write error after verified payment:', err);
        return res.status(500).json({
            error: 'Payment was verified but saving your registration failed. Please contact the organizers with your Payment ID: ' + razorpay_payment_id,
        });
    }
}