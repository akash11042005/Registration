import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Upload,
  Download,
  Megaphone,
  AlertCircle,
  BookOpen,
  Check,
  Pencil,
  X,
  Users2,
  GraduationCap,
  Receipt,
} from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { useAuth } from '@/contexts/AuthContext';
import rulebookPdf from '@/assets/Aayodhyam_2026_rulebook.pdf';
import {
  useRegistrationByUid,
  useSubmissionsByUid,
  useAnnouncements,
  useCreateSubmission,
  useUpdateRegistrationDetails,
  uploadFile,
} from '@/hooks/useFirestore';
import { downloadRegistrationReceipt } from '@/lib/receipt';
import { PROBLEM_STATEMENTS } from '@/lib/problemStatements';
import { REGISTRATION_EDIT_DEADLINE } from '@/lib/constants';
import { Submission } from '@/lib/types';
import { cn } from '@/lib/utils';

const submissionSchema = z.object({
  title: z.string().min(3, 'Submission title is required'),
  description: z.string().min(10, 'Technical methodology summary must be at least 10 characters'),
  codeSnippet: z.string().optional(),
});

type SubmissionFormData = z.infer<typeof submissionSchema>;

const editDetailsSchema = z.object({
  teamName: z.string().min(3, 'Team name must be at least 3 characters'),
  leaderPhone: z.string().regex(/^[0-9]{10}$/, 'Must be a valid 10-digit mobile number'),
  collegeName: z.string().min(2, 'College name is required'),
  member1Name: z.union([z.string().min(2, 'Enter a valid name'), z.literal('')]).optional(),
  member2Name: z.union([z.string().min(2, 'Enter a valid name'), z.literal('')]).optional(),
  mentorName: z.string().min(2, 'Mentor name is required'),
  mentorEmail: z.union([z.string().email('Enter a valid email'), z.literal('')]).optional(),
  mentorPhone: z.union([z.string().regex(/^[0-9]{10}$/, 'Must be a valid 10-digit number'), z.literal('')]).optional(),
});

type EditDetailsFormData = z.infer<typeof editDetailsSchema>;

export default function TeamDashboardPage() {
  const { user, resendVerificationEmail } = useAuth();
  const { data: registration, isLoading: regLoading, isError: regError, error: regErrorObj } = useRegistrationByUid(user?.uid);
  const { data: submissions = [], isLoading: subLoading } = useSubmissionsByUid(user?.uid);
  const { data: announcements = [] } = useAnnouncements();

  const createSubmission = useCreateSubmission();
  const updateDetails = useUpdateRegistrationDetails();

  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'resources'>('overview');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [verifyEmailStatus, setVerifyEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleResendVerification = async () => {
    setVerifyEmailStatus('sending');
    try {
      await resendVerificationEmail();
      setVerifyEmailStatus('sent');
    } catch {
      setVerifyEmailStatus('error');
    }
  };
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSaved, setEditSaved] = useState(false);

  const editWindowOpen = Date.now() < REGISTRATION_EDIT_DEADLINE.getTime();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema),
  });

  if (!user) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center bg-metal-50 px-4 py-20">
          <div className="card p-8 max-w-md text-center">
            <h2 className="text-title text-navy-900 mb-2">Access Restricted</h2>
            <p className="text-sm text-metal-600 mb-6">Please sign in to access your Team Dashboard.</p>
            <Link to="/signin" className="btn-primary justify-center">Sign In</Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  const assignedTask = registration ? PROBLEM_STATEMENTS.find(p => p.id === registration.taskId) : null;

  const onSubmissionSubmit = async (data: SubmissionFormData) => {
    if (!registration) {
      alert('You must have a completed registration to submit project deliverables.');
      return;
    }
    setUploading(true);
    try {
      let fileUrl: string | undefined = undefined;
      let fileName: string | undefined = undefined;

      if (file) {
        fileName = file.name;
        try {
          fileUrl = await uploadFile(file, `submission-attachments/${user.uid}_${Date.now()}_${file.name}`);
        } catch (err) {
          console.warn('File upload failed, using basic metadata:', err);
        }
      }

      const subData: Omit<Submission, 'id'> = {
        teamId: registration.registrationId,
        teamName: registration.teamName,
        taskId: registration.taskId,
        title: data.title,
        description: data.description,
        codeSnippet: data.codeSnippet || undefined,
        fileUrl,
        fileName,
        uid: user.uid,
        submittedAt: new Date().toISOString(),
        status: 'submitted',
      };

      await createSubmission.mutateAsync(subData);
      reset();
      setFile(null);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (err) {
      console.error('Submission error:', err);
      alert('Failed to save submission. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageTransition>
      {/* Header */}
      <div className="page-header pt-24 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="section-label text-gold-400">Team Dashboard</span>
              <h1 className="text-headline text-white mb-1">
                Welcome, {user.displayName || user.email?.split('@')[0]}
              </h1>
              <p className="text-metal-300 text-xs font-mono">ID: {user.uid.slice(0, 12)}…</p>
            </div>

            {registration ? (
              <div className="flex items-center gap-3 bg-white/10 px-4 py-2.5 rounded-xl border border-white/20">
                <div>
                  <p className="text-[11px] text-metal-300">Team: <strong className="text-white">{registration.teamName}</strong></p>
                  <p className="text-[11px] text-gold-400">Task #{registration.taskId}: {registration.taskTitle}</p>
                </div>
              </div>
            ) : (
              <Link to="/register" className="btn-gold text-xs px-4 py-2">
                Complete Team Registration →
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user.emailVerified === false && (
          <div className="card p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-gold-500/30 bg-gold-500/5">
            <p className="text-xs text-metal-200">
              Your email address isn't verified yet. Verify it so you don't miss important updates about your registration.
            </p>
            <button
              onClick={handleResendVerification}
              disabled={verifyEmailStatus === 'sending' || verifyEmailStatus === 'sent'}
              className="btn-outline text-[11px] px-3 py-1.5 whitespace-nowrap disabled:opacity-60"
            >
              {verifyEmailStatus === 'sent'
                ? 'Verification email sent ✓'
                : verifyEmailStatus === 'sending'
                  ? 'Sending…'
                  : verifyEmailStatus === 'error'
                    ? 'Failed — try again'
                    : 'Resend verification email'}
            </button>
          </div>
        )}
        {regError && (
          <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Couldn't load your registration from Firestore</p>
              <p className="text-xs mt-1 opacity-90">
                {regErrorObj instanceof Error ? regErrorObj.message : 'Unknown error'}
              </p>
              <p className="text-xs mt-1 opacity-75">
                Most common causes: the Firestore database hasn't been created yet, or firestore.rules hasn't been published.
              </p>
            </div>
          </div>
        )}

        {/* Status Alert Banner */}
        {registration ? (
          <div className={cn(
            'p-4 rounded-2xl border mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4',
            registration.paymentStatus === 'verified'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : registration.paymentStatus === 'rejected'
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
          )}>
            <div className="flex items-center gap-3">
              {registration.paymentStatus === 'verified' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : registration.paymentStatus === 'rejected' ? (
                <XCircle className="w-5 h-5 text-red-600 shrink-0" />
              ) : (
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <div>
                <p className="font-bold text-sm">
                  Registration Status:{' '}
                  <span className="capitalize">{registration.paymentStatus}</span>
                  {registration.paymentStatus === 'pending' && ' — UTR Under Verification'}
                </p>
                <p className="text-xs opacity-80 mt-0.5">
                  Registration Pass ID: <strong>{registration.registrationId}</strong> | Transaction UTR: {registration.transactionId}
                </p>
              </div>
            </div>
            <Link to="/rules" className="text-xs font-semibold underline shrink-0">
              View Lab Guidelines →
            </Link>
          </div>
        ) : (
          <div className="p-4 bg-navy-50 border border-navy-200 rounded-2xl mb-6 flex items-center justify-between gap-4 text-navy-900">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-navy-700 shrink-0" />
              <div>
                <p className="font-bold text-sm">No Active Registration Found</p>
                <p className="text-xs text-navy-700">Register your team to unlock project submission and lab access.</p>
              </div>
            </div>
            <Link to="/register" className="btn-primary text-xs px-4 py-2 shrink-0">
              Register Now
            </Link>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-metal-200 mb-8 space-x-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'pb-3 text-sm font-semibold border-b-2 transition-colors',
              activeTab === 'overview'
                ? 'border-navy-900 text-navy-900'
                : 'border-transparent text-metal-500 hover:text-metal-800'
            )}
          >
            Overview &amp; Announcements
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={cn(
              'pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5',
              activeTab === 'submissions'
                ? 'border-navy-900 text-navy-900'
                : 'border-transparent text-metal-500 hover:text-metal-800'
            )}
          >
            Project Submissions
            {submissions.length > 0 && (
              <span className="bg-navy-100 text-navy-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {submissions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={cn(
              'pb-3 text-sm font-semibold border-b-2 transition-colors',
              activeTab === 'resources'
                ? 'border-navy-900 text-navy-900'
                : 'border-transparent text-metal-500 hover:text-metal-800'
            )}
          >
            Download Resources
          </button>
        </div>

        {/* Tab 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left 2 cols */}
            <div className="lg:col-span-2 space-y-6">
              {/* Task Details Card */}
              {assignedTask ? (
                <div className="card p-6 border-gold-200 bg-gradient-to-br from-white to-gold-50/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gold-700 bg-gold-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Assigned Problem Statement
                    </span>
                    <span className="text-xs font-semibold text-metal-500">Task #{assignedTask.id}</span>
                  </div>
                  <h3 className="text-title text-navy-900 font-bold mb-2">{assignedTask.title}</h3>
                  <p className="text-sm text-metal-600 leading-relaxed mb-4">{assignedTask.objectiveFull}</p>

                  <div className="border-t border-metal-100 pt-3">
                    <h4 className="text-xs font-bold text-metal-500 uppercase tracking-wider mb-2">Required WCE Lab Equipment Provided:</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {assignedTask.labEquipment.map((eq) => (
                        <span key={eq} className="text-xs bg-white border border-metal-200 text-metal-700 px-2.5 py-1 rounded-lg">
                          ✓ {eq}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card p-6 text-center py-10">
                  <BookOpen className="w-8 h-8 text-metal-400 mx-auto mb-2" />
                  <h3 className="font-bold text-navy-900 text-sm">No Task Assigned Yet</h3>
                  <p className="text-xs text-metal-500 mt-1 max-w-sm mx-auto">
                    Complete your team registration to lock in your task allocation.
                  </p>
                </div>
              )}

              {/* Team Details Card */}
              {registration && (
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-metal-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Users2 className="w-4 h-4 text-navy-700" />
                      <h3 className="font-bold text-navy-900 text-base">Team Details</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadRegistrationReceipt(registration)}
                        className="btn-outline text-xs px-3 py-1.5"
                      >
                        <Receipt className="w-3.5 h-3.5" /> Download Receipt
                      </button>
                      {editWindowOpen ? (
                        <button
                          onClick={() => setShowEditModal(true)}
                          className="btn-ghost text-xs px-3 py-1.5"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                      ) : (
                        <span className="text-[10px] text-metal-400 font-medium">Editing closed</span>
                      )}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                    <div>
                      <span className="text-metal-500 block">Team Name</span>
                      <span className="font-semibold text-navy-900">{registration.teamName}</span>
                    </div>
                    <div>
                      <span className="text-metal-500 block">College Name</span>
                      <span className="font-semibold text-navy-900">{registration.collegeName}</span>
                    </div>
                    <div>
                      <span className="text-metal-500 block">Leader</span>
                      <span className="font-semibold text-navy-900">{registration.leaderName} · {registration.leaderPhone}</span>
                    </div>
                    <div>
                      <span className="text-metal-500 block">Leader Email</span>
                      <span className="font-semibold text-navy-900">{registration.leaderEmail}</span>
                    </div>
                    <div>
                      <span className="text-metal-500 block">Members</span>
                      <span className="font-semibold text-navy-900">
                        {[registration.member1Name, registration.member2Name]
                          .filter(Boolean)
                          .join(', ') || 'Leader only'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-metal-400 shrink-0 mt-3" />
                      <div>
                        <span className="text-metal-500 block">Mentor</span>
                        <span className="font-semibold text-navy-900">
                          {registration.mentorName}
                          {registration.mentorEmail ? ` · ${registration.mentorEmail}` : ''}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-metal-500 block">Amount Paid</span>
                      <span className="font-bold text-gold-600">₹{registration.totalFee}</span>
                    </div>
                    <div>
                      <span className="text-metal-500 block">Razorpay Payment ID</span>
                      <span className="font-mono font-semibold text-navy-900">{registration.transactionId}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submissions Summary Preview */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-navy-900 text-base">Recent Submissions</h3>
                  <button onClick={() => setActiveTab('submissions')} className="text-xs text-navy-700 font-semibold hover:underline">
                    View All →
                  </button>
                </div>
                {submissions.length > 0 ? (
                  <div className="space-y-3">
                    {submissions.slice(0, 2).map((sub) => (
                      <div key={sub.id} className="p-3 bg-metal-50 rounded-xl border flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-navy-900">{sub.title}</p>
                          <p className="text-[11px] text-metal-500">{new Date(sub.submittedAt).toLocaleDateString()}</p>
                        </div>
                        <span className="badge badge-verified capitalize">{sub.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-metal-500 italic">No submissions uploaded yet.</p>
                )}
              </div>
            </div>

            {/* Right col: Live Announcements Feed */}
            <div className="space-y-6">
              <div className="card p-5">
                <div className="flex items-center gap-2 border-b border-metal-100 pb-3 mb-4">
                  <Megaphone className="w-4 h-4 text-gold-500" />
                  <h3 className="font-bold text-navy-900 text-sm">Announcements Feed</h3>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="p-3 rounded-xl bg-metal-50 border border-metal-100 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-navy-900">{ann.title}</span>
                        {ann.important && (
                          <span className="bg-gold-500 text-navy-950 font-bold px-1.5 py-0.5 rounded text-[10px]">
                            Important
                          </span>
                        )}
                      </div>
                      <p className="text-metal-600 leading-relaxed mb-2">{ann.content}</p>
                      <span className="text-[10px] text-metal-400 block text-right">
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: SUBMISSIONS */}
        {activeTab === 'submissions' && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Form */}
            <div className="card p-6 space-y-4">
              <h3 className="text-title text-navy-900 text-base font-bold border-b border-metal-100 pb-3">
                Upload New Deliverable / Methodology
              </h3>

              {submitSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" /> Project work submitted successfully!
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmissionSubmit)} className="space-y-4">
                <div>
                  <label className="form-label" htmlFor="subTitle">Submission Title *</label>
                  <input
                    {...register('title')}
                    id="subTitle"
                    className="form-input"
                    placeholder="e.g. Grain Boundary Quantification Phase 1 Report"
                  />
                  {errors.title && <p className="form-error">{errors.title.message}</p>}
                </div>

                <div>
                  <label className="form-label" htmlFor="subDesc">Technical Summary / Methodology *</label>
                  <textarea
                    {...register('description')}
                    id="subDesc"
                    rows={4}
                    className="form-input font-sans text-xs"
                    placeholder="Describe your experimental methodology, key parameters, observations, and findings..."
                  />
                  {errors.description && <p className="form-error">{errors.description.message}</p>}
                </div>

                <div>
                  <label className="form-label" htmlFor="codeSnippet">Python / Code Snippet (Optional for Computational tasks)</label>
                  <textarea
                    {...register('codeSnippet')}
                    id="codeSnippet"
                    rows={4}
                    className="form-input font-mono text-xs bg-metal-900 text-metal-100 placeholder:text-metal-500"
                    placeholder="# Insert OpenCV / Image analysis python code here..."
                  />
                </div>

                <div>
                  <label className="form-label">Attach File (PDF, ZIP, Image, Max 10MB)</label>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="form-input text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || uploading}
                  className="btn-primary w-full justify-center"
                >
                  <Upload className="w-4 h-4" />
                  {isSubmitting || uploading ? 'Uploading Deliverable…' : 'Submit Deliverable'}
                </button>
              </form>
            </div>

            {/* Submission History */}
            <div className="space-y-4">
              <h3 className="text-title text-navy-900 text-base font-bold border-b border-metal-100 pb-3">
                Submission History ({submissions.length})
              </h3>

              {subLoading ? (
                <div className="space-y-3">
                  <div className="skeleton h-24" />
                  <div className="skeleton h-24" />
                </div>
              ) : submissions.length > 0 ? (
                <div className="space-y-4">
                  {submissions.map((sub) => (
                    <div key={sub.id} className="card p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-navy-900 text-sm">{sub.title}</h4>
                        <span className="badge badge-verified capitalize text-[10px]">{sub.status}</span>
                      </div>
                      <p className="text-xs text-metal-600 leading-relaxed">{sub.description}</p>
                      {sub.codeSnippet && (
                        <div className="bg-metal-900 text-metal-200 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto max-h-32">
                          <pre>{sub.codeSnippet}</pre>
                        </div>
                      )}
                      {sub.fileName && (
                        <div className="flex items-center gap-2 text-xs text-navy-700 bg-navy-50 p-2 rounded-lg">
                          <FileText className="w-3.5 h-3.5" />
                          <span className="font-medium truncate">{sub.fileName}</span>
                        </div>
                      )}
                      <p className="text-[10px] text-metal-400 text-right">
                        Submitted at: {new Date(sub.submittedAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card p-8 text-center text-metal-500">
                  <p className="text-xs">No project work submitted yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: RESOURCES */}
        {activeTab === 'resources' && (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { title: 'Official AAYODHYAM Rulebook PDF', size: '1.2 MB', desc: 'Full event guidelines, safety rules, and WCE lab access schedule.' },
            ].map((res) => (
              <div key={res.title} className="card p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <FileText className="w-6 h-6 text-gold-600 mb-2" />
                  <h4 className="font-bold text-navy-900 text-sm">{res.title}</h4>
                  <p className="text-xs text-metal-500 leading-relaxed mt-1">{res.desc}</p>
                </div>
                <div className="flex items-center justify-between border-t border-metal-100 pt-3">
                  <span className="text-[11px] text-metal-400">{res.size}</span>
                  <a
                    href={rulebookPdf}
                    download="AAYODHYAM_2026_Rulebook.pdf"
                    className="btn-ghost text-xs py-1 px-2 text-navy-700"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Team Details Modal */}
      <AnimatePresence>
        {showEditModal && registration && registration.id && (
          <EditTeamDetailsModal
            registration={registration}
            onClose={() => { setShowEditModal(false); setEditSaved(false); }}
            onSave={async (fields) => {
              await updateDetails.mutateAsync({ id: registration.id!, fields });
              setEditSaved(true);
              setTimeout(() => {
                setEditSaved(false);
                setShowEditModal(false);
              }, 1200);
            }}
            saving={updateDetails.isPending}
            saved={editSaved}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

function EditTeamDetailsModal({
  registration,
  onClose,
  onSave,
  saving,
  saved,
}: {
  registration: NonNullable<ReturnType<typeof useRegistrationByUid>['data']>;
  onClose: () => void;
  onSave: (fields: EditDetailsFormData) => Promise<void>;
  saving: boolean;
  saved: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<EditDetailsFormData>({
    resolver: zodResolver(editDetailsSchema),
    defaultValues: {
      teamName: registration.teamName,
      leaderPhone: registration.leaderPhone,
      collegeName: registration.collegeName,
      member1Name: registration.member1Name || '',
      member2Name: registration.member2Name || '',
      mentorName: registration.mentorName,
      mentorEmail: registration.mentorEmail || '',
      mentorPhone: registration.mentorPhone || '',
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-950/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-elevated max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-navy-900 text-lg">Edit Team Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-metal-400 hover:bg-metal-100" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {saved ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" /> Changes saved.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSave)} className="space-y-4">
            <p className="text-xs text-metal-500">
              Your leader email, task, and payment details can't be changed here — contact the organizers for those.
            </p>

            <div>
              <label className="form-label" htmlFor="edit-teamName">Team Name</label>
              <input {...register('teamName')} id="edit-teamName" className="form-input" />
              {errors.teamName && <p className="form-error">{errors.teamName.message}</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label" htmlFor="edit-leaderPhone">Leader Contact Number</label>
                <input {...register('leaderPhone')} id="edit-leaderPhone" className="form-input" />
                {errors.leaderPhone && <p className="form-error">{errors.leaderPhone.message}</p>}
              </div>
              <div>
                <label className="form-label" htmlFor="edit-collegeName">College Name</label>
                <input {...register('collegeName')} id="edit-collegeName" className="form-input" />
                {errors.collegeName && <p className="form-error">{errors.collegeName.message}</p>}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label" htmlFor="edit-member1">Member 1 Name (Optional)</label>
                <input {...register('member1Name')} id="edit-member1" className="form-input" />
                {errors.member1Name && <p className="form-error">{errors.member1Name.message}</p>}
              </div>
              <div>
                <label className="form-label" htmlFor="edit-member2">Member 2 Name (Optional)</label>
                <input {...register('member2Name')} id="edit-member2" className="form-input" />
                {errors.member2Name && <p className="form-error">{errors.member2Name.message}</p>}
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="edit-mentorName">Mentor Name</label>
              <input {...register('mentorName')} id="edit-mentorName" className="form-input" />
              {errors.mentorName && <p className="form-error">{errors.mentorName.message}</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label" htmlFor="edit-mentorEmail">Mentor Email (Optional)</label>
                <input {...register('mentorEmail')} id="edit-mentorEmail" className="form-input" />
                {errors.mentorEmail && <p className="form-error">{errors.mentorEmail.message}</p>}
              </div>
              <div>
                <label className="form-label" htmlFor="edit-mentorPhone">Mentor Contact (Optional)</label>
                <input {...register('mentorPhone')} id="edit-mentorPhone" className="form-input" />
                {errors.mentorPhone && <p className="form-error">{errors.mentorPhone.message}</p>}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center text-xs">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center text-xs">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}