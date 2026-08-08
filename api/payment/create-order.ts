// ============================================================
// POST /api/payment/create-order
// Creates a Razorpay order. NOW also saves the full registration
// draft to pendingRegistrations/{orderId} BEFORE creating the
// order — so if the browser dies, closes, or loses network right
// after payment (the exact bug that hit revati/mrunal), the
// webhook (payment.captured, fired from Razorpay's servers, not
// the browser) can still find the team's data and complete the
// registration with zero student action needed.
// ============================================================
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Razorpay from 'razorpay';
import { getAdminDb } from '../_lib/firebaseadmin.js';
import { checkRateLimit, getCallerIp } from '../_lib/rateLimit.js';
import { verifyCallerUid } from '../_lib/verifyAuth.js';
import { isValidRegistration } from '../_lib/completeRegistration.js';
import { FieldValue } from 'firebase-admin/firestore';

const BASE_REGISTRATION_FEE = 300;
const HOME_DELIVERY_ADDON_FEE = 300;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    console.error('Razorpay keys are not configured on the server');
    return res.status(500).json({ error: 'Payment gateway is not configured. Please contact the organizers.' });
  }

  try {
    const db = getAdminDb();
    const callerIp = getCallerIp(req);
    const allowed = await checkRateLimit(db, `create-order:${callerIp}`, 10, 60 * 1000);
    if (!allowed) {
      return res.status(429).json({ error: 'Too many requests. Please wait a minute before creating another payment order.' });
    }

    const { wantsHomeDelivery, registration } = (req.body || {}) as {
      wantsHomeDelivery?: boolean;
      registration?: unknown;
    };

    // Registration form data is now REQUIRED at order-creation time,
    // not just at verify time — this is what makes the webhook fallback possible.
    if (!isValidRegistration(registration)) {
      return res.status(400).json({ error: 'Missing or invalid team registration details' });
    }

    const authResult = await verifyCallerUid(req, registration.uid);
    if (!authResult.ok) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const totalFee = BASE_REGISTRATION_FEE + (wantsHomeDelivery ? HOME_DELIVERY_ADDON_FEE : 0);

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await razorpay.orders.create({
      amount: totalFee * 100,
      currency: 'INR',
      receipt: `aay_${Date.now()}`,
      notes: { wantsHomeDelivery: String(!!wantsHomeDelivery), uid: registration.uid },
    });

    // Save the draft BEFORE responding to the client. If everything after
    // this point fails on the client side, the webhook can still recover.
    await db.collection('pendingRegistrations').doc(order.id).set({
      registration: { ...registration, wantsHomeDelivery: !!wantsHomeDelivery },
      totalFee,
      createdAt: FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (err) {
    console.error('Razorpay create-order error:', err);
    return res.status(500).json({ error: 'Could not initiate payment. Please try again.' });
  }
}