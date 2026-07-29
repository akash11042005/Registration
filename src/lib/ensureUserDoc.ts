// ============================================================
// Ensures a users/{uid} Firestore document exists for the signed-in
// account. Called after every successful sign-up, sign-in, and Google
// sign-in in AuthContext.tsx. Safe to call repeatedly — it only ever
// creates the doc once (leaves createdAt alone on subsequent logins)
// and never overwrites fields like phone/collegeName/registrationStatus
// that api/payment/verify.ts fills in later once the user registers.
// ============================================================
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ADMIN_EMAILS } from '@/lib/constants';

export async function ensureUserDoc(params: {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
}) {
    const { uid, email, displayName, photoURL } = params;
    const ref = doc(db, 'users', uid);

    try {
        const snap = await getDoc(ref);
        if (snap.exists()) return; // already created — never overwrite existing profile data

        await setDoc(ref, {
            uid,
            fullName: displayName || email.split('@')[0],
            email,
            phone: null,
            collegeName: null,
            role: ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'participant',
            registrationStatus: 'not_registered',
            teamId: null,
            photoURL: photoURL || null,
            createdAt: new Date().toISOString(),
        });
    } catch (err) {
        // Never block sign-in on this — worst case the profile doc is created
        // a little later (e.g. next login) rather than right now.
        console.warn('Could not create/check users/{uid} doc:', err);
    }
}