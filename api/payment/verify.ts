// ============================================================
// POST /api/payment/verify
// Verifies the Razorpay payment signature server-side (this is
// the step that actually proves the payment happened — never
// trust a "success" callback fired only in the browser), then
// writes the registration to Firestore using the Admin SDK so
// the client never has permission to set paymentStatus itself.
//
// Capacity check + registration creation + consuming the checkout
// reservation hold (see reserve-slot.ts) all happen inside ONE
// Firestore transaction, so this is genuinely race-condition-safe —
// not a plain read-then-write.
// ============================================================
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { getAdminDb } from '../_lib/firebaseadmin.js';
import { verifyCallerUid } from '../_lib/verifyAuth.js';
import { FieldValue } from 'firebase-admin/firestore';

const MAX_TEAMS_PER_TASK = 8;

interface RegistrationInput {
    teamName: string;
    leaderName: string;
    leaderEmail: string;
    leaderPhone: string;
    collegeName: string;
    member1Name?: string;
    member2Name?: string;
    mentorName?: string;
    mentorEmail?: string;
    mentorPhone?: string;
    taskId: number;
    taskTitle: string;
    uid: string;
    wantsHomeDelivery?: boolean;
}

function isValidRegistration(x: unknown): x is RegistrationInput {
    if (!x || typeof x !== 'object') return false;
    const r = x as Record<string, unknown>;
    return (
        typeof r.teamName === 'string' &&
        typeof r.leaderName === 'string' &&
        typeof r.leaderEmail === 'string' &&
        typeof r.leaderPhone === 'string' &&
        typeof r.collegeName === 'string' &&
        typeof r.taskId === 'number' &&
        typeof r.uid === 'string'
    );
}

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
    const registrationsRef = db.collection('registrations');
    const taskCountRef = db.collection('taskCounts').doc(String(registration.taskId));
    const holdRef = holdId ? db.collection('slotHolds').doc(holdId) : null;
    const paymentRef = db.collection('payments').doc(razorpay_payment_id);
    const userRef = db.collection('users').doc(registration.uid);
    try {
        const createdAtIso = new Date().toISOString();

        // Everything except registrationId, which depends on the atomic
        // team-count read below and so is filled in inside the transaction.
        const baseDocData = {
            teamName: registration.teamName.trim(),
            leaderName: registration.leaderName.trim(),
            leaderEmail: registration.leaderEmail.trim(),
            leaderPhone: registration.leaderPhone.trim(),
            collegeName: registration.collegeName.trim(),
            member1Name: registration.member1Name?.trim() || null,
            member2Name: registration.member2Name?.trim() || null,
            mentorName: registration.mentorName?.trim() || null,
            mentorEmail: registration.mentorEmail?.trim() || null,
            mentorPhone: registration.mentorPhone?.trim() || null,
            taskId: registration.taskId,
            taskTitle: registration.taskTitle,
            transactionId: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            paymentStatus: 'verified' as const,
            uid: registration.uid,
            wantsHomeDelivery: !!registration.wantsHomeDelivery,
            totalFee,
            createdAt: createdAtIso,
            createdAtServer: FieldValue.serverTimestamp(),
        };

        // ── Step 4: atomic transaction — checks payment duplicate, single registration, capacity, team-ID assignment, registration creation, hold consumption, payment record, user profile update ──
        const newRegRef = registrationsRef.doc();
        let finalDocData: typeof baseDocData & { registrationId: string } = { ...baseDocData, registrationId: '' };

        const result = await db.runTransaction(async (tx) => {
            // Check 4a: double-submit guard — same payment ID replayed
            const existingPaymentSnap = await tx.get(paymentRef);
            if (existingPaymentSnap.exists) {
                const payData = existingPaymentSnap.data();
                if (payData?.teamId) {
                    const regSnap = await tx.get(registrationsRef.doc(payData.teamId));
                    if (regSnap.exists) {
                        return { type: 'duplicate_payment' as const, registration: { id: regSnap.id, ...regSnap.data() } };
                    }
                }
            }

            // Check 4b: one-registration-per-user guard inside transaction
            const userSnap = await tx.get(userRef);
            const userData = userSnap.exists ? userSnap.data() : {};
            if (userData?.registrationStatus === 'registered' && userData?.teamId) {
                return { type: 'duplicate_user_reg' as const, existingRegistrationId: userData.teamId };
            }

            const countSnap = await tx.get(taskCountRef);
            const countData = countSnap.exists ? (countSnap.data() as { count?: number }) : {};
            const confirmed = countData.count || 0;

            if (confirmed >= MAX_TEAMS_PER_TASK) {
                return { type: 'full' as const };
            }

            // Team ID format: PS<task, 2 digits><team number within that task, 2 digits>
            const teamNumber = confirmed + 1;
            const regId = `PS${String(registration.taskId).padStart(2, '0')}${String(teamNumber).padStart(2, '0')}`;
            const docData = { ...baseDocData, registrationId: regId };
            finalDocData = docData;

            let holdExisted = false;
            if (holdRef) {
                const holdSnap = await tx.get(holdRef);
                holdExisted = holdSnap.exists;
            }

            tx.set(newRegRef, docData);
            tx.set(taskCountRef, { taskId: registration.taskId, count: FieldValue.increment(1) }, { merge: true });

            if (holdExisted && holdRef) {
                tx.delete(holdRef);
                tx.set(taskCountRef, { held: FieldValue.increment(-1) }, { merge: true });
            }

            // Dedicated payments collection
            tx.set(paymentRef, {
                paymentId: razorpay_payment_id,
                transactionId: razorpay_payment_id,
                razorpayOrderId: razorpay_order_id,
                gatewayResponse: {
                    status: 'captured',
                    method: paymentMethod || null,
                    amount: totalFee,
                    currency: 'INR',
                },
                amount: totalFee,
                uid: registration.uid,
                teamId: newRegRef.id,
                status: 'captured',
                createdAt: createdAtIso,
                createdAtServer: FieldValue.serverTimestamp(),
            });

            // Denormalize profile doc
            tx.set(userRef, {
                phone: registration.leaderPhone,
                collegeName: registration.collegeName,
                registrationStatus: 'registered',
                teamId: newRegRef.id,
            }, { merge: true });

            return { type: 'success' as const };
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
                createdAt: FieldValue.serverTimestamp(),
            });
            return res.status(409).json({
                error: 'You already have a registration on file. This payment was received but a second registration was not created — our team will contact you about a refund. Please note your Payment ID: ' + razorpay_payment_id,
            });
        }

        if (result.type === 'full') {
            // Payment already succeeded — don't lose it silently. Flag for manual admin follow-up.
            await db.collection('payment_issues').add({
                reason: 'task_full_after_payment',
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                registration,
                totalFee,
                createdAt: FieldValue.serverTimestamp(),
            });
            return res.status(409).json({
                error: 'Your payment was received, but this problem statement filled up in the meantime. Our team will contact you to reassign your task or process a refund — please note your Payment ID: ' + razorpay_payment_id,
            });
        }

        return res.status(200).json({ ...finalDocData, id: newRegRef.id });
    } catch (err) {
        console.error('Registration write error after verified payment:', err);
        return res.status(500).json({
            error: 'Payment was verified but saving your registration failed. Please contact the organizers with your Payment ID: ' + razorpay_payment_id,
        });
    }
}