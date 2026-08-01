// ─────────────────────────────────────────────────
// AAYODHYAM 2026 — official event phases.
// Single source of truth, shared by TimelinePage.tsx (full detail)
// and HomePage.tsx (preview). Update here and both pages stay in sync.
// ─────────────────────────────────────────────────
import { Megaphone, ClipboardList, Truck, FlaskConical, Award, Trophy, LucideIcon } from 'lucide-react';

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
        title: 'Publicity / Advertisement',
        dateRange: '3 Aug – 7 Aug 2026',
        description: 'Event announcement and outreach across participating colleges.',
        icon: Megaphone,
    },
    {
        number: 2,
        title: 'Registration',
        dateRange: '8 Aug – 10 Aug 2026',
        description: 'Teams register and select a problem statement.',
        icon: ClipboardList,
        highlight: true,
    },
    {
        number: 3,
        title: 'Material Dispatch',
        dateRange: '10 Aug – 14 Aug 2026',
        description: 'Specimen materials for each problem statement are dispatched to registered teams.',
        icon: Truck,
    },
    {
        number: 4,
        title: 'Material Processing',
        dateRange: '13 Aug 2026 onwards',
        description: 'In-house (WCE) students begin processing from 13 Aug; other teams begin from the day their material is received.',
        icon: FlaskConical,
    },
    {
        number: 5,
        title: 'Evaluation',
        dateRange: '18–19 Sep 2026',
        description: 'Jury evaluation for all teams. For 3 selected problem statements, a virtual assessment can be opted for on 17 Sep instead.',
        icon: Award,
    },
    {
        number: 6,
        title: 'Prize Distribution Ceremony',
        dateRange: '19 Sep 2026',
        description: 'Winners announced and prizes awarded.',
        icon: Trophy,
        highlight: true,
    },
];