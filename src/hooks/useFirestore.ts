import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/lib/localDb';
import { Registration, Submission, Announcement } from '@/lib/types';
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
// ─────────────────────────────────────────────────
export function useRegistrations() {
  return useQuery({
    queryKey: ['registrations'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/registrations');
        if (res.ok) {
          return (await res.json()) as Registration[];
        }
      } catch (e) {
        console.warn('Backend server registrations fallback:', e);
      }
      return localDb.getRegistrations();
    },
    staleTime: 3_000,
  });
}

export function useRegistrationByUid(uid: string | undefined) {
  return useQuery({
    queryKey: ['registration', uid],
    queryFn: async () => {
      if (!uid) return null;
      try {
        const res = await fetch('/api/registrations/my', {
          headers: getAuthHeader(),
        });
        if (res.ok) {
          const data = await res.json();
          if (data) return data as Registration;
        }
      } catch (e) {
        console.warn('Backend server registration lookup fallback:', e);
      }
      return localDb.getRegistrationByUid(uid);
    },
    enabled: !!uid,
    staleTime: 3_000,
  });
}

// Live registration count per task
export function useTaskRegistrationCounts() {
  const { data: regs } = useRegistrations();

  const counts: Record<number, number> = {};
  if (regs) {
    regs.forEach((r) => {
      counts[r.taskId] = (counts[r.taskId] || 0) + 1;
    });
  }
  return counts;
}

// Live registration stats (total, verified, pending, rejected)
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

// ─────────────────────────────────────────────────
// Registration mutations
// ─────────────────────────────────────────────────
export function useCreateRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Registration, 'id'>) => {
      localDb.saveRegistration(data);

      try {
        const res = await fetch('/api/registrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const created = await res.json();
          return created.id || created.registrationId;
        }
      } catch (e) {
        console.warn('Backend server registration creation error:', e);
      }
      return data.registrationId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registrations'] });
      qc.invalidateQueries({ queryKey: ['registration'] });
    },
  });
}

export function useUpdateRegistrationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'pending' | 'verified' | 'rejected' }) => {
      localDb.updateRegistrationStatus(id, status);

      try {
        await fetch(`/api/registrations/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({ status }),
        });
      } catch (e) {
        console.warn('Backend update status error:', e);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registrations'] });
      qc.invalidateQueries({ queryKey: ['registration'] });
    },
  });
}

export function useDeleteRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      localDb.deleteRegistration(id);

      try {
        await fetch(`/api/registrations/${id}`, {
          method: 'DELETE',
          headers: getAuthHeader(),
        });
      } catch (e) {
        console.warn('Backend delete registration error:', e);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registrations'] });
      qc.invalidateQueries({ queryKey: ['registration'] });
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
