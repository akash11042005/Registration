// ============================================================
// POST /api/payment/create-order
// Creates a Razorpay order for the registration fee. The amount
// is computed here, server-side, from fixed constants — never
// trusted from the client — so a tampered request can't create
// an order for less than the real fee.
// ============================================================
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Razorpay from 'razorpay';
import { getAdminDb } from '../_lib/firebaseadmin.js';
import { checkRateLimit, getCallerIp } from '../_lib/rateLimit.js';

// Keep these in sync with src/lib/constants.ts
const BASE_REGISTRATION_FEE = 1; // TEMPORARY for testing — real price is ₹300. Restore to 300 before the real event.
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

    const { wantsHomeDelivery } = (req.body || {}) as { wantsHomeDelivery?: boolean };
    const totalFee = BASE_REGISTRATION_FEE + (wantsHomeDelivery ? HOME_DELIVERY_ADDON_FEE : 0);

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await razorpay.orders.create({
      amount: totalFee * 100, // paise
      currency: 'INR',
      receipt: `aay_${Date.now()}`,
      notes: { wantsHomeDelivery: String(!!wantsHomeDelivery) },
    });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId, // public key id — safe to expose to the client
    });
  } catch (err) {
    console.error('Razorpay create-order error:', err);
    return res.status(500).json({ error: 'Could not initiate payment. Please try again.' });
  }
}