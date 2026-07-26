import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, ChevronRight, FlaskConical, Users, AlertCircle, Info, ArrowRight } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { PROBLEM_STATEMENTS, CATEGORIES, ProblemStatement } from '@/lib/problemStatements';
import { useTaskRegistrationCounts } from '@/hooks/useFirestore';
import { MAX_TEAMS_PER_TASK } from '@/lib/constants';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────
// Detail modal
// ─────────────────────────────────────────────────
function ProblemDetailModal({
  ps,
  onClose,
  registeredCount,
}: {
  ps: ProblemStatement;
  onClose: () => void;
  registeredCount: number;
}) {
  const isFull = registeredCount >= MAX_TEAMS_PER_TASK;
  const spotsLeft = Math.max(0, MAX_TEAMS_PER_TASK - registeredCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={ps.title}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
        className="relative bg-white rounded-2xl shadow-elevated max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-metal-100 px-6 pt-6 pb-4 z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
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
              <h2 className="text-lg font-bold text-navy-900">{ps.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-metal-100 transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">
          {/* Capacity */}
          <div className={cn(
            'flex items-center gap-3 p-3 rounded-xl border',
            isFull
              ? 'bg-red-50 border-red-200 text-red-700'
              : spotsLeft <= 2
              ? 'bg-orange-50 border-orange-200 text-orange-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          )}>
            <Users className="w-4 h-4 shrink-0" />
            <span className="text-sm font-semibold">
              {registeredCount} / {MAX_TEAMS_PER_TASK} groups registered
              {isFull ? ' — Task Full' : ` — ${spotsLeft} slot${spotsLeft === 1 ? '' : 's'} remaining`}
            </span>
          </div>

          {/* Objective */}
          <div>
            <h3 className="text-xs font-bold text-metal-500 uppercase tracking-wider mb-2">Objective</h3>
            <p className="text-sm text-metal-700 leading-relaxed">{ps.objectiveFull}</p>
          </div>

          {/* Evaluation criteria */}
          <div>
            <h3 className="text-xs font-bold text-metal-500 uppercase tracking-wider mb-2">Evaluation / Jury Criteria</h3>
            <p className="text-sm text-metal-700 leading-relaxed">{ps.evaluationCriteria}</p>
          </div>

          {/* Lab equipment */}
          <div>
            <h3 className="text-xs font-bold text-metal-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <FlaskConical className="w-3.5 h-3.5" /> WCE Lab Equipment Provided
            </h3>
            <ul className="space-y-1.5">
              {ps.labEquipment.map((eq) => (
                <li key={eq} className="flex items-start gap-2 text-sm text-metal-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-navy-400 mt-2 shrink-0" />
                  {eq}
                </li>
              ))}
            </ul>
          </div>

          {/* Tags */}
          <div>
            <h3 className="text-xs font-bold text-metal-500 uppercase tracking-wider mb-2">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {ps.tags.map((tag) => (
                <span key={tag} className="text-xs text-metal-600 bg-metal-100 px-2.5 py-1 rounded-full font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Policy notice */}
          <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>WCE Lab Policy:</strong> Lab facilities are for final testing &amp; microstructural evaluation only during jury rounds. Heat treatment and specimen pre-processing must be completed at your home institution.
            </p>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="sticky bottom-0 bg-white border-t border-metal-100 px-6 py-4">
          <Link
            to={`/register?task=${ps.id}`}
            className={cn('btn-gold w-full justify-center', isFull && 'opacity-50 cursor-not-allowed pointer-events-none')}
            onClick={onClose}
          >
            {isFull ? 'Task Full — No Slots Available' : 'Register for This Task'}
            {!isFull && <ArrowRight className="w-4 h-4" />}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Problem card
// ─────────────────────────────────────────────────
function ProblemCard({
  ps,
  count,
  onClick,
}: {
  ps: ProblemStatement;
  count: number;
  onClick: () => void;
}) {
  const isFull = count >= MAX_TEAMS_PER_TASK;
  const pct = (count / MAX_TEAMS_PER_TASK) * 100;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={cn('card-hover p-5 cursor-pointer group', isFull && 'opacity-70')}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
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
        <span className="text-xs font-bold text-metal-400 shrink-0">#{ps.id}</span>
      </div>

      <h3 className="font-bold text-navy-900 mb-2 leading-tight group-hover:text-navy-700 transition-colors">
        {ps.title}
      </h3>
      <p className="text-sm text-metal-600 leading-relaxed line-clamp-2 mb-4">{ps.objective}</p>

      {/* Slot indicator */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-medium text-metal-500">{count} / {MAX_TEAMS_PER_TASK} groups registered</span>
          {isFull && <span className="font-bold text-red-600">Full</span>}
        </div>
        <div className="h-1.5 rounded-full bg-metal-100 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={cn('h-full rounded-full', isFull ? 'bg-red-400' : pct > 60 ? 'bg-orange-400' : 'bg-emerald-400')}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {ps.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="text-xs text-metal-500 bg-metal-100 px-2 py-0.5 rounded">
            {tag}
          </span>
        ))}
        {ps.tags.length > 3 && <span className="text-xs text-metal-400">+{ps.tags.length - 3}</span>}
      </div>

      <div className="flex items-center justify-between">
        <button className="inline-flex items-center gap-1 text-xs font-semibold text-navy-700 group-hover:text-navy-900 transition-colors">
          View Details <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
        {!isFull && (
          <Link
            to={`/register?task=${ps.id}`}
            className="text-xs font-semibold text-gold-600 hover:text-gold-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Register →
          </Link>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────
export default function ProblemStatementsPage() {
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get('cat') || 'All';
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(initialCat);
  const [selectedPs, setSelectedPs] = useState<ProblemStatement | null>(null);
  const counts = useTaskRegistrationCounts();

  const filtered = useMemo(() => {
    return PROBLEM_STATEMENTS.filter((ps) => {
      const matchCat = category === 'All' || ps.category === category;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        ps.title.toLowerCase().includes(q) ||
        ps.objective.toLowerCase().includes(q) ||
        ps.tags.some((t) => t.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [search, category]);

  return (
    <PageTransition>
      {/* Page header */}
      <div className="page-header pt-24 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]">
          <svg className="w-full h-full" aria-hidden="true">
            <defs>
              <pattern id="lattice-ps" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="2" fill="white" />
                <circle cx="0" cy="0" r="2" fill="white" />
                <line x1="0" y1="0" x2="60" y2="60" stroke="white" strokeWidth="0.5" />
                <line x1="60" y1="0" x2="0" y2="60" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#lattice-ps)" />
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="section-label text-gold-400">AAYODHYAM 2026</span>
          <h1 className="text-headline text-white mb-3">Problem Statements</h1>
          <p className="text-metal-300 text-body-lg max-w-2xl">
            Browse all 11 research challenges across five domains of metallurgy and materials engineering. Select a task to view full details, required equipment, and evaluation criteria.
          </p>

          {/* Info cards */}
          <div className="flex flex-wrap gap-3 mt-6">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg border border-white/20">
              <Info className="w-3.5 h-3.5 text-gold-400" />
              <span className="text-xs text-metal-300 font-medium">11 total tasks</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg border border-white/20">
              <Users className="w-3.5 h-3.5 text-gold-400" />
              <span className="text-xs text-metal-300 font-medium">Max 5 teams per task</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg border border-white/20">
              <FlaskConical className="w-3.5 h-3.5 text-gold-400" />
              <span className="text-xs text-metal-300 font-medium">WCE lab access for jury rounds</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-metal-100 shadow-card p-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-metal-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks by title, objective, or tag…"
                className="form-input pl-10"
                aria-label="Search problem statements"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-metal-400 hover:text-metal-700"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category filter chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                  category === cat.value
                    ? 'bg-navy-900 text-white shadow-navy'
                    : 'bg-metal-100 text-metal-600 hover:bg-metal-200'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-metal-500 mb-5 font-medium">
          {filtered.length} task{filtered.length !== 1 ? 's' : ''} found
          {(search || category !== 'All') && (
            <button
              onClick={() => { setSearch(''); setCategory('All'); }}
              className="ml-3 text-navy-700 hover:text-navy-900 underline underline-offset-2"
            >
              Reset filters
            </button>
          )}
        </p>

        {/* Grid */}
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            <motion.div
              layout
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {filtered.map((ps) => (
                <ProblemCard
                  key={ps.id}
                  ps={ps}
                  count={counts[ps.id] ?? 0}
                  onClick={() => setSelectedPs(ps)}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-16 h-16 rounded-2xl bg-metal-100 flex items-center justify-center mx-auto mb-4">
                <Search className="w-7 h-7 text-metal-400" />
              </div>
              <h3 className="font-bold text-navy-900 mb-2">No tasks match your filters</h3>
              <p className="text-sm text-metal-500 mb-6">Try adjusting your search or category filter</p>
              <button
                onClick={() => { setSearch(''); setCategory('All'); }}
                className="btn-primary"
              >
                Reset Filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selectedPs && (
          <ProblemDetailModal
            ps={selectedPs}
            registeredCount={counts[selectedPs.id] ?? 0}
            onClose={() => setSelectedPs(null)}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
