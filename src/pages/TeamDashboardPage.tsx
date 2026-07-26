import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  User,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Upload,
  Download,
  Code,
  Megaphone,
  Plus,
  AlertCircle,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { useAuth } from '@/contexts/AuthContext';
import {
  useRegistrationByUid,
  useSubmissionsByUid,
  useAnnouncements,
  useCreateSubmission,
  uploadFile,
} from '@/hooks/useFirestore';
import { PROBLEM_STATEMENTS } from '@/lib/problemStatements';
import { Submission } from '@/lib/types';
import { cn } from '@/lib/utils';

const submissionSchema = z.object({
  title: z.string().min(3, 'Submission title is required'),
  description: z.string().min(10, 'Technical methodology summary must be at least 10 characters'),
  codeSnippet: z.string().optional(),
});

type SubmissionFormData = z.infer<typeof submissionSchema>;

export default function TeamDashboardPage() {
  const { user } = useAuth();
  const { data: registration, isLoading: regLoading } = useRegistrationByUid(user?.uid);
  const { data: submissions = [], isLoading: subLoading } = useSubmissionsByUid(user?.uid);
  const { data: announcements = [] } = useAnnouncements();

  const createSubmission = useCreateSubmission();

  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'resources'>('overview');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

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
              { title: 'Technical Report Template (.docx)', size: '450 KB', desc: 'Standardized format for Friday final report submission.' },
              { title: 'ASTM E112 Micrograph Dataset', size: '15.4 MB', desc: 'Sample images for Computational Task #3 algorithm benchmarking.' },
              { title: 'Presentation Deck Template (.pptx)', size: '2.1 MB', desc: 'WCE-branded template for jury viva presentation.' },
            ].map((res) => (
              <div key={res.title} className="card p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <FileText className="w-6 h-6 text-gold-600 mb-2" />
                  <h4 className="font-bold text-navy-900 text-sm">{res.title}</h4>
                  <p className="text-xs text-metal-500 leading-relaxed mt-1">{res.desc}</p>
                </div>
                <div className="flex items-center justify-between border-t border-metal-100 pt-3">
                  <span className="text-[11px] text-metal-400">{res.size}</span>
                  <button onClick={() => alert('Downloading official resource file...')} className="btn-ghost text-xs py-1 px-2 text-navy-700">
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
