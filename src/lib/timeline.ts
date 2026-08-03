// ─────────────────────────────────────────────────
// AAYODHYAM 2026 — official event phases.
// Single source of truth, shared by TimelinePage.tsx (full detail)
// and HomePage.tsx (preview). Update here and both pages stay in sync.
// ─────────────────────────────────────────────────
import { ClipboardList, Truck, FlaskConical, Award, Trophy, LucideIcon } from 'lucide-react';

export interface EventPhase {
    number: number;
    title: string;
    dateRange: string;
    description: string;
    icon: LucideIcon;
    highlight?: boolean;
}

export const EVENT_PHASES: EventPhase[] = [
    {
        number: 1,
        title: 'Registration',
        dateRange: '8 Aug – 10 Aug 2026',
        description: 'Teams register and select a problem statement.',
        icon: ClipboardList,
        highlight: true,
    },
    {
        number: 2,
        title: 'Material Dispatch',
        dateRange: '10 Aug – 14 Aug 2026',
        description: 'Specimen materials for each problem statement are dispatched to registered teams.',
        icon: Truck,
    },
    {
        number: 3,
        title: 'Material Processing',
        dateRange: '13 Aug 2026 onwards',
        description: 'Material processing will start from 13 August, or from the day the material is collected/received — whichever is later.',
        icon: FlaskConical,
    },
    {
        number: 4,
        title: 'Evaluation',
        dateRange: '18–19 Sep 2026',
        description: 'Evaluation will be held on 18th and 19th September. For selected problem statements, an online evaluation on 17th September can be opted for.',
        icon: Award,
    },
    {
        number: 5,
        title: 'Prize Distribution Ceremony',
        dateRange: '19 Sep 2026',
        description: 'Winners announced and prizes awarded.',
        icon: Trophy,
        highlight: true,
    },
];