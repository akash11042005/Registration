// ============================================================
// Razorpay Checkout — client-side helper
// Loads the Checkout.js script once and exposes a typed wrapper
// around opening it. The actual order creation and payment
// verification happen server-side (api/payment/*) — this file
// never touches the Razorpay secret key.
// ============================================================
import { authFetch } from '@/lib/authFetch';

export interface RazorpayCreateOrderResponse {
    orderId: string;
    amount: number; // paise
    currency: string;
    keyId: string;
}

export interface RazorpaySuccessPayload {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}

interface RazorpayFailureResponse {
    error: {
        code: string;
        description: string;
        reason: string;
        metadata?: { order_id?: string; payment_id?: string };
    };
}

interface RazorpayCheckoutOptions {
    key: string;
    amount: number;
    currency: string;
    order_id: string;
    name: string;
    description?: string;
    prefill?: { name?: string; email?: string; contact?: string };
    theme?: { color?: string };
    handler: (response: RazorpaySuccessPayload) => void;
    modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
    open: () => void;
    on: (event: 'payment.failed', handler: (response: RazorpayFailureResponse) => void) => void;
}

declare global {
    interface Window {
        Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
    }
}

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptLoadPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
    if (window.Razorpay) return Promise.resolve();
    if (scriptLoadPromise) return scriptLoadPromise;

    scriptLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = CHECKOUT_SRC;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Could not load the Razorpay checkout script. Check your connection and try again.'));
        document.body.appendChild(script);
    });

    return scriptLoadPromise;
}

// Best-effort admin-visibility log for a payment that did NOT succeed.
// Never allowed to throw or block the caller's own error handling.
function logFailedAttempt(params: {
    status: 'failed' | 'cancelled';
    orderId: string;
    uid: string;
    taskId: number;
    paymentId?: string;
    errorCode?: string;
    errorDescription?: string;
    errorReason?: string;
}) {
    authFetch('/api/payment/log-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    }).catch(() => {
        // Purely a logging nicety for the admin dashboard — never worth
        // surfacing a second error to the user over this.
    });
}

/**
 * Creates a Razorpay order via the backend, then opens the Checkout modal.
 * Resolves with the signed success payload once the user completes payment;
 * rejects if the script fails to load, the order can't be created, the user
 * closes the modal without paying, or a payment attempt is declined.
 */
export async function payWithRazorpay(params: {
    wantsHomeDelivery: boolean;
    name: string;
    email: string;
    contact: string;
    taskId: number;
    uid: string;
    registration: {
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
    };
}): Promise<RazorpaySuccessPayload> {
    await loadRazorpayScript();

    const orderRes = await authFetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            wantsHomeDelivery: params.wantsHomeDelivery,
            registration: { ...params.registration, wantsHomeDelivery: params.wantsHomeDelivery },
        }),
    });

    if (!orderRes.ok) {
        const body = await orderRes.json().catch(() => ({}));
        throw new Error(body.error || 'Could not initiate payment. Please try again.');
    }

    const order: RazorpayCreateOrderResponse = await orderRes.json();

    return new Promise((resolve, reject) => {
        if (!window.Razorpay) {
            reject(new Error('Razorpay checkout failed to load.'));
            return;
        }

        const rzp = new window.Razorpay({
            key: order.keyId,
            amount: order.amount,
            currency: order.currency,
            order_id: order.orderId,
            name: 'AAYODHYAM 2026',
            description: 'Team Registration Fee',
            prefill: { name: params.name, email: params.email, contact: params.contact },
            theme: { color: '#0f172a' },
            handler: (response) => resolve(response),
            modal: {
                ondismiss: () => {
                    logFailedAttempt({ status: 'cancelled', orderId: order.orderId, uid: params.uid, taskId: params.taskId });
                    reject(new Error('Payment window closed before completing payment.'));
                },
            },
        });

        rzp.on('payment.failed', (response) => {
            const { error } = response;
            logFailedAttempt({
                status: 'failed',
                orderId: order.orderId,
                uid: params.uid,
                taskId: params.taskId,
                paymentId: error.metadata?.payment_id,
                errorCode: error.code,
                errorDescription: error.description,
                errorReason: error.reason,
            });
            reject(new Error(`Payment failed: ${error.description || 'the payment method was declined'}. Please try a different method.`));
        });

        rzp.open();
    });
}