import React, { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import HeroCrystalLattice from '@/components/HeroCrystalLattice';
import {
  ArrowRight,
  ChevronRight,
  Users,
  FlaskConical,
  Trophy,
  Network,
  Microscope,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import CountdownTimer from '@/components/CountdownTimer';
import AnimatedCounter from '@/components/AnimatedCounter';
import { useRegistrationStats } from '@/hooks/useFirestore';
import { PROBLEM_STATEMENTS } from '@/lib/problemStatements';
import { cn } from '@/lib/utils';

const RULES_HIGHLIGHTS = [
  {
    icon: Users,
    title: 'Team Composition',
    desc: 'Maximum 3 students per team. A mix of disciplines is encouraged.',
    color: 'text-blue-600 bg-blue-50',
  },
  {
    icon: Clock,
    title: 'Task Slot Cap',
    desc: 'Maximum 8 teams per problem statement. First-come, first-served.',
    color: 'text-orange-600 bg-orange-50',
  },
  {
    icon: CheckCircle2,
    title: 'Registration Window',
    desc: 'Register before slots fill. Payment verification required for confirmation.',
    color: 'text-emerald-600 bg-emerald-50',
  },
  {
    icon: AlertTriangle,
    title: 'WCE Lab Policy',
    desc: 'Lab facilities are for final testing & microstructural evaluation only. Pre-processing must be done at your home institution.',
    color: 'text-red-600 bg-red-50',
  },
];

const WHY_PARTICIPATE = [
  {
    icon: FlaskConical,
    title: 'Real Industry Challenges',
    desc: 'Tackle authentic metallurgical problems drawn from active research and industry practice — not textbook exercises.',
  },
  {
    icon: Users,
    title: 'Expert Mentorship',
    desc: 'Work alongside experienced faculty, researchers, and industry professionals throughout the week.',
  },
  {
    icon: Trophy,
    title: 'Competitive Prize Pool',
    desc: 'Win cash prizes, certificates, and recognition across all five problem-statement tracks.',
  },
  {
    icon: Network,
    title: 'Cross-College Networking',
    desc: 'Connect with peers and faculty from engineering institutions across India.',
  },
];

// ─────────────────────────────────────────────────
// Timeline preview data
// ─────────────────────────────────────────────────
const TIMELINE_PREVIEW = [
  { day: 'Monday', date: 'Sep 14', event: 'Inauguration, Problem statement briefing & team kickoff', highlight: true },
  { day: 'Tuesday', date: 'Sep 15', event: 'Research & initial experimental setup at home institution' },
  { day: 'Wednesday', date: 'Sep 16', event: 'Progress review & methodology finalization' },
  { day: 'Thursday', date: 'Sep 17', event: 'WCE lab access: final testing & microstructural evaluation' },
  { day: 'Friday', date: 'Sep 18', event: 'Jury evaluation, presentations & prize distribution', highlight: true },
];

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.5 },
};

const stagger = {
  initial: {},
  whileInView: {},
  viewport: { once: true },
  transition: { staggerChildren: 0.1 },
};

const staggerItem = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

// ─────────────────────────────────────────────────
// Lattice SVG background
// ─────────────────────────────────────────────────
function LatticeSVG() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.09]" aria-hidden="true">
      <defs>
        <pattern id="lattice" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <circle cx="40" cy="40" r="2.4" fill="white" />
          <circle cx="0" cy="0" r="2.4" fill="white" />
          <circle cx="80" cy="0" r="2.4" fill="white" />
          <circle cx="0" cy="80" r="2.4" fill="white" />
          <circle cx="80" cy="80" r="2.4" fill="white" />
          <line x1="0" y1="0" x2="80" y2="80" stroke="white" strokeWidth="0.5" />
          <line x1="80" y1="0" x2="0" y2="80" stroke="white" strokeWidth="0.5" />
          <line x1="40" y1="0" x2="40" y2="80" stroke="white" strokeWidth="0.3" />
          <line x1="0" y1="40" x2="80" y2="40" stroke="white" strokeWidth="0.3" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#lattice)" />
    </svg>
  );
}

// ─────────────────────────────────────────────────
// Decorative metallurgy illustrations — a handful of small, thin-
// stroke line drawings (phase diagram, crystal lattice, grain
// boundary, atomic bonds) placed around the tensile specimen at very
// low opacity. Deliberately minimal and unconnected — no network
// mesh, no dots-and-lines linking everything together — so the hero
// stays clean and keeps its negative space rather than reading as
// cluttered background decoration.
// ─────────────────────────────────────────────────
function HeroConceptIllustrations() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none opacity-10 hidden sm:block"
      viewBox="0 0 700 600"
      fill="none"
      aria-hidden="true"
    >
      {/* Iron-Carbon phase diagram — bottom-left */}
      <g transform="translate(110,500)" stroke="#ffd166" strokeWidth="1.1">
        <line x1="-22" y1="20" x2="-22" y2="-20" />
        <line x1="-22" y1="20" x2="22" y2="20" />
        <path d="M -22 4 Q 0 -22 22 -6" fill="none" />
      </g>

      {/* BCC crystal structure — top-left */}
      <g transform="translate(95,120)" stroke="#ffd166" strokeWidth="1">
        <polygon points="-17,-11 9,-17 26,-4 0,2" fill="none" />
        <polygon points="-17,11 9,5 26,18 0,24" fill="none" />
        <line x1="-17" y1="-11" x2="-17" y2="11" />
        <line x1="9" y1="-17" x2="9" y2="5" />
        <line x1="26" y1="-4" x2="26" y2="18" />
        <line x1="0" y1="2" x2="0" y2="24" />
        <circle cx="4.5" cy="3" r="1.6" fill="#ffd166" stroke="none" />
      </g>

      {/* Grain boundary / atomic lattice — bottom-right */}
      <g transform="translate(600,490)" stroke="#ffd166" strokeWidth="1">
        <polygon points="0,-20 17,-10 17,10 0,20 -17,10 -17,-10" fill="none" />
        <polygon points="0,-20 17,-10 0,0 -17,-10" fill="none" opacity="0.6" />
      </g>

      {/* Atomic bonds — small molecule, top-right */}
      <g stroke="#ffd166" strokeWidth="1">
        <line x1="605" y1="140" x2="588" y2="123" />
        <line x1="605" y1="140" x2="624" y2="127" />
        <line x1="605" y1="140" x2="611" y2="160" />
        <circle cx="605" cy="140" r="2.8" fill="#ffd166" stroke="none" />
        <circle cx="588" cy="123" r="2" fill="#ffd166" stroke="none" />
        <circle cx="624" cy="127" r="2" fill="#ffd166" stroke="none" />
        <circle cx="611" cy="160" r="2" fill="#ffd166" stroke="none" />
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────
// Hero illustration wrapper — 3D BCC crystal lattice
// ─────────────────────────────────────────────────
function MaterialsIllustration() {
  return (
    <div className="relative w-full h-[420px] sm:h-[480px] lg:h-[540px]">
      <HeroConceptIllustrations />
      <HeroCrystalLattice />
    </div>
  );
}

// ─────────────────────────────────────────────────
// Home page
// ─────────────────────────────────────────────────
export default function HomePage() {
  const stats = useRegistrationStats();

  return (
    <PageTransition>
      {/* ── Hero ── */}
      <section className="relative min-h-screen gradient-navy overflow-hidden flex flex-col justify-center">
        <LatticeSVG />
        {/* Subtle gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gold-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-500/15 border border-gold-500/30 text-gold-400 text-xs font-semibold tracking-wider uppercase mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse-gold" />
                  National Hackathon 2026
                </span>

                <h1 className="text-display text-white mb-4 text-balance">
                  AAYODHYAM{' '}
                  <span className="gradient-text">2026</span>
                </h1>

                <p className="text-xl font-semibold text-metal-300 mb-3">
                  Metallurgy & Materials Innovation Hackathon
                </p>
                <p className="text-base text-metal-400 leading-relaxed mb-8 max-w-lg">
                  India's premier national-level mechanical engineering hackathon, hosted by the{' '}
                  <span className="text-white font-medium">Department of Mechanical Engineering</span>,{' '}
                  Walchand College of Engineering, Sangli.
                </p>

                <div className="flex flex-wrap gap-3 mb-10">
                  <Link to="/problem-statements" className="btn-gold px-7 py-3.5 text-base font-bold">
                    View Problem Statements
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link to="/timeline" className="btn-outline border-white/30 text-white hover:bg-white/10 hover:text-white px-7 py-3.5 text-base">
                    View Timeline
                  </Link>
                </div>

                {/* Quick meta */}
                <div className="flex flex-wrap gap-6 text-sm text-metal-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
                    On-Campus, WCE Sangli
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Sep 14–18, 2026
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    Open to all second year Engineering Students
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Right: illustration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="flex justify-center"
            >
              <MaterialsIllustration />
            </motion.div>
          </div>
        </div>

        {/* Countdown */}
        <div className="relative border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <p className="text-caption text-gold-400 mb-1">Event Begins In</p>
                <p className="text-sm text-metal-400">Monday, September 14, 2026 · 09:00 AM IST</p>
              </div>
              <CountdownTimer />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-white border-b border-metal-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Registered Teams', value: stats.total, suffix: '+' },
              { label: 'Problem Tracks', value: 5, suffix: '' },
              { label: 'Verified Teams', value: stats.verified, suffix: '' },
              { label: 'Pending Review', value: stats.pending, suffix: '' },
            ].map((stat) => (
              <motion.div key={stat.label} {...fadeInUp} className="text-center">
                <p className="text-headline text-navy-900 mb-1">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-sm text-metal-500 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Participate ── */}
      <section className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div {...fadeInUp}>
              <span className="section-label">Why Join AAYODHYAM</span>
              <h2 className="text-headline text-navy-900 mb-6">
                Where Engineering Meets Innovation
              </h2>
              <p className="text-body-lg text-metal-600 mb-8">
                AAYODHYAM 2026 is more than a competition — it's a week-long immersion into the forefront of materials science and mechanical engineering.
              </p>
              <div className="space-y-5">
                {WHY_PARTICIPATE.map((item) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.title}
                      {...fadeInUp}
                      className="flex gap-4"
                    >
                      <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-navy-700" />
                      </div>
                      <div>
                        <h4 className="font-bold text-navy-900 mb-1">{item.title}</h4>
                        <p className="text-sm text-metal-600 leading-relaxed">{item.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <Link to="/about" className="btn-primary mt-8">
                Learn More About the Event
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Rules highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {RULES_HIGHLIGHTS.map((rule) => {
                const Icon = rule.icon;
                return (
                  <motion.div key={rule.title} {...fadeInUp} className="card p-5">
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', rule.color)}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <h4 className="font-bold text-navy-900 text-sm mb-1.5">{rule.title}</h4>
                    <p className="text-xs text-metal-600 leading-relaxed">{rule.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Timeline preview ── */}
      <section className="section-padding bg-navy-950 relative overflow-hidden">
        <LatticeSVG />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <span className="section-label text-gold-400">Event Schedule</span>
            <h2 className="text-headline text-white mb-4">A Week of Discovery</h2>
            <p className="text-body-lg text-metal-400 max-w-xl mx-auto">
              Five intense days from Monday kickoff through Friday jury evaluation and prize distribution.
            </p>
          </motion.div>

          <div className="max-w-2xl mx-auto">
            {TIMELINE_PREVIEW.map((item, i) => (
              <motion.div
                key={item.day}
                {...fadeInUp}
                className="flex gap-4 mb-0"
              >
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10',
                    item.highlight
                      ? 'bg-gold-500 text-navy-950'
                      : 'bg-white/10 text-metal-300'
                  )}>
                    {i + 1}
                  </div>
                  {i < TIMELINE_PREVIEW.length - 1 && (
                    <div className="w-px flex-1 bg-white/10 my-1" />
                  )}
                </div>
                <div className={cn('pb-8', item.highlight && 'pb-8')}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-sm font-bold', item.highlight ? 'text-gold-400' : 'text-white')}>
                      {item.day}
                    </span>
                    <span className="text-xs text-metal-500">· {item.date}</span>
                  </div>
                  <p className="text-sm text-metal-400 leading-relaxed">{item.event}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-4">
            <Link to="/timeline" className="btn-outline border-white/20 text-white hover:bg-white/10 hover:text-white">
              Full Schedule <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Problem statements preview ── */}
      <section className="section-padding bg-metal-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="section-label">Problem Statements</span>
              <h2 className="text-headline text-navy-900">Featured Challenges</h2>
            </div>
            <Link to="/problem-statements" className="btn-outline whitespace-nowrap shrink-0">
              View All 10 Tasks <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PROBLEM_STATEMENTS.slice(0, 3).map((ps) => (
              <motion.div key={ps.id} {...fadeInUp} className="card-hover p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-bold text-metal-400">#{ps.id}</span>
                </div>
                <h3 className="font-bold text-navy-900 mb-2 leading-tight">{ps.title}</h3>
                <p className="text-sm text-metal-600 leading-relaxed line-clamp-2">{ps.objective}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {ps.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs text-metal-500 bg-metal-100 px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
                <Link
                  to="/problem-statements"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-navy-700 hover:text-navy-900 mt-4 transition-colors"
                >
                  View Details <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Organizer section ── */}
      <section className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <span className="section-label">Organized By</span>
            <h2 className="text-headline text-navy-900">Institution & Department</h2>
          </motion.div>
          <div className="flex flex-col md:flex-row gap-8 justify-center items-stretch max-w-3xl mx-auto">
            <motion.div {...fadeInUp} className="card flex-1 p-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-navy-50 flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-navy-700" />
              </div>
              <h3 className="font-bold text-navy-900 mb-2">Walchand College of Engineering</h3>
              <p className="text-sm text-metal-500">Vishrambag, Sangli, Maharashtra – 416415</p>
              <p className="text-xs text-metal-400 mt-1">Autonomous Institute | NAAC Grade A</p>
            </motion.div>
            <motion.div {...fadeInUp} className="card flex-1 p-8 text-center border-gold-200">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gold-50 flex items-center justify-center mb-4">
                <Microscope className="w-8 h-8 text-gold-600" />
              </div>
              <h3 className="font-bold text-navy-900 mb-2">Dept. of Mechanical Engineering</h3>
              <p className="text-sm text-metal-500">metallurgy@walchandsangli.ac.in</p>
              <p className="text-xs text-metal-400 mt-1">Hosting AAYODHYAM 2026</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FAQ preview ── */}
      <section className="section-padding bg-metal-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-10">
            <span className="section-label">FAQs</span>
            <h2 className="text-headline text-navy-900">Quick Answers</h2>
          </motion.div>
          <div className="space-y-3">
            {[
              { q: 'Who can participate?', a: 'Engineering students (B.Tech / M.Tech) from any recognized college across India. Teams of 1–3 members.' },
              { q: 'What happens at WCE lab?', a: 'WCE lab facilities are exclusively for final testing and microstructural evaluation during the jury round. All heat treatment and specimen pre-processing must be done at your home institution.' },
              { q: 'How many teams per problem statement?', a: 'Maximum 8 teams per problem statement, allocated on a first-come, first-served basis.' },
              { q: 'Is there a registration fee?', a: 'Yes. A nominal registration fee applies. Details are shown during the registration process.' },
            ].map((faq) => (
              <motion.div key={faq.q} {...fadeInUp} className="card p-5">
                <h4 className="font-bold text-navy-900 text-sm mb-2">{faq.q}</h4>
                <p className="text-sm text-metal-600 leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/faqs" className="btn-primary">
              See All FAQs <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="bg-gold-500 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-headline text-navy-950 mb-4">Ready to Compete?</h2>
            <p className="text-lg text-navy-800 mb-8 max-w-xl mx-auto">
              Secure your slot today. Problem statement slots are limited to 8 teams each — don't miss out.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/problem-statements" className="btn-primary bg-navy-900 text-white hover:bg-navy-950 px-8 py-4 text-base">
                Choose a Problem Statement
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/contact" className="btn-ghost text-navy-800 hover:bg-navy-900/10 px-8 py-4 text-base">
                Contact Organizers
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </PageTransition>
  );
}