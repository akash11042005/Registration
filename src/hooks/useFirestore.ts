import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  increment,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { localDb } from '@/lib/localDb';
import { Registration, Submission, Announcement, PaymentIssue } from '@/lib/types';
import { DEFAULT_ANNOUNCEMENTS } from '@/lib/constants';

// Helper for Authorization Headers
function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('aay_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─────────────────────────────────────────────────
// Announcements
// ─────────────────────────────────────────────────
export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/announcements');
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) return data as Announcement[];
        }
      } catch (e) {
        console.warn('Backend server announcements fallback:', e);
      }
      return localDb.getAnnouncements();
    },
    staleTime: 5_000,
  });
}

// ─────────────────────────────────────────────────
// Registrations
//
// IMPORTANT: this now reads/writes real Firestore, not the local
// Express server or localStorage. Registration DOCUMENTS are only
// ever created server-side, by api/payment/verify.ts, after a
// verified Razorpay payment — Firestore rules deny client-side
// `create` on this collection entirely (see firestore.rules).
// Admins may still update paymentStatus directly from the dashboard.
// ─────────────────────────────────────────────────

// Admin-only: all registrations, most recent first
export function useRegistrations() {
  return useQuery({
    queryKey: ['registrations'],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, 'registrations'), orderBy('createdAt', 'desc')));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Registration);
    },
    staleTime: 3_000,
  });
}

// The current user's own registration, if any
export function useRegistrationByUid(uid: string | undefined) {
  return useQuery({
    queryKey: ['registration', uid],
    queryFn: async () => {
      if (!uid) return null;
      const snap = await getDocs(
        query(collection(db, 'registrations'), where('uid', '==', uid), limit(1))
      );
      if (snap.empty) return null;
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as Registration;
    },
    enabled: !!uid,
    staleTime: 3_000,
  });
}

// Live slot counts per problem statement — reads the public `taskCounts`
// aggregate collection (safe for anyone to read, including signed-out
// visitors browsing Problem Statements) rather than the full registrations
// collection, which regular users can no longer read per the new rules.
// Each doc has two fields: `count` (confirmed registrations) and `held`
// (active 2-minute checkout reservations — see api/payment/reserve-slot.ts).
// The number shown to users is the SUM of both, so a nearly-full task
// doesn't look falsely available just because someone else is mid-payment.
export function useTaskRegistrationCounts() {
  const { data } = useQuery({
    queryKey: ['taskCounts'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'taskCounts'));
      const counts: Record<number, number> = {};
      snap.docs.forEach((d) => {
        const data = d.data() as { taskId?: number; count?: number; held?: number };
        const taskId = data.taskId ?? Number(d.id);
        counts[taskId] = (data.count || 0) + Math.max(0, data.held || 0);
      });
      return counts;
    },
    staleTime: 3_000,
  });
  return data || {};
}

// Live registration stats (total, verified, pending, rejected) — admin only
export function useRegistrationStats() {
  const { data: regs = [] } = useRegistrations();

  let total = 0, verified = 0, pending = 0, rejected = 0;
  regs.forEach((r) => {
    total++;
    if (r.paymentStatus === 'verified') verified++;
    else if (r.paymentStatus === 'rejected') rejected++;
    else pending++;
  });

  return { total, verified, pending, rejected };
}

// Admin-only: per-task breakdown of confirmed vs currently-held (2-minute
// checkout reservation) slots — same source data as useTaskRegistrationCounts,
// but returned separately so the admin dashboard can show "3 confirmed + 1
// reserved" instead of a single combined number.
export function useTaskCountsDetailed() {
  return useQuery({
    queryKey: ['taskCountsDetailed'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'taskCounts'));
      const result: Record<number, { count: number; held: number }> = {};
      snap.docs.forEach((d) => {
        const data = d.data() as { taskId?: number; count?: number; held?: number };
        const taskId = data.taskId ?? Number(d.id);
        result[taskId] = { count: data.count || 0, held: Math.max(0, data.held || 0) };
      });
      return result;
    },
    staleTime: 3_000,
  });
}

// Admin-only: payments that did NOT succeed (declined, or the user closed
// the checkout popup) — see api/payment/log-attempt.ts. Purely informational,
// helps answer "why didn't this person finish registering."
export function useFailedPaymentAttempts() {
  return useQuery({
    queryKey: ['failedPaymentAttempts'],
    queryFn: async () => {
      // Sorted client-side rather than via orderBy() to avoid requiring a
      // Firestore composite index just for this admin-only, low-volume view.
      const snap = await getDocs(query(collection(db, 'payments'), where('status', 'in', ['failed', 'cancelled'])));
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as { id: string; createdAt?: string })
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    },
    staleTime: 5_000,
  });
}

// ─────────────────────────────────────────────────
// Registration mutations (admin only — see firestore.rules)
// ─────────────────────────────────────────────────
export function useUpdateRegistrationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'pending' | 'verified' | 'rejected' }) => {
      const regRef = doc(db, 'registrations', id);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(regRef);
        if (!snap.exists()) throw new Error('Registration not found');

        const current = snap.data() as Registration;
        const prevStatus = current.paymentStatus;

        tx.update(regRef, { paymentStatus: status });

        // Rejecting a previously-held slot frees it up; reversing a rejection
        // occupies it again. Verified <-> pending transitions don't change
        // slot occupancy — only "rejected" ever releases a slot.
        if (prevStatus !== 'rejected' && status === 'rejected') {
          tx.set(doc(db, 'taskCounts', String(current.taskId)), { count: increment(-1) }, { merge: true });
        } else if (prevStatus === 'rejected' && status !== 'rejected') {
          tx.set(doc(db, 'taskCounts', String(current.taskId)), { count: increment(1) }, { merge: true });
        }
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registrations'] });
      qc.invalidateQueries({ queryKey: ['registration'] });
      qc.invalidateQueries({ queryKey: ['taskCounts'] });
    },
  });
}

export function useDeleteRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Read first so we can decrement the matching public slot counter.
      const snap = await getDoc(doc(db, 'registrations', id));
      const taskId = snap.exists() ? (snap.data() as Registration).taskId : undefined;

      await deleteDoc(doc(db, 'registrations', id));

      if (taskId !== undefined) {
        await updateDoc(doc(db, 'taskCounts', String(taskId)), { count: increment(-1) }).catch(() => {
          // Counter doc may not exist in edge cases — safe to ignore.
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registrations'] });
      qc.invalidateQueries({ queryKey: ['registration'] });
      qc.invalidateQueries({ queryKey: ['taskCounts'] });
    },
  });
}

// Fields a team may edit themselves, before REGISTRATION_EDIT_DEADLINE.
// Must match the allowlist in firestore.rules exactly.
export type EditableRegistrationFields = Partial<
  Pick<
    Registration,
    | 'teamName'
    | 'leaderPhone'
    | 'collegeName'
    | 'member1Name'
    | 'member2Name'
    | 'mentorName'
    | 'mentorEmail'
    | 'mentorPhone'
  >
>;

export function useUpdateRegistrationDetails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: EditableRegistrationFields }) => {
      await updateDoc(doc(db, 'registrations', id), fields);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registration'] });
      qc.invalidateQueries({ queryKey: ['registrations'] });
    },
  });
}

// ─────────────────────────────────────────────────
// Payment issues — payments that were verified by Razorpay but
// couldn't be turned into a registration because the task filled
// up in between (see api/payment/verify.ts). Admin-only; needs
// manual resolution (refund via Razorpay dashboard, or reassign
// the team to a different task and register them by hand).
// ─────────────────────────────────────────────────
export function usePaymentIssues() {
  return useQuery({
    queryKey: ['paymentIssues'],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, 'payment_issues'), orderBy('createdAt', 'desc')));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PaymentIssue);
    },
    staleTime: 5_000,
  });
}

export function useResolvePaymentIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'payment_issues', id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paymentIssues'] });
    },
  });
}

// ─────────────────────────────────────────────────
// Submissions
// ─────────────────────────────────────────────────
export function useSubmissionsByUid(uid: string | undefined) {
  return useQuery({
    queryKey: ['submissions', uid],
    queryFn: async () => {
      if (!uid) return [];
      try {
        const res = await fetch(`/api/submissions?uid=${encodeURIComponent(uid)}`);
        if (res.ok) {
          return (await res.json()) as Submission[];
        }
      } catch (e) {
        console.warn('Backend submissions lookup fallback:', e);
      }
      return localDb.getSubmissions(uid);
    },
    enabled: !!uid,
    staleTime: 3_000,
  });
}

export function useAllSubmissions() {
  return useQuery({
    queryKey: ['submissions', 'all'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/submissions');
        if (res.ok) {
          return (await res.json()) as Submission[];
        }
      } catch (e) {
        console.warn('Backend all submissions lookup fallback:', e);
      }
      return localDb.getSubmissions();
    },
    staleTime: 3_000,
  });
}

export function useCreateSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Submission, 'id'>) => {
      localDb.saveSubmission(data);

      try {
        const res = await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const created = await res.json();
          return created.id;
        }
      } catch (e) {
        console.warn('Backend submission create error:', e);
      }
      return `sub_${Date.now()}`;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['submissions', vars.uid] });
      qc.invalidateQueries({ queryKey: ['submissions', 'all'] });
    },
  });
}

export function useUpdateSubmissionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, score, feedback }: { id: string; status: 'submitted' | 'under_review' | 'evaluated'; score?: number; feedback?: string }) => {
      localDb.updateSubmissionStatus(id, status, score, feedback);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
}

// ─────────────────────────────────────────────────
// Announcement mutations (admin)
// ─────────────────────────────────────────────────
export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Announcement, 'id'>) => {
      localDb.saveAnnouncement(data);

      try {
        await fetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(data),
        });
      } catch (e) {
        console.warn('Backend announcement create error:', e);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      localDb.deleteAnnouncement(id);

      try {
        await fetch(`/api/announcements/${id}`, {
          method: 'DELETE',
          headers: getAuthHeader(),
        });
      } catch (e) {
        console.warn('Backend announcement delete error:', e);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

// ─────────────────────────────────────────────────
// File upload helper
// ─────────────────────────────────────────────────
export async function uploadFile(file: File, _path: string): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      return data.url;
    }
  } catch (e) {
    console.warn('Backend upload error, falling back to data URL:', e);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────────
// Nuclear admin actions
// ─────────────────────────────────────────────────
export async function clearAllRegistrationsAndSubmissions() {
  localDb.clearAllData();
  try {
    await fetch('/api/admin/clear-all', { method: 'POST', headers: getAuthHeader() });
  } catch (e) {
    console.warn('Backend clear all error:', e);
  }
}