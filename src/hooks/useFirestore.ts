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
  setDoc,
  addDoc,
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
// Registration open/close control — a single Firestore doc
// (settings/registrationControl) gates the /register page for
// everyone. `opensAt` is the scheduled auto-open time; the page
// flips open the instant a live clock passes it, no redeploy or
// manual action needed. `manuallyClosed` is the admin's own kill
// switch, independent of the schedule — e.g. to pause registration
// early if every task fills up, or to delay opening past the
// scheduled time without touching the date itself.
// ─────────────────────────────────────────────────
export interface RegistrationControl {
  opensAt: string; // ISO 8601, e.g. '2026-08-08T08:08:00+05:30'
  manuallyClosed: boolean;
  // Force-open override — makes registration accessible immediately
  // regardless of `opensAt`, without changing the scheduled date itself.
  // manuallyClosed always wins if both are somehow true (safety default).
  manuallyOpened: boolean;
}

// Default used only if the settings doc hasn't been created yet in
// Firestore — 8:08 AM IST, August 8, 2026 (chosen to give enough buffer
// after domain/DNS setup, with the 8/8 date reflected in the time too).
const DEFAULT_REGISTRATION_CONTROL: RegistrationControl = {
  opensAt: '2026-08-08T08:08:00+05:30',
  manuallyClosed: false,
  manuallyOpened: false,
};

// Public read — every visitor (signed in or not) needs this to know
// whether to show the registration form or the "opens soon" screen.
export function useRegistrationControl() {
  return useQuery({
    queryKey: ['registrationControl'],
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'settings', 'registrationControl'));
      if (!snap.exists()) return DEFAULT_REGISTRATION_CONTROL;
      return { ...DEFAULT_REGISTRATION_CONTROL, ...(snap.data() as Partial<RegistrationControl>) };
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

// Admin-only mutation (enforced by firestore.rules: settings/{id} write
// requires isAdmin()) — used by the toggle in AdminDashboardPage.tsx.
export function useUpdateRegistrationControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fields: Partial<RegistrationControl>) => {
      await setDoc(doc(db, 'settings', 'registrationControl'), fields, { merge: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registrationControl'] });
    },
  });
}

// ─────────────────────────────────────────────────
// Announcements — reads/writes Firestore directly, same reliable
// pattern as everything else in this file. Previously this went
// through fetch('/api/announcements'), but no such endpoint is
// ever deployed to Vercel (only a local-dev-only Express server
// under /server has that route, which never ships to production).
// That meant the call 404'd for every real visitor and silently
// fell back to whatever was cached in THEIR OWN browser's local
// storage — so a new announcement only ever appeared on the exact
// device it was created from, never synced to anyone else. The
// `announcements` Firestore collection (public read, admin write)
// was already set up in firestore.rules — this just actually uses it.
// ─────────────────────────────────────────────────
export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Announcement);
    },
    staleTime: 5_000,
  });
}

// ─────────────────────────────────────────────────
// Registrations
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

export function useFailedPaymentAttempts() {
  return useQuery({
    queryKey: ['failedPaymentAttempts'],
    queryFn: async () => {
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
      const regRef = doc(db, 'registrations', id);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(regRef);
        if (!snap.exists()) return;

        const current = snap.data() as Registration;
        const needsCountDecrement = current.paymentStatus !== 'rejected';
        const taskCountRef = doc(db, 'taskCounts', String(current.taskId));
        const countSnap = needsCountDecrement ? await tx.get(taskCountRef) : null;

        tx.delete(regRef);

        if (needsCountDecrement && countSnap) {
          const currentCount = countSnap.exists() ? (countSnap.data() as { count?: number }).count || 0 : 0;
          tx.set(taskCountRef, { count: Math.max(0, currentCount - 1) }, { merge: true });
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

// Fields a team may edit themselves, before REGISTRATION_EDIT_DEADLINE.
// Must match the allowlist in firestore.rules exactly.
export type EditableRegistrationFields = Partial<
  Pick<
    Registration,
    | 'teamName'
    | 'leaderPhone'
    | 'collegeName'
    | 'leaderYear'
    | 'leaderBranch'
    | 'member1Name'
    | 'member1Year'
    | 'member1Branch'
    | 'member2Name'
    | 'member2Year'
    | 'member2Branch'
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
// Payment issues
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
// Announcement mutations — write directly to Firestore
// (admin-only, enforced by firestore.rules: announcements/{id}
// write requires isAdmin()).
// ─────────────────────────────────────────────────
export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Announcement, 'id'>) => {
      await addDoc(collection(db, 'announcements'), data);
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
      await deleteDoc(doc(db, 'announcements', id));
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