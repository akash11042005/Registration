import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Download,
  Plus,
  Trash2,
  Megaphone,
  Calendar,
  Layers,
  FileSpreadsheet,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Eye,
  Check,
} from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { useAuth } from '@/contexts/AuthContext';
import {
  useRegistrations,
  useAllSubmissions,
  useAnnouncements,
  useUpdateRegistrationStatus,
  useDeleteRegistration,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  usePaymentIssues,
  useResolvePaymentIssue,
  useTaskCountsDetailed,
  useFailedPaymentAttempts,
  clearAllRegistrationsAndSubmissions,
} from '@/hooks/useFirestore';
import { PROBLEM_STATEMENTS } from '@/lib/problemStatements';
import { MAX_TEAMS_PER_TASK } from '@/lib/constants';
import { Registration, Announcement, Submission, PaymentIssue } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function AdminDashboardPage() {
  const { user, isAdmin } = useAuth();
  const { data: registrations = [], isLoading: regLoading, isError: regError, error: regErrorObj, refetch: refetchRegs } = useRegistrations();
  const { data: submissions = [] } = useAllSubmissions();
  const { data: announcements = [] } = useAnnouncements();
  const { data: paymentIssues = [] } = usePaymentIssues();
  const { data: taskCountsDetailed = {} } = useTaskCountsDetailed();
  const { data: failedAttempts = [] } = useFailedPaymentAttempts();

  const updateStatus = useUpdateRegistrationStatus();
  const deleteReg = useDeleteRegistration();
  const createAnn = useCreateAnnouncement();
  const deleteAnn = useDeleteAnnouncement();
  const resolveIssue = useResolvePaymentIssue();

  const [activeTab, setActiveTab] = useState<'registrations' | 'announcements' | 'submissions' | 'paymentIssues'>('registrations');
  const [search, setSearch] = useState('');
  const [taskFilter, setTaskFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnCategory, setNewAnnCategory] = useState<'Rule' | 'Schedule' | 'Venue' | 'General'>('General');
  const [newAnnImportant, setNewAnnImportant] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  if (!user || !isAdmin) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center bg-metal-50 px-4 py-20">
          <div className="card p-8 max-w-md text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-title text-navy-900 mb-2">Access Restricted</h2>
            <p className="text-sm text-metal-600 mb-6">
              This area is restricted to authorized AAYODHYAM 2026 organizers and judges.
            </p>
            <Link to="/" className="btn-primary justify-center">Return to Home</Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Filtered registrations
  const filteredRegs = registrations.filter((reg) => {
    const matchTask = taskFilter === 'all' || reg.taskId === taskFilter;
    const matchStatus = statusFilter === 'all' || reg.paymentStatus === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      reg.teamName.toLowerCase().includes(q) ||
      reg.leaderName.toLowerCase().includes(q) ||
      reg.registrationId.toLowerCase().includes(q) ||
      reg.transactionId.toLowerCase().includes(q);
    return matchTask && matchStatus && matchSearch;
  });

  // Stats
  const totalCount = registrations.length;
  const verifiedCount = registrations.filter(r => r.paymentStatus === 'verified').length;
  const pendingCount = registrations.filter(r => r.paymentStatus === 'pending').length;
  const rejectedCount = registrations.filter(r => r.paymentStatus === 'rejected').length;
  const totalRevenue = registrations
    .filter(r => r.paymentStatus !== 'rejected')
    .reduce((sum, r) => sum + (r.totalFee || 0), 0);
  const totalReserved = Object.values(taskCountsDetailed).reduce((sum, t) => sum + t.held, 0);
  const totalFailedAttempts = failedAttempts.length;

  // Per-task slot occupancy — confirmed registrations (never counting a
  // rejected one) PLUS any active 2-minute checkout reservations right now.
  const taskSlotSummary = PROBLEM_STATEMENTS.map((ps) => {
    const confirmed = registrations.filter((r) => r.taskId === ps.id && r.paymentStatus !== 'rejected').length;
    const held = taskCountsDetailed[ps.id]?.held || 0;
    const occupied = confirmed + held;
    return { ...ps, confirmed, held, occupied, remaining: Math.max(0, MAX_TEAMS_PER_TASK - occupied) };
  }).sort((a, b) => a.remaining - b.remaining);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Registration ID', 'Team Name', 'Leader Name', 'Leader Email', 'Phone', 'Task ID', 'Task Title', 'UTR/Transaction ID', 'Payment Status', 'Created At'];
    const rows = filteredRegs.map(r => [
      r.registrationId,
      `"${r.teamName}"`,
      `"${r.leaderName}"`,
      r.leaderEmail,
      r.leaderPhone,
      r.taskId,
      `"${r.taskTitle}"`,
      r.transactionId,
      r.paymentStatus,
      r.createdAt,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AAYODHYAM_Registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add Announcement
  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle || !newAnnContent) return;
    await createAnn.mutateAsync({
      title: newAnnTitle,
      content: newAnnContent,
      category: newAnnCategory,
      important: newAnnImportant,
      createdAt: new Date().toISOString(),
    });
    setNewAnnTitle('');
    setNewAnnContent('');
    setNewAnnImportant(false);
  };

  // Nuclear Reset
  const handleNuclearClear = async () => {
    setClearing(true);
    try {
      await clearAllRegistrationsAndSubmissions();
      await refetchRegs();
      setShowClearModal(false);
      alert('All registrations and submissions cleared successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to clear database records.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <PageTransition>
      {/* Header */}
      <div className="page-header pt-24 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="section-label text-gold-400">Organizer Console</span>
              <h1 className="text-headline text-white mb-1">Admin &amp; Jury Dashboard</h1>
              <p className="text-metal-300 text-xs font-mono">Logged in as: {user.email}</p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => refetchRegs()} className="btn-outline border-white/20 text-white hover:bg-white/10 text-xs px-3 py-2">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
              </button>
              <button onClick={handleExportCSV} className="btn-gold text-xs px-3.5 py-2 font-bold">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {regError && (
          <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Couldn't load registrations from Firestore</p>
              <p className="text-xs mt-1 opacity-90">
                {regErrorObj instanceof Error ? regErrorObj.message : 'Unknown error'}
              </p>
              <p className="text-xs mt-1 opacity-75">
                Most common causes: the Firestore database hasn't been created yet, or firestore.rules hasn't been published.
              </p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <div className="card p-4 text-center">
            <p className="text-2xl font-black text-navy-900">{totalCount}</p>
            <p className="text-xs font-bold text-metal-500 uppercase tracking-wider mt-1">Total Teams</p>
          </div>
          <div className="card p-4 text-center border-emerald-200 bg-emerald-50/50">
            <p className="text-2xl font-black text-emerald-700">{verifiedCount}</p>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mt-1">Verified / Approved</p>
          </div>
          <div className="card p-4 text-center border-amber-200 bg-amber-50/50">
            <p className="text-2xl font-black text-amber-700">{pendingCount}</p>
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mt-1">Pending Review</p>
          </div>
          <div className="card p-4 text-center border-red-200 bg-red-50/50">
            <p className="text-2xl font-black text-red-700">{rejectedCount}</p>
            <p className="text-xs font-bold text-red-800 uppercase tracking-wider mt-1">Rejected</p>
          </div>
          <div className="card p-4 text-center border-gold-200 bg-gold-50/50">
            <p className="text-2xl font-black text-gold-700">₹{totalRevenue.toLocaleString('en-IN')}</p>
            <p className="text-xs font-bold text-gold-800 uppercase tracking-wider mt-1">Total Payments</p>
          </div>
          <div className="card p-4 text-center border-blue-200 bg-blue-50/50">
            <p className="text-2xl font-black text-blue-700">{totalReserved}</p>
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mt-1">Reserved Slots</p>
          </div>
          <div className="card p-4 text-center border-metal-300 bg-metal-50">
            <p className="text-2xl font-black text-metal-700">{totalFailedAttempts}</p>
            <p className="text-xs font-bold text-metal-600 uppercase tracking-wider mt-1">Failed / Cancelled</p>
          </div>
        </div>

        {/* Problem Statement Slots */}
        <div className="card p-5 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-navy-700" />
            <h3 className="text-sm font-bold text-navy-900">Problem Statement Slots</h3>
            <span className="text-xs text-metal-400 font-medium">— fullest first</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {taskSlotSummary.map((ps) => (
              <div
                key={ps.id}
                className={cn(
                  'p-3 rounded-xl border text-xs',
                  ps.remaining === 0
                    ? 'bg-red-50 border-red-200'
                    : ps.remaining <= 1
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-metal-50 border-metal-200'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-navy-900">#{ps.id}</span>
                  <span
                    className={cn(
                      'font-bold',
                      ps.remaining === 0 ? 'text-red-700' : ps.remaining <= 1 ? 'text-amber-700' : 'text-emerald-700'
                    )}
                  >
                    {ps.remaining === 0 ? 'FULL' : `${ps.remaining} left`}
                  </span>
                </div>
                <p className="text-metal-700 font-medium truncate mb-1">{ps.title}</p>
                <div className="h-1.5 rounded-full bg-white overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      ps.remaining === 0 ? 'bg-red-400' : ps.remaining <= 1 ? 'bg-amber-400' : 'bg-emerald-400'
                    )}
                    style={{ width: `${Math.min(100, (ps.occupied / MAX_TEAMS_PER_TASK) * 100)}%` }}
                  />
                </div>
                <p className="text-metal-500 mt-1">
                  {ps.occupied} / {MAX_TEAMS_PER_TASK} teams
                  {ps.held > 0 && (
                    <span className="text-blue-600 font-semibold"> ({ps.confirmed} confirmed + {ps.held} reserved)</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-metal-200 mb-6 space-x-6">
          <button
            onClick={() => setActiveTab('registrations')}
            className={cn(
              'pb-3 text-sm font-semibold border-b-2 transition-colors',
              activeTab === 'registrations'
                ? 'border-navy-900 text-navy-900'
                : 'border-transparent text-metal-500 hover:text-metal-800'
            )}
          >
            Registrations ({filteredRegs.length})
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={cn(
              'pb-3 text-sm font-semibold border-b-2 transition-colors',
              activeTab === 'announcements'
                ? 'border-navy-900 text-navy-900'
                : 'border-transparent text-metal-500 hover:text-metal-800'
            )}
          >
            Announcements ({announcements.length})
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={cn(
              'pb-3 text-sm font-semibold border-b-2 transition-colors',
              activeTab === 'submissions'
                ? 'border-navy-900 text-navy-900'
                : 'border-transparent text-metal-500 hover:text-metal-800'
            )}
          >
            Jury Submissions ({submissions.length})
          </button>
          <button
            onClick={() => setActiveTab('paymentIssues')}
            className={cn(
              'pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5',
              activeTab === 'paymentIssues'
                ? 'border-navy-900 text-navy-900'
                : paymentIssues.length > 0
                  ? 'border-transparent text-red-600 hover:text-red-700'
                  : 'border-transparent text-metal-500 hover:text-metal-800'
            )}
          >
            {paymentIssues.length > 0 && <AlertOctagon className="w-3.5 h-3.5" />}
            Payment Issues ({paymentIssues.length})
          </button>
        </div>

        {/* Tab 1: REGISTRATIONS TABLE */}
        {activeTab === 'registrations' && (
          <div className="space-y-4">
            {/* Filters bar */}
            <div className="card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-metal-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search team, leader, reg ID or UTR…"
                  className="form-input pl-9 py-2 text-xs"
                />
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <select
                  value={taskFilter}
                  onChange={(e) => setTaskFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="form-input py-2 text-xs"
                >
                  <option value="all">All Problem Tasks</option>
                  {PROBLEM_STATEMENTS.map(p => (
                    <option key={p.id} value={p.id}>#{p.id}: {p.title.slice(0, 25)}…</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="form-input py-2 text-xs"
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-metal-100 border-b border-metal-200 text-metal-600 font-bold uppercase tracking-wider">
                      <th className="p-3">ID / Date</th>
                      <th className="p-3">Team &amp; Leader</th>
                      <th className="p-3">College &amp; Mentor</th>
                      <th className="p-3">Task Allocated</th>
                      <th className="p-3">UTR / Payment</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-metal-100">
                    {filteredRegs.length > 0 ? (
                      filteredRegs.map((reg) => (
                        <tr key={reg.id || reg.registrationId} className="hover:bg-metal-50 transition-colors">
                          <td className="p-3">
                            <span className="font-mono font-bold text-navy-900 block">{reg.registrationId}</span>
                            <span className="text-[10px] text-metal-400">{new Date(reg.createdAt).toLocaleDateString()}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-navy-900 block">{reg.teamName}</span>
                            <span className="text-metal-600">{reg.leaderName} ({reg.leaderEmail})</span>
                            <span className="text-[10px] text-metal-400 block mt-0.5">
                              Members: {[reg.member1Name, reg.member2Name].filter(Boolean).join(', ') || '—'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-metal-700 block font-medium">{reg.collegeName}</span>
                            <span className="text-[10px] text-metal-500">Mentor: {reg.mentorName}</span>
                          </td>
                          <td className="p-3 max-w-xs">
                            <span className="font-bold text-navy-900 block truncate">#{reg.taskId}: {reg.taskTitle}</span>
                          </td>
                          <td className="p-3 font-mono">
                            <span className="font-bold text-metal-800 uppercase block">{reg.transactionId}</span>
                            <span className="text-[10px] text-gold-600 font-sans font-semibold">₹{reg.totalFee || 500}</span>
                          </td>
                          <td className="p-3">
                            <span className={cn('badge uppercase text-[10px]',
                              reg.paymentStatus === 'verified' && 'badge-verified',
                              reg.paymentStatus === 'pending' && 'badge-pending',
                              reg.paymentStatus === 'rejected' && 'badge-rejected'
                            )}>
                              {reg.paymentStatus}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {reg.id && (
                                <>
                                  {reg.paymentStatus !== 'verified' && (
                                    <button
                                      onClick={() => updateStatus.mutate({ id: reg.id!, status: 'verified' })}
                                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                      title="Approve / Verify Payment"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                  )}
                                  {reg.paymentStatus !== 'rejected' && (
                                    <button
                                      onClick={() => updateStatus.mutate({ id: reg.id!, status: 'rejected' })}
                                      className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                                      title="Reject Payment"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                  {reg.paymentStatus !== 'pending' && (
                                    <button
                                      onClick={() => updateStatus.mutate({ id: reg.id!, status: 'pending' })}
                                      className="p-1.5 rounded-lg bg-metal-100 text-metal-700 hover:bg-metal-200 transition-colors"
                                      title="Reset to Pending"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      if (confirm(`Delete registration ${reg.registrationId}?`)) {
                                        deleteReg.mutate(reg.id!);
                                      }
                                    }}
                                    className="p-1.5 rounded-lg bg-metal-100 text-metal-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Delete Record"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-metal-500">
                          No registrations found matching the specified criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Nuclear Reset Option at bottom */}
            <div className="pt-8 border-t border-metal-200 flex justify-end">
              <button
                onClick={() => setShowClearModal(true)}
                className="btn-ghost text-xs text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All Registrations (Test Reset)
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: ANNOUNCEMENTS MANAGER */}
        {activeTab === 'announcements' && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Create Announcement Form */}
            <div className="card p-6 space-y-4">
              <h3 className="text-title text-navy-900 text-base font-bold border-b border-metal-100 pb-3">
                Broadcast Announcement
              </h3>
              <form onSubmit={handleAddAnnouncement} className="space-y-3 text-xs">
                <div>
                  <label className="form-label">Title *</label>
                  <input
                    type="text"
                    value={newAnnTitle}
                    onChange={(e) => setNewAnnTitle(e.target.value)}
                    placeholder="e.g. Lab Access Timing Update"
                    className="form-input"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Content *</label>
                  <textarea
                    value={newAnnContent}
                    onChange={(e) => setNewAnnContent(e.target.value)}
                    rows={3}
                    placeholder="Detailed announcement text..."
                    className="form-input"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="form-label">Category</label>
                    <select
                      value={newAnnCategory}
                      onChange={(e) => setNewAnnCategory(e.target.value as any)}
                      className="form-input"
                    >
                      <option value="General">General</option>
                      <option value="Rule">Rule</option>
                      <option value="Schedule">Schedule</option>
                      <option value="Venue">Venue</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-metal-800">
                      <input
                        type="checkbox"
                        checked={newAnnImportant}
                        onChange={(e) => setNewAnnImportant(e.target.checked)}
                        className="rounded border-metal-300 text-navy-900 focus:ring-navy-900"
                      />
                      Mark as Important
                    </label>
                  </div>
                </div>

                <button type="submit" className="btn-primary w-full justify-center pt-2">
                  <Plus className="w-4 h-4" /> Publish Announcement
                </button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-title text-navy-900 text-base font-bold border-b border-metal-100 pb-3">
                Live Broadcast Ticker List ({announcements.length})
              </h3>
              {announcements.map((ann) => (
                <div key={ann.id} className="card p-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-navy-900 text-xs">{ann.title}</span>
                      <span className="text-[10px] font-semibold text-metal-500 bg-metal-100 px-2 py-0.5 rounded">
                        {ann.category}
                      </span>
                      {ann.important && (
                        <span className="bg-gold-500 text-navy-950 font-bold px-1.5 py-0.5 rounded text-[10px]">
                          Important
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-metal-600 leading-relaxed">{ann.content}</p>
                    <span className="text-[10px] text-metal-400 block">{new Date(ann.createdAt).toLocaleString()}</span>
                  </div>

                  {ann.id && (
                    <button
                      onClick={() => deleteAnn.mutate(ann.id!)}
                      className="p-1.5 text-metal-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: SUBMISSIONS REVIEW */}
        {activeTab === 'submissions' && (
          <div className="space-y-4">
            <h3 className="text-title text-navy-900 text-base font-bold border-b border-metal-100 pb-3">
              Jury Submission Review ({submissions.length})
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              {submissions.map((sub) => (
                <div key={sub.id} className="card p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono text-gold-600 block">Team: {sub.teamName}</span>
                      <h4 className="font-bold text-navy-900 text-sm">{sub.title}</h4>
                    </div>
                    <span className="badge badge-verified text-[10px] uppercase">{sub.status}</span>
                  </div>

                  <p className="text-xs text-metal-600 leading-relaxed">{sub.description}</p>

                  {sub.codeSnippet && (
                    <div className="bg-metal-900 text-metal-100 p-3 rounded-xl font-mono text-[11px] max-h-32 overflow-y-auto">
                      <pre>{sub.codeSnippet}</pre>
                    </div>
                  )}

                  {sub.fileName && (
                    <div className="text-xs bg-navy-50 text-navy-900 p-2 rounded-lg font-medium flex items-center justify-between">
                      <span className="truncate">{sub.fileName}</span>
                      {sub.fileUrl && (
                        <a href={sub.fileUrl} target="_blank" rel="noreferrer" className="text-gold-600 hover:underline">
                          View
                        </a>
                      )}
                    </div>
                  )}

                  <div className="text-[10px] text-metal-400 border-t border-metal-100 pt-2 flex justify-between">
                    <span>Task #{sub.taskId}</span>
                    <span>Submitted: {new Date(sub.submittedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: PAYMENT ISSUES (payments verified by Razorpay but the task filled up first) */}
        {activeTab === 'paymentIssues' && (
          <div className="space-y-4">
            {paymentIssues.length === 0 ? (
              <div className="card p-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-navy-900">No unresolved payment issues</p>
                <p className="text-xs text-metal-500 mt-1">
                  This list only fills up if a payment is verified by Razorpay at the exact moment a task's last slot is taken by someone else.
                </p>
              </div>
            ) : (
              paymentIssues.map((issue: PaymentIssue) => (
                <div key={issue.id} className="card p-5 border-l-4 border-red-400 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-navy-900 text-sm">{issue.registration?.teamName}</p>
                      <p className="text-xs text-metal-600">
                        {issue.registration?.leaderName} ({issue.registration?.leaderEmail})
                      </p>
                    </div>
                    <span className="badge badge-rejected text-[10px] shrink-0">Needs manual resolution</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2 text-xs bg-metal-50 rounded-xl p-3">
                    <div>
                      <span className="text-metal-500 block">Razorpay Payment ID:</span>
                      <span className="font-mono font-semibold text-navy-900">{issue.razorpayPaymentId}</span>
                    </div>
                    <div>
                      <span className="text-metal-500 block">Amount Paid:</span>
                      <span className="font-bold text-gold-600">₹{issue.totalFee}</span>
                    </div>
                    <div>
                      <span className="text-metal-500 block">Task They Tried to Join:</span>
                      <span className="font-semibold text-navy-900">
                        #{issue.registration?.taskId}: {issue.registration?.taskTitle}
                      </span>
                    </div>
                    <div>
                      <span className="text-metal-500 block">College:</span>
                      <span className="font-semibold text-navy-900">{issue.registration?.collegeName}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-metal-500">
                    This team paid successfully but the task above had already filled up by the time their payment was confirmed.
                    Contact them to either reassign to another problem statement (register them manually with this Payment ID as
                    their transaction reference) or refund via your Razorpay dashboard, then mark this resolved.
                  </p>

                  <div className="flex justify-end">
                    <button
                      onClick={() => issue.id && resolveIssue.mutate(issue.id)}
                      disabled={resolveIssue.isPending || !issue.id}
                      className="btn-outline text-xs px-3 py-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Mark Resolved
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Nuclear Clear */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setShowClearModal(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-elevated space-y-4"
          >
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-navy-900 text-base">Clear All Data?</h3>
              <p className="text-xs text-metal-600 mt-1">
                This action will permanently delete all team registrations and project submissions from Firestore. This cannot be undone.
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowClearModal(false)} className="btn-ghost flex-1 justify-center text-xs">
                Cancel
              </button>
              <button
                onClick={handleNuclearClear}
                disabled={clearing}
                className="btn-primary bg-red-600 hover:bg-red-700 text-white flex-1 justify-center text-xs"
              >
                {clearing ? 'Clearing…' : 'Yes, Delete All'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </PageTransition>
  );
}