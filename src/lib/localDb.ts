// ============================================================
// AAYODHYAM 2026 — Local Database Manager (IndexedDB / LocalStorage)
// Persistent client-side database fallback when Firestore is offline or unconfigured
// ============================================================

import { Registration, Submission, Announcement } from '@/lib/types';
import { DEFAULT_ANNOUNCEMENTS } from '@/lib/constants';

const REGISTRATIONS_KEY = 'aay_db_registrations_v1';
const SUBMISSIONS_KEY = 'aay_db_submissions_v1';
const ANNOUNCEMENTS_KEY = 'aay_db_announcements_v1';

// Seed sample registrations if empty
const INITIAL_REGISTRATIONS: Registration[] = [
  {
    id: 'demo-reg-1',
    registrationId: 'AAY-784920',
    teamName: 'FerroTech Innovators',
    leaderName: 'Rahul Sharma',
    leaderEmail: 'rahul.sharma@coep.ac.in',
    leaderPhone: '9876543210',
    member2: 'Priya Patel',
    member3: 'Amit Deshmukh',
    department: 'Metallurgy & Materials Engg',
    year: '3rd Year B.Tech',
    taskId: 1,
    taskTitle: 'Decarburization Zone Measurement',
    transactionId: 'UTR9823471029',
    paymentStatus: 'verified',
    uid: 'demo-user-1',
    totalFee: 500,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'demo-reg-2',
    registrationId: 'AAY-319402',
    teamName: 'Titanium Squad',
    leaderName: 'Sneha Kulkarni',
    leaderEmail: 'sneha.k@vnit.ac.in',
    leaderPhone: '9123456780',
    member2: 'Rohan Joshi',
    department: 'Materials Science',
    year: 'Final Year B.Tech',
    taskId: 3,
    taskTitle: 'Automated Grain Size Measurement (Python)',
    transactionId: 'UTR1203948571',
    paymentStatus: 'pending',
    uid: 'demo-user-2',
    wantsHomeDelivery: true,
    totalFee: 800,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
];

class LocalDatabase {
  private getStorage<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) return defaultValue;
      return JSON.parse(data) as T;
    } catch {
      return defaultValue;
    }
  }

  private setStorage<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  // ──────────────────────────────────────────
  // REGISTRATIONS
  // ──────────────────────────────────────────
  getRegistrations(): Registration[] {
    const regs = this.getStorage<Registration[]>(REGISTRATIONS_KEY, []);
    if (regs.length === 0) {
      this.setStorage(REGISTRATIONS_KEY, INITIAL_REGISTRATIONS);
      return INITIAL_REGISTRATIONS;
    }
    return regs;
  }

  getRegistrationByUid(uid: string): Registration | null {
    const regs = this.getRegistrations();
    return regs.find((r) => r.uid === uid || r.leaderEmail === uid) || null;
  }

  saveRegistration(data: Omit<Registration, 'id'>): string {
    const regs = this.getRegistrations();
    const id = `reg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newReg: Registration = { ...data, id };
    regs.unshift(newReg);
    this.setStorage(REGISTRATIONS_KEY, regs);
    return id;
  }

  updateRegistrationStatus(id: string, status: 'pending' | 'verified' | 'rejected'): void {
    const regs = this.getRegistrations();
    const index = regs.findIndex((r) => r.id === id || r.registrationId === id);
    if (index !== -1) {
      regs[index].paymentStatus = status;
      this.setStorage(REGISTRATIONS_KEY, regs);
    }
  }

  deleteRegistration(id: string): void {
    const regs = this.getRegistrations().filter((r) => r.id !== id && r.registrationId !== id);
    this.setStorage(REGISTRATIONS_KEY, regs);
  }

  getTaskRegistrationCounts(): Record<number, number> {
    const regs = this.getRegistrations();
    const counts: Record<number, number> = {};
    regs.forEach((r) => {
      counts[r.taskId] = (counts[r.taskId] || 0) + 1;
    });
    return counts;
  }

  // ──────────────────────────────────────────
  // SUBMISSIONS
  // ──────────────────────────────────────────
  getSubmissions(uid?: string): Submission[] {
    const subs = this.getStorage<Submission[]>(SUBMISSIONS_KEY, []);
    if (uid) {
      return subs.filter((s) => s.uid === uid);
    }
    return subs;
  }

  saveSubmission(data: Omit<Submission, 'id'>): string {
    const subs = this.getSubmissions();
    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newSub: Submission = { ...data, id };
    subs.unshift(newSub);
    this.setStorage(SUBMISSIONS_KEY, subs);
    return id;
  }

  updateSubmissionStatus(id: string, status: 'submitted' | 'under_review' | 'evaluated', score?: number, feedback?: string): void {
    const subs = this.getSubmissions();
    const index = subs.findIndex((s) => s.id === id);
    if (index !== -1) {
      subs[index].status = status;
      if (score !== undefined) subs[index].score = score;
      if (feedback !== undefined) subs[index].feedback = feedback;
      this.setStorage(SUBMISSIONS_KEY, subs);
    }
  }

  // ──────────────────────────────────────────
  // ANNOUNCEMENTS
  // ──────────────────────────────────────────
  getAnnouncements(): Announcement[] {
    const anns = this.getStorage<Announcement[]>(ANNOUNCEMENTS_KEY, []);
    if (anns.length === 0) {
      this.setStorage(ANNOUNCEMENTS_KEY, DEFAULT_ANNOUNCEMENTS);
      return DEFAULT_ANNOUNCEMENTS;
    }
    return anns;
  }

  saveAnnouncement(data: Omit<Announcement, 'id'>): string {
    const anns = this.getAnnouncements();
    const id = `ann_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newAnn: Announcement = { ...data, id };
    anns.unshift(newAnn);
    this.setStorage(ANNOUNCEMENTS_KEY, anns);
    return id;
  }

  deleteAnnouncement(id: string): void {
    const anns = this.getAnnouncements().filter((a) => a.id !== id);
    this.setStorage(ANNOUNCEMENTS_KEY, anns);
  }

  // ──────────────────────────────────────────
  // RESET / CLEAR ALL
  // ──────────────────────────────────────────
  clearAllData(): void {
    this.setStorage(REGISTRATIONS_KEY, []);
    this.setStorage(SUBMISSIONS_KEY, []);
    this.setStorage(ANNOUNCEMENTS_KEY, DEFAULT_ANNOUNCEMENTS);
  }
}

export const localDb = new LocalDatabase();
