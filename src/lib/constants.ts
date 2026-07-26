// ============================================================
// AAYODHYAM 2026 — Global Constants
// ============================================================

// Event start date/time — edit this single constant to update all countdown timers
export const EVENT_START_DATE = new Date('2026-09-14T09:00:00+05:30'); // Monday 09:00 AM IST
export const EVENT_END_DATE   = new Date('2026-09-18T17:00:00+05:30'); // Friday 5:00 PM IST

// Registration fee (INR)
export const BASE_REGISTRATION_FEE = 500;
export const HOME_DELIVERY_ADDON_FEE = 300;

// UPI payment config
export const UPI_ID   = 'metallurgy@walchandsangli.ac.in';
export const UPI_PAYEE_NAME = 'AAYODHYAM 2026 WCE';
export const UPI_TRANSACTION_NOTE = 'AAYODHYAM2026 Registration Fee';

// Task slots — max teams per problem statement
export const MAX_TEAMS_PER_TASK = 5;

// Admin email allowlist (add multiple organizer/admin emails here)
export const ADMIN_EMAILS: string[] = [
  'metallurgy@walchandsangli.ac.in',
  'admin@aayodhyam2026.in',
  // Add more admin emails here
];

// Organization info
export const ORG = {
  name: 'Department of Metallurgy & Materials Engineering',
  college: 'Walchand College of Engineering',
  location: 'Vishrambag, Sangli, Maharashtra – 416415',
  email: 'metallurgy@walchandsangli.ac.in',
  website: 'https://walchandsangli.ac.in',
  phone: '+91-233-2304000',
} as const;

// Default fallback announcements shown when Firestore collection is empty
export const DEFAULT_ANNOUNCEMENTS = [
  {
    id: 'default-1',
    title: '🎉 Registrations Now Open!',
    content: 'AAYODHYAM 2026 registrations are officially open. Register your team before slots fill up!',
    category: 'General' as const,
    important: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'default-2',
    title: '🔬 WCE Lab Usage Policy',
    content: 'Lab facilities are available for final testing & microstructural evaluation only during jury rounds. Heat treatment and specimen pre-processing must be completed at your home institution.',
    category: 'Rule' as const,
    important: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'default-3',
    title: '📅 Evaluation Schedule Released',
    content: 'Jury evaluations are scheduled for Friday, September 18. Full schedule available on the Timeline page.',
    category: 'Schedule' as const,
    important: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'default-4',
    title: '🏆 Prize Pool Announced',
    content: 'AAYODHYAM 2026 features a prize pool with awards across all categories. Details coming soon!',
    category: 'General' as const,
    important: false,
    createdAt: new Date().toISOString(),
  },
];
