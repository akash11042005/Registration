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
  collegeName: string;
  leaderYear: string;
  leaderBranch: string;
  member1Name?: string;
  member1Year?: string;
  member1Branch?: string;
  member2Name?: string;
  member2Year?: string;
  member2Branch?: string;
  taskId: number;
  taskTitle: string;
  transactionId: string;
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

// Firestore document at users/{uid}. Created on first sign-up/sign-in
// (see src/lib/ensureUserDoc.ts); phone/collegeName/registrationStatus/teamId
// get filled in once the user actually registers a team (see api/payment/verify.ts).
export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone?: string | null;
  collegeName?: string | null;
  role: UserRole;
  registrationStatus: 'not_registered' | 'registered';
  teamId?: string | null;
  photoURL?: string;
  createdAt: string;
}

// A Razorpay payment that was verified successfully but couldn't become a
// registration because the task's slots filled up in between — written by
// api/payment/verify.ts, resolved manually by an admin.
export interface PaymentIssue {
  id?: string;
  reason: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  registration: {
    teamName: string;
    leaderName: string;
    leaderEmail: string;
    collegeName: string;
    taskId: number;
    taskTitle: string;
  };
  totalFee: number;
  createdAt: unknown;
}