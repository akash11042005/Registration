import React, { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronRight,
  Users,
  FlaskConical,
  Trophy,
  Network,
  Microscope,
  Flame,
  Dumbbell,
  Atom,
  BrainCircuit,
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

// ─────────────────────────────────────────────────
// Track category cards data
// ─────────────────────────────────────────────────
const TRACKS = [
  {
    icon: Microscope,
    label: 'Metallography',
    color: 'from-blue-50 to-blue-100 border-blue-200',
    iconColor: 'text-blue-600',
    accent: 'bg-blue-600',
    count: PROBLEM_STATEMENTS.filter(p => p.category === 'Metallography').length,
    description: 'Microstructural characterization, grain analysis, and quantitative metallography techniques.',
  },
  {
    icon: Flame,
    label: 'Heat Treatment',
    color: 'from-orange-50 to-orange-100 border-orange-200',
    iconColor: 'text-orange-600',
    accent: 'bg-orange-600',
    count: PROBLEM_STATEMENTS.filter(p => p.category === 'Heat Treatment').length,
    description: 'Quenching, tempering, annealing, and hardenability characterization.',
  },
  {
    icon: Dumbbell,
    label: 'Mechanical Testing',
    color: 'from-purple-50 to-purple-100 border-purple-200',
    iconColor: 'text-purple-600',
    accent: 'bg-purple-600',
    count: PROBLEM_STATEMENTS.filter(p => p.category === 'Mechanical Testing').length,
    description: 'Tensile testing, strain ageing, impact toughness, and deformation behavior.',
  },
  {
    icon: Atom,
    label: 'Phase Transformations',
    color: 'from-emerald-50 to-emerald-100 border-emerald-200',
    iconColor: 'text-emerald-600',
    accent: 'bg-emerald-600',
    count: PROBLEM_STATEMENTS.filter(p => p.category === 'Phase Transformations').length,
    description: 'Grain refinement, overheating effects, and thermomechanical processing.',
  },
  {
    icon: BrainCircuit,
    label: 'Computation & AI',
    color: 'from-navy-50 to-navy-100 border-navy-200',
    iconColor: 'text-navy-600',
    accent: 'bg-navy-600',
    count: PROBLEM_STATEMENTS.filter(p => p.category === 'Computation & AI').length,
    description: 'Python/OpenCV pipelines, automated image analysis, and AI-assisted materials evaluation.',
  },
];

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
    desc: 'Maximum 5 teams per problem statement. First-come, first-served.',
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
    <svg className="absolute inset-0 w-full h-full opacity-[0.06]" aria-hidden="true">
      <defs>
        <pattern id="lattice" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <circle cx="30" cy="30" r="2" fill="white" />
          <circle cx="0" cy="0" r="2" fill="white" />
          <circle cx="60" cy="0" r="2" fill="white" />
          <circle cx="0" cy="60" r="2" fill="white" />
          <circle cx="60" cy="60" r="2" fill="white" />
          <line x1="0" y1="0" x2="60" y2="60" stroke="white" strokeWidth="0.5" />
          <line x1="60" y1="0" x2="0" y2="60" stroke="white" strokeWidth="0.5" />
          <line x1="30" y1="0" x2="30" y2="60" stroke="white" strokeWidth="0.3" />
          <line x1="0" y1="30" x2="60" y2="30" stroke="white" strokeWidth="0.3" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#lattice)" />
    </svg>
  );
}

// ─────────────────────────────────────────────────
// Crystal / micrograph illustration SVG
// ─────────────────────────────────────────────────
function MaterialsIllustration() {
  return (
    <div className="relative w-full max-w-lg mx-auto aspect-square">
      <motion.div
        animate={{ rotate: [0, 2, -2, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="w-full h-full"
      >
        <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
          {/* Background circle */}
          <circle cx="200" cy="200" r="190" fill="url(#bgGrad)" />
          <defs>
            <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2d35a4" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0f1230" stopOpacity="0.6" />
            </radialGradient>
          </defs>

          {/* Grain boundary simulation — Voronoi-inspired polygons */}
          <polygon points="200,50 280,120 260,220 170,240 110,170 140,80" fill="none" stroke="#d4a017" strokeWidth="1.5" strokeOpacity="0.6" />
          <polygon points="280,120 350,100 380,200 310,260 260,220" fill="none" stroke="#d4a017" strokeWidth="1" strokeOpacity="0.4" />
          <polygon points="110,170 50,200 70,300 170,320 200,240 140,220" fill="none" stroke="#d4a017" strokeWidth="1" strokeOpacity="0.4" />
          <polygon points="200,240 260,220 310,260 300,340 220,360 160,310 170,240" fill="none" stroke="#d4a017" strokeWidth="1.5" strokeOpacity="0.5" />
          <polygon points="140,80 200,50 260,80 280,120 200,120 140,100" fill="none" stroke="#facc15" strokeWidth="1" strokeOpacity="0.3" />

          {/* Crystal atoms */}
          {[
            [200, 50], [280, 120], [260, 220], [200, 240], [170, 240], [110, 170], [140, 80],
            [350, 100], [380, 200], [310, 260], [50, 200], [70, 300], [170, 320], [300, 340], [220, 360], [160, 310]
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="5" fill="#facc15" fillOpacity="0.8" />
          ))}

          {/* Inner lattice structure */}
          <circle cx="200" cy="200" r="60" fill="none" stroke="#d4a017" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="4 4" />
          <circle cx="200" cy="200" r="30" fill="#d4a017" fillOpacity="0.15" />
          <circle cx="200" cy="200" r="10" fill="#facc15" fillOpacity="0.9" />

          {/* Lines to center */}
          {[[200, 50], [280, 120], [260, 220], [200, 240], [110, 170], [140, 80]].map(([x, y], i) => (
            <line key={i} x1="200" y1="200" x2={x} y2={y} stroke="#d4a017" strokeWidth="0.7" strokeOpacity="0.25" strokeDasharray="3 3" />
          ))}

          {/* Floating label */}
          <text x="200" y="380" textAnchor="middle" fill="#d4a017" fontSize="11" fontFamily="Inter" fontWeight="600" letterSpacing="3" opacity="0.7">
            AAYODHYAM 2026
          </text>
          <text x="200" y="26" textAnchor="middle" fill="#facc15" fontSize="9" fontFamily="Inter" fontWeight="500" letterSpacing="2" opacity="0.6">
            GRAIN BOUNDARY SIMULATION
          </text>
        </svg>
      </motion.div>

      {/* Floating badges */}
      <motion.div
        animate={{ y: [-6, 6, -6] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -right-4 top-1/4 bg-white rounded-xl px-3 py-2 shadow-elevated border border-metal-100"
      >
        <p className="text-xs font-bold text-navy-900">11 Problem</p>
        <p className="text-xs text-metal-500">Statements</p>
      </motion.div>
      <motion.div
        animate={{ y: [6, -6, 6] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="absolute -left-4 bottom-1/4 bg-gold-500 rounded-xl px-3 py-2 shadow-gold"
      >
        <p className="text-xs font-bold text-navy-950">5 Categories</p>
        <p className="text-xs text-navy-900 opacity-70">of research</p>
      </motion.div>
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
                  <Link to="/register" className="btn-gold px-7 py-3.5 text-base font-bold">
                    Register Team
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link to="/problem-statements" className="btn-outline border-white/30 text-white hover:bg-white/10 hover:text-white px-7 py-3.5 text-base">
                    View Problem Statements
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
                    Open to all Engineering Students
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

      {/* ── Tracks / Categories ── */}
      <section className="section-padding bg-metal-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <span className="section-label">Problem Statement Tracks</span>
            <h2 className="text-headline text-navy-900 mb-4">Five Domains of Innovation</h2>
            <p className="text-body-lg text-metal-600 max-w-2xl mx-auto">
              Choose your area of expertise and tackle a cutting-edge challenge in metallurgy and materials science.
            </p>
          </motion.div>

          <motion.div
            variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {TRACKS.map((track, i) => {
              const Icon = track.icon;
              return (
                <motion.div
                  key={track.label}
                  variants={{ initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
                  className={cn(
                    'card-hover border p-6 bg-gradient-to-br cursor-pointer',
                    track.color,
                    i === 4 && 'md:col-span-2 lg:col-span-1'
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', track.iconColor, 'bg-white shadow-sm')}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-title text-navy-900 text-base font-bold">{track.label}</h3>
                    <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ background: track.iconColor.replace('text-', '#').replace('-600', '') }}>
                      {track.count} tasks
                    </span>
                  </div>
                  <p className="text-sm text-metal-600 leading-relaxed">{track.description}</p>
                  <Link
                    to={`/problem-statements?cat=${encodeURIComponent(track.label)}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold mt-4 hover:gap-2 transition-all text-metal-700 hover:text-navy-900"
                  >
                    View tasks <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
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
                AAYODHYAM 2026 is more than a competition — it's a week-long immersion into the forefront of materials science and metallurgical engineering.
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
              View All 11 Tasks <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PROBLEM_STATEMENTS.slice(0, 3).map((ps) => (
              <motion.div key={ps.id} {...fadeInUp} className="card-hover p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-semibold text-metal-500 bg-metal-100 px-2.5 py-1 rounded-full">
                    {ps.category}
                  </span>
                  <span className={cn('badge',
                    ps.difficulty === 'Medium' && 'badge-medium',
                    ps.difficulty === 'Hard' && 'badge-hard',
                    ps.difficulty === 'Advanced' && 'badge-advanced'
                  )}>
                    {ps.difficulty}
                  </span>
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
              <h3 className="font-bold text-navy-900 mb-2">Dept. of Metallurgy & Materials Engineering</h3>
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
              { q: 'How many teams per problem statement?', a: 'Maximum 5 teams per problem statement, allocated on a first-come, first-served basis.' },
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
              Secure your slot today. Problem statement slots are limited to 5 teams each — don't miss your category.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/register" className="btn-primary bg-navy-900 text-white hover:bg-navy-950 px-8 py-4 text-base">
                Register Your Team
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
