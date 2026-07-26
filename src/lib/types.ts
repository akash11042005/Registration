// ============================================================
// Firestore collection types
// ============================================================

export type PaymentStatus = 'pending' | 'verified' | 'rejected';
export type SubmissionStatus = 'submitted' | 'under_review' | 'evaluated';
export type AnnouncementCategory = 'Rule' | 'Schedule' | 'Venue' | 'General';
export type UserRole = 'participant' | 'judge' | 'admin';

export interface Registration {
  id?: string;                    // Firestore document ID
  registrationId: string;         // AAY-XXXXXX
  teamName: string;
  leaderName: string;
  leaderEmail: string;
  leaderPhone: string;
  member2?: string;
  member3?: string;
  department: string;
  year: string;
  taskId: number;
  taskTitle: string;
  transactionId: string;
  paymentScreenshotUrl?: string;
  paymentStatus: PaymentStatus;
  uid: string;
  wantsHomeDelivery?: boolean;
  totalFee?: number;
  createdAt: string;              // ISO timestamp
  createdAtServer?: unknown;      // Firestore server timestamp
}

export interface Submission {
  id?: string;
  teamId?: string;
  teamName: string;
  taskId: number;
  title: string;
  description: string;
  fileUrl?: string;
  fileName?: string;
  codeSnippet?: string;
  uid: string;
  submittedAt: string;
  status: SubmissionStatus;
  score?: number;
  feedback?: string;
}

export interface Announcement {
  id?: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  important: boolean;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  photoURL?: string;
}
