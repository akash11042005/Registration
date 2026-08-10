// ============================================================
// Shared transaction: creates the registration + payment +
// user-profile update atomically. Called from BOTH verify.ts
// (the normal browser-driven path) and webhook.ts (the safety
// net that fires from Razorpay's servers regardless of what
// happens in the student's browser). Keeping this in one place
// means the two paths can never drift apart or double-write.
// ============================================================
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';

const MAX_TEAMS_PER_TASK = 8;

export interface RegistrationInput {
    teamName: string;
    leaderName: string;
    leaderEmail: string;
    leaderPhone: string;
    collegeName: string;
    leaderYear: string;
    member1Name?: string | null;
    member1Year?: string | null;
    member2Name?: string | null;
    member2Year?: string | null;
    mentorName?: string | null;
    mentorEmail?: string | null;
    mentorPhone?: string | null;
    taskId: number;
    taskTitle: string;
    uid: string;
    wantsHomeDelivery?: boolean;
}

export function isValidRegistration(x: unknown): x is RegistrationInput {
    if (!x || typeof x !== 'object') return false;
    const r = x as Record<string, unknown>;
    return (
        typeof r.teamName === 'string' &&
        typeof r.leaderName === 'string' &&
        typeof r.leaderEmail === 'string' &&
        typeof r.leaderPhone === 'string' &&
        typeof r.collegeName === 'string' &&
        typeof r.leaderYear === 'string' &&
        typeof r.taskId === 'number' &&
        typeof r.uid === 'string'
    );
}

export type CompleteRegistrationResult =
    | { type: 'success'; docData: Record<string, unknown>; regDocId: string }
    | { type: 'duplicate_payment'; registration: Record<string, unknown> }
    | { type: 'duplicate_user_reg'; existingRegistrationId: string }
    | { type: 'full' };

export async function completeRegistration(
    db: Firestore,
    params: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        registration: RegistrationInput;
        totalFee: number;
        paymentMethod: string | undefined;
        holdId?: string | null;
    }
): Promise<CompleteRegistrationResult> {
    const { razorpay_order_id, razorpay_payment_id, registration, totalFee, paymentMethod, holdId } = params;

    const registrationsRef = db.collection('registrations');
    const taskCountRef = db.collection('taskCounts').doc(String(registration.taskId));
    const holdRef = holdId ? db.collection('slotHolds').doc(holdId) : null;
    const paymentRef = db.collection('payments').doc(razorpay_payment_id);
    const userRef = db.collection('users').doc(registration.uid);

    const createdAtIso = new Date().toISOString();
    const baseDocData = {
        teamName: registration.teamName.trim(),
        leaderName: registration.leaderName.trim(),
        leaderEmail: registration.leaderEmail.trim(),
        leaderPhone: registration.leaderPhone.trim(),
        collegeName: registration.collegeName.trim(),
        leaderYear: registration.leaderYear.trim(),
        member1Name: registration.member1Name?.trim() || null,
        member1Year: registration.member1Year?.trim() || null,
        member2Name: registration.member2Name?.trim() || null,
        member2Year: registration.member2Year?.trim() || null,
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

    const newRegRef = registrationsRef.doc();
    let finalDocData: typeof baseDocData & { registrationId: string } = { ...baseDocData, registrationId: '' };

    const result = await db.runTransaction(async (tx) => {
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

        tx.set(paymentRef, {
            paymentId: razorpay_payment_id,
            transactionId: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
            gatewayResponse: { status: 'captured', method: paymentMethod || null, amount: totalFee, currency: 'INR' },
            amount: totalFee,
            uid: registration.uid,
            teamId: newRegRef.id,
            status: 'captured',
            createdAt: createdAtIso,
            createdAtServer: FieldValue.serverTimestamp(),
        });

        tx.set(userRef, {
            phone: registration.leaderPhone,
            collegeName: registration.collegeName,
            registrationStatus: 'registered',
            teamId: newRegRef.id,
        }, { merge: true });

        return { type: 'success' as const };
    });

    if (result.type === 'success') {
        return { type: 'success', docData: finalDocData, regDocId: newRegRef.id };
    }
    return result;
}