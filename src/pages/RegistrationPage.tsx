import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Users,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Clock,
  Lock,
} from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { useAuth } from '@/contexts/AuthContext';
import { useTaskRegistrationCounts, useRegistrationByUid, useRegistrationControl } from '@/hooks/useFirestore';
import { payWithRazorpay } from '@/lib/razorpay';
import { authFetch } from '@/lib/authFetch';
import { PROBLEM_STATEMENTS } from '@/lib/problemStatements';
import logoImg from '@/assets/logo.png';
import {
  BASE_REGISTRATION_FEE,
  HOME_DELIVERY_ADDON_FEE,
  MAX_TEAMS_PER_TASK,
  ORG,
} from '@/lib/constants';
import { Registration } from '@/lib/types';
import { cn } from '@/lib/utils';

// Fixed option list so "Year of Study" is always a clean, comparable
// value — a free-text box previously let a student type "BTech" into
// the year field instead of an actual year. Only 2nd and 3rd year are
// offered since that's who's eligible for AAYODHYAM (see homepage).
const YEAR_OPTIONS = ['2nd Year', '3rd Year'];

// ─────────────────────────────────────────────────
// Zod schemas per step
// ─────────────────────────────────────────────────
const step1Schema = z.object({
  teamName: z.string().min(3, 'Team name must be at least 3 characters'),
  leaderName: z.string().min(2, 'Leader name is required'),
  leaderEmail: z.string().email('Valid email is required'),
  leaderPhone: z.string().regex(/^[0-9]{10}$/, 'Must be a valid 10-digit mobile number'),
  collegeName: z.string().min(2, 'College name is required'),
  leaderYear: z.string().min(1, 'Year of study is required'),
  leaderBranch: z.string().min(1, 'Branch is required'),
  member1Name: z.union([z.string().min(2, 'Enter a valid name'), z.literal('')]).optional(),
  member1Year: z.string().optional(),
  member1Branch: z.string().optional(),
  member2Name: z.union([z.string().min(2, 'Enter a valid name'), z.literal('')]).optional(),
  member2Year: z.string().optional(),
  member2Branch: z.string().optional(),
  taskId: z.number({ message: 'Please select a problem statement' }),
});

const step2Schema = z.object({
  wantsHomeDelivery: z.boolean(),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

const DRAFT_KEY = 'aay_reg_draft';

export default function RegistrationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTaskId = searchParams.get('task') ? Number(searchParams.get('task')) : undefined;

  const taskCounts = useTaskRegistrationCounts();
  const { data: existingRegistration, isLoading: checkingExistingRegistration } = useRegistrationByUid(user?.uid);
  const qc = useQueryClient();

  const { data: regControl, isLoading: regControlLoading, isError: regControlError, refetch: refetchRegControl } = useRegistrationControl();
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch('/api/payment/cleanup-stale-holds', { method: 'POST' })
      .then(() => qc.invalidateQueries({ queryKey: ['taskCounts'] }))
      .catch(() => { });
  }, [qc]);

  useEffect(() => {
    if (!checkingExistingRegistration && existingRegistration) {
      navigate('/dashboard', { replace: true });
    }
  }, [checkingExistingRegistration, existingRegistration, navigate]);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [activeHold, setActiveHold] = useState<{ holdId: string; expiresAt: number } | null>(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number | null>(null);
  const activeHoldRef = useRef<{ holdId: string; expiresAt: number } | null>(null);
  const [completedRegistration, setCompletedRegistration] = useState<Registration | null>(null);

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      teamName: '',
      leaderName: user?.displayName || '',
      leaderEmail: user?.email || '',
      leaderPhone: '',
      collegeName: '',
      leaderYear: '',
      leaderBranch: '',
      member1Name: '',
      member1Year: '',
      member1Branch: '',
      member2Name: '',
      member2Year: '',
      member2Branch: '',
      taskId: defaultTaskId,
    },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      wantsHomeDelivery: false,
    },
  });

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.step1) step1Form.reset(parsed.step1);
        if (parsed.step2) step2Form.reset(parsed.step2);
      } catch { }
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (!step1Form.getValues('leaderEmail')) step1Form.setValue('leaderEmail', user.email || '');
      if (!step1Form.getValues('leaderName') && user.displayName) step1Form.setValue('leaderName', user.displayName);
    }
  }, [user]);

  useEffect(() => {
    if (defaultTaskId) {
      step1Form.setValue('taskId', defaultTaskId);
    }
  }, [defaultTaskId]);

  const selectedTaskId = step1Form.watch('taskId');
  const selectedTask = PROBLEM_STATEMENTS.find((p) => p.id === selectedTaskId);
  const wantsHomeDelivery = step2Form.watch('wantsHomeDelivery');

  const totalFee = BASE_REGISTRATION_FEE + (wantsHomeDelivery ? HOME_DELIVERY_ADDON_FEE : 0);

  const onStep1Submit = (data: Step1Data) => {
    const count = taskCounts[data.taskId] || 0;
    if (count >= MAX_TEAMS_PER_TASK) {
      step1Form.setError('taskId', { message: 'This problem statement has reached its 8-team cap. Please select another task.' });
      return;
    }
    const draft = { step1: data, step2: step2Form.getValues() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setStep(2);
  };

  const onStep2Submit = (data: Step2Data) => {
    const draft = { step1: step1Form.getValues(), step2: data };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setStep(3);
  };

  useEffect(() => {
    activeHoldRef.current = activeHold;
  }, [activeHold]);

  useEffect(() => {
    if (!activeHold) {
      setHoldSecondsLeft(null);
      return;
    }
    const tick = () => {
      const secondsLeft = Math.max(0, Math.round((activeHold.expiresAt - Date.now()) / 1000));
      setHoldSecondsLeft(secondsLeft);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeHold]);

  const releaseHold = async (holdId: string) => {
    try {
      await authFetch('/api/payment/release-hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdId }),
      });
    } catch {
      // Non-fatal — the hold will still expire on its own after 2 minutes.
    } finally {
      qc.invalidateQueries({ queryKey: ['taskCounts'] });
    }
  };

  useEffect(() => {
    const releaseActiveHold = () => {
      if (activeHoldRef.current) {
        navigator.sendBeacon?.(
          '/api/payment/release-hold',
          new Blob([JSON.stringify({ holdId: activeHoldRef.current.holdId })], { type: 'application/json' })
        );
      }
    };
    window.addEventListener('pagehide', releaseActiveHold);
    return () => {
      window.removeEventListener('pagehide', releaseActiveHold);
      releaseActiveHold();
    };
  }, []);

  const handleFinalSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setPaymentError(null);
    let holdId: string | undefined;
    try {
      const step1 = step1Form.getValues();
      const step2 = step2Form.getValues();

      const reserveRes = await authFetch('/api/payment/reserve-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: step1.taskId, uid: user.uid }),
      });
      const reserveBody = await reserveRes.json();
      if (!reserveRes.ok) {
        setPaymentError(reserveBody.error || 'This problem statement just reached its team cap. Please choose another before paying.');
        setIsSubmitting(false);
        qc.invalidateQueries({ queryKey: ['taskCounts'] });
        return;
      }
      holdId = reserveBody.holdId as string;
      setActiveHold({ holdId, expiresAt: reserveBody.expiresAt });
      qc.invalidateQueries({ queryKey: ['taskCounts'] });

      const paymentResult = await payWithRazorpay({
        wantsHomeDelivery: step2.wantsHomeDelivery,
        name: step1.leaderName,
        email: step1.leaderEmail,
        contact: step1.leaderPhone,
        taskId: step1.taskId,
        uid: user.uid,
        registration: {
          teamName: step1.teamName,
          leaderName: step1.leaderName,
          leaderEmail: step1.leaderEmail,
          leaderPhone: step1.leaderPhone,
          collegeName: step1.collegeName,
          leaderYear: step1.leaderYear,
          leaderBranch: step1.leaderBranch,
          member1Name: step1.member1Name || undefined,
          member1Year: step1.member1Year || undefined,
          member1Branch: step1.member1Branch || undefined,
          member2Name: step1.member2Name || undefined,
          member2Year: step1.member2Year || undefined,
          member2Branch: step1.member2Branch || undefined,
          taskId: step1.taskId,
          taskTitle: selectedTask?.title || 'Custom Problem Statement',
          uid: user.uid,
        },
      });

      const verifyRes = await authFetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentResult,
          holdId,
          registration: {
            teamName: step1.teamName,
            leaderName: step1.leaderName,
            leaderEmail: step1.leaderEmail,
            leaderPhone: step1.leaderPhone,
            collegeName: step1.collegeName,
            leaderYear: step1.leaderYear,
            leaderBranch: step1.leaderBranch,
            member1Name: step1.member1Name || undefined,
            member1Year: step1.member1Year || undefined,
            member1Branch: step1.member1Branch || undefined,
            member2Name: step1.member2Name || undefined,
            member2Year: step1.member2Year || undefined,
            member2Branch: step1.member2Branch || undefined,
            taskId: step1.taskId,
            taskTitle: selectedTask?.title || 'Custom Problem Statement',
            uid: user.uid,
            wantsHomeDelivery: step2.wantsHomeDelivery,
          },
        }),
      });

      const body = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(body.error || 'Payment verification failed. Please contact the organizers.');
      }

      localStorage.removeItem(DRAFT_KEY);

      setActiveHold(null);
      setCompletedRegistration(body as Registration);
      setStep(4);
    } catch (err) {
      console.error('Registration/payment error:', err);
      const message = err instanceof Error ? err.message : 'Something went wrong during payment. Please try again.';
      setPaymentError(
        message.includes('Payment window closed')
          ? 'Payment was cancelled. Your slot reservation has been released — you can try again anytime.'
          : message
      );
      if (holdId) {
        await releaseHold(holdId);
      }
      setActiveHold(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const opensAtDate = regControl ? new Date(regControl.opensAt) : null;
  const manuallyClosed = regControl?.manuallyClosed ?? false;
  const manuallyOpened = regControl?.manuallyOpened ?? false;
  const isBeforeOpen = opensAtDate ? nowTick < opensAtDate.getTime() : true;
  const registrationClosed = regControlLoading || manuallyClosed || (!manuallyOpened && isBeforeOpen);
  const msUntilOpen = opensAtDate ? Math.max(0, opensAtDate.getTime() - nowTick) : 0;
  const countdown = {
    days: Math.floor(msUntilOpen / 86_400_000),
    hours: Math.floor((msUntilOpen % 86_400_000) / 3_600_000),
    mins: Math.floor((msUntilOpen % 3_600_000) / 60_000),
    secs: Math.floor((msUntilOpen % 60_000) / 1_000),
  };

  if (regControlError) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center bg-metal-50 px-4 py-20">
          <div className="card p-8 max-w-md text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4 text-red-600">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-title text-navy-900 mb-2">Couldn't Check Registration Status</h2>
            <p className="text-sm text-metal-600 mb-6">
              Something went wrong loading the registration schedule. This is usually temporary — try again in a moment.
            </p>
            <button onClick={() => refetchRegControl()} className="btn-primary justify-center mx-auto">
              Retry
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (registrationClosed) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center bg-metal-50 px-4 py-20">
          <div className="card p-8 max-w-md text-center">
            <div className="w-14 h-14 rounded-2xl bg-gold-50 flex items-center justify-center mx-auto mb-4 text-gold-600">
              <Lock className="w-7 h-7" />
            </div>
            {regControlLoading ? (
              <p className="text-sm text-metal-500">Loading…</p>
            ) : manuallyClosed && msUntilOpen === 0 ? (
              <>
                <h2 className="text-title text-navy-900 mb-2">Registration Is Now Closed</h2>
                <p className="text-sm text-metal-600 mb-6">
                  Team registration for AAYODHYAM 2026 has closed. Thank you to everyone who registered — we look forward to seeing your work at the event. If you already registered, head to your Team Dashboard for updates. For any queries, reach out via the Contact page.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-title text-navy-900 mb-2">
                  {manuallyClosed ? 'Registration Is Currently Closed' : 'Registration Opens Soon'}
                </h2>
                <p className="text-sm text-metal-600 mb-5">
                  {manuallyClosed && (
                    <>Team registration for AAYODHYAM 2026 is temporarily closed. </>
                  )}
                  It's scheduled to {manuallyClosed ? 're' : ''}open on{' '}
                  <span className="font-semibold text-navy-900">
                    {opensAtDate?.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}
                  </span>
                  . This page unlocks automatically the moment it opens — no need to refresh.
                </p>
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {[
                    { label: 'Days', value: countdown.days },
                    { label: 'Hours', value: countdown.hours },
                    { label: 'Mins', value: countdown.mins },
                    { label: 'Secs', value: countdown.secs },
                  ].map((u) => (
                    <div key={u.label} className="bg-navy-50 rounded-xl py-3">
                      <p className="text-xl font-black text-navy-900 font-mono">{String(u.value).padStart(2, '0')}</p>
                      <p className="text-[10px] font-bold text-metal-500 uppercase tracking-wider">{u.label}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
            <Link to="/problem-statements" className="btn-outline justify-center">
              Browse Problem Statements
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!user) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center bg-metal-50 px-4 py-20">
          <div className="card p-8 max-w-md text-center">
            <div className="w-14 h-14 rounded-2xl bg-navy-50 flex items-center justify-center mx-auto mb-4 text-navy-900">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-title text-navy-900 mb-2">Authentication Required</h2>
            <p className="text-sm text-metal-600 mb-6">
              Please sign in or create an account to start your team registration for AAYODHYAM 2026.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                to="/signin"
                state={{ from: { pathname: '/register', search: defaultTaskId ? `?task=${defaultTaskId}` : '' } }}
                className="btn-primary justify-center"
              >
                Sign In to Continue
              </Link>
              <Link
                to="/signup"
                state={{ from: { pathname: '/register', search: defaultTaskId ? `?task=${defaultTaskId}` : '' } }}
                className="btn-outline justify-center"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="page-header pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="section-label text-gold-400">AAYODHYAM 2026</span>
          <h1 className="text-headline text-white mb-2">Team Registration</h1>
          <p className="text-metal-300 text-sm max-w-xl">
            Complete the multi-step registration wizard to reserve your slot in India's premier metallurgy hackathon.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {step <= 3 && (
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-metal-200 z-0" />
              {[
                { s: 1, label: 'Team & Task', icon: Users },
                { s: 2, label: 'Payment', icon: CreditCard },
                { s: 3, label: 'Review & Submit', icon: CheckCircle2 },
              ].map(({ s, label, icon: Icon }) => {
                const isCompleted = step > s;
                const isClickable = isCompleted && !isSubmitting;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => isClickable && setStep(s as 1 | 2 | 3)}
                    disabled={!isClickable}
                    className={cn(
                      'relative z-10 flex flex-col items-center bg-transparent border-none p-0',
                      isClickable ? 'cursor-pointer' : 'cursor-default'
                    )}
                    aria-label={isClickable ? `Go back to ${label}` : label}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                        step === s
                          ? 'bg-navy-900 text-white ring-4 ring-navy-100 shadow-navy'
                          : isCompleted
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-white border-2 border-metal-300 text-metal-500'
                      )}
                    >
                      {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span
                      className={cn(
                        'text-xs font-semibold mt-2 transition-colors',
                        step === s ? 'text-navy-900' : isClickable ? 'text-emerald-700' : 'text-metal-500'
                      )}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={step1Form.handleSubmit(onStep1Submit)}
              className="card p-6 space-y-6"
            >
              <div className="border-b border-metal-100 pb-4">
                <h2 className="text-title text-navy-900 text-lg font-bold">Step 1: Team & Task Selection</h2>
                <p className="text-xs text-metal-500 mt-1">
                  Enter your team leader and member details, then confirm your problem statement.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-metal-400 uppercase tracking-wider">Team Leader Details</h3>

                <div>
                  <label className="form-label" htmlFor="teamName">Team Name *</label>
                  <input
                    {...step1Form.register('teamName')}
                    id="teamName"
                    className={cn('form-input', step1Form.formState.errors.teamName && 'border-red-400')}
                    placeholder="e.g. Alloy Innovators"
                  />
                  {step1Form.formState.errors.teamName && (
                    <p className="form-error">{step1Form.formState.errors.teamName.message}</p>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label" htmlFor="leaderName">Team Leader's Name *</label>
                    <input
                      {...step1Form.register('leaderName')}
                      id="leaderName"
                      className={cn('form-input', step1Form.formState.errors.leaderName && 'border-red-400')}
                      placeholder="Full Name"
                    />
                    {step1Form.formState.errors.leaderName && (
                      <p className="form-error">{step1Form.formState.errors.leaderName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label" htmlFor="leaderEmail">Email *</label>
                    <input
                      {...step1Form.register('leaderEmail')}
                      id="leaderEmail"
                      type="email"
                      className={cn('form-input', step1Form.formState.errors.leaderEmail && 'border-red-400')}
                      placeholder="leader@college.edu"
                    />
                    {step1Form.formState.errors.leaderEmail && (
                      <p className="form-error">{step1Form.formState.errors.leaderEmail.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label" htmlFor="leaderPhone">Contact Number *</label>
                    <input
                      {...step1Form.register('leaderPhone')}
                      id="leaderPhone"
                      type="tel"
                      maxLength={10}
                      className={cn('form-input', step1Form.formState.errors.leaderPhone && 'border-red-400')}
                      placeholder="10-digit mobile number"
                    />
                    {step1Form.formState.errors.leaderPhone && (
                      <p className="form-error">{step1Form.formState.errors.leaderPhone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label" htmlFor="collegeName">College Name *</label>
                    <input
                      {...step1Form.register('collegeName')}
                      id="collegeName"
                      className={cn('form-input', step1Form.formState.errors.collegeName && 'border-red-400')}
                      placeholder="e.g. Walchand College of Engineering"
                    />
                    {step1Form.formState.errors.collegeName && (
                      <p className="form-error">{step1Form.formState.errors.collegeName.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label" htmlFor="leaderYear">Year of Study *</label>
                    <select
                      {...step1Form.register('leaderYear')}
                      id="leaderYear"
                      className={cn('form-input', step1Form.formState.errors.leaderYear && 'border-red-400')}
                    >
                      <option value="">Select year</option>
                      {YEAR_OPTIONS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    {step1Form.formState.errors.leaderYear && (
                      <p className="form-error">{step1Form.formState.errors.leaderYear.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label" htmlFor="leaderBranch">Branch *</label>
                    <input
                      {...step1Form.register('leaderBranch')}
                      id="leaderBranch"
                      className={cn('form-input', step1Form.formState.errors.leaderBranch && 'border-red-400')}
                      placeholder="e.g. Mechanical Engineering"
                    />
                    {step1Form.formState.errors.leaderBranch && (
                      <p className="form-error">{step1Form.formState.errors.leaderBranch.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-metal-100">
                <h3 className="text-xs font-bold text-metal-400 uppercase tracking-wider">Team Members (Optional)</h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label" htmlFor="member1Name">Member 1 Name (Optional)</label>
                    <input
                      {...step1Form.register('member1Name')}
                      id="member1Name"
                      className={cn('form-input', step1Form.formState.errors.member1Name && 'border-red-400')}
                      placeholder="Full Name"
                    />
                    {step1Form.formState.errors.member1Name && (
                      <p className="form-error">{step1Form.formState.errors.member1Name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label" htmlFor="member1Year">Member 1 Year of Study (Optional)</label>
                    <select {...step1Form.register('member1Year')} id="member1Year" className="form-input">
                      <option value="">Select year</option>
                      {YEAR_OPTIONS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label" htmlFor="member1Branch">Member 1 Branch (Optional)</label>
                    <input
                      {...step1Form.register('member1Branch')}
                      id="member1Branch"
                      className="form-input"
                      placeholder="e.g. Mechanical Engineering"
                    />
                  </div>
                  <div />
                </div>

                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="form-label" htmlFor="member2Name">Member 2 Name (Optional)</label>
                    <input
                      {...step1Form.register('member2Name')}
                      id="member2Name"
                      className={cn('form-input', step1Form.formState.errors.member2Name && 'border-red-400')}
                      placeholder="Full Name"
                    />
                    {step1Form.formState.errors.member2Name && (
                      <p className="form-error">{step1Form.formState.errors.member2Name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label" htmlFor="member2Year">Member 2 Year of Study (Optional)</label>
                    <select {...step1Form.register('member2Year')} id="member2Year" className="form-input">
                      <option value="">Select year</option>
                      {YEAR_OPTIONS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label" htmlFor="member2Branch">Member 2 Branch (Optional)</label>
                    <input
                      {...step1Form.register('member2Branch')}
                      id="member2Branch"
                      className="form-input"
                      placeholder="e.g. Mechanical Engineering"
                    />
                  </div>
                  <div />
                </div>
                <p className="text-xs text-metal-500">A team can be just the leader, or the leader plus up to 2 additional members (max team size: 3).</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-metal-100">
                <h3 className="text-xs font-bold text-metal-400 uppercase tracking-wider">Selected Problem Statement *</h3>

                {step1Form.formState.errors.taskId && (
                  <p className="text-xs text-red-600 font-semibold p-2.5 bg-red-50 rounded-lg border border-red-200">
                    {step1Form.formState.errors.taskId.message}
                  </p>
                )}

                {selectedTask && (taskCounts[selectedTask.id] || 0) < MAX_TEAMS_PER_TASK ? (
                  <div className="p-4 rounded-xl border border-navy-900 bg-navy-50 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-xs font-bold text-navy-900">#{selectedTask.id}</span>
                      </div>
                      <p className="text-sm font-semibold text-navy-900">{selectedTask.title}</p>
                    </div>
                    <Link
                      to="/problem-statements"
                      className="text-xs font-semibold text-navy-700 hover:text-navy-900 underline shrink-0 whitespace-nowrap"
                    >
                      Change
                    </Link>
                  </div>
                ) : (
                  <>
                    {selectedTaskId && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                        Your previously selected problem statement is now full. Please choose another below.
                      </p>
                    )}
                    {!selectedTaskId && (
                      <p className="text-xs text-metal-500">
                        No problem statement selected yet. Pick one below, or{' '}
                        <Link to="/problem-statements" className="text-navy-700 font-semibold underline">
                          browse all problem statements
                        </Link>.
                      </p>
                    )}
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {PROBLEM_STATEMENTS.map((ps) => {
                        const count = taskCounts[ps.id] || 0;
                        const isFull = count >= MAX_TEAMS_PER_TASK;
                        const isSelected = selectedTaskId === ps.id;

                        return (
                          <div
                            key={ps.id}
                            onClick={() => {
                              if (!isFull) step1Form.setValue('taskId', ps.id);
                            }}
                            className={cn(
                              'p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3',
                              isSelected
                                ? 'bg-navy-50 border-navy-900 ring-1 ring-navy-900'
                                : isFull
                                  ? 'bg-metal-50 border-metal-200 opacity-60 cursor-not-allowed'
                                  : 'bg-white border-metal-200 hover:border-navy-300'
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-navy-900">#{ps.id}</span>
                              </div>
                              <p className="text-sm font-semibold text-metal-900 truncate">{ps.title}</p>
                            </div>

                            <div className="text-right shrink-0">
                              <span
                                className={cn(
                                  'text-xs font-bold px-2.5 py-1 rounded-full block',
                                  isFull ? 'bg-red-100 text-red-700' : count >= 4 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                                )}
                              >
                                {count} / {MAX_TEAMS_PER_TASK} groups
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button type="submit" className="btn-primary">
                  Next: Payment <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.form>
          )}

          {step === 2 && (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={step2Form.handleSubmit(onStep2Submit)}
              className="card p-6 space-y-6"
            >
              <div className="border-b border-metal-100 pb-4">
                <h2 className="text-title text-navy-900 text-lg font-bold">Step 2: Registration Fee</h2>
                <p className="text-xs text-metal-500 mt-1">
                  Confirm your fee, then review your details before paying securely via Razorpay.
                </p>
              </div>

              <div className="bg-metal-50 p-5 rounded-2xl border border-metal-200">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-metal-600">Base Registration Fee:</span>
                  <span className="font-bold text-metal-900">₹{BASE_REGISTRATION_FEE}</span>
                </div>
                {wantsHomeDelivery && (
                  <div className="flex justify-between text-xs mb-1 text-gold-700 font-medium">
                    <span>Raw Material Delivery:</span>
                    <span>+₹{HOME_DELIVERY_ADDON_FEE}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-navy-900 border-t border-metal-200 pt-2 mt-1">
                  <span>Total Payable:</span>
                  <span className="text-gold-600">₹{totalFee}</span>
                </div>
              </div>

              <div className="p-3 bg-navy-50 border border-navy-100 rounded-xl flex items-start gap-2.5 text-xs text-navy-800">
                <ShieldCheck className="w-4 h-4 text-navy-700 shrink-0 mt-0.5" />
                <p>
                  Payment is collected securely through Razorpay on the next screen (UPI, cards, net banking, and wallets accepted). Your registration is only created after the payment is verified.
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Notice:</strong> WCE Lab facilities are for final testing & microstructural evaluation only during jury rounds. Heat treatment and specimen pre-processing must be completed at your home institution.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button type="button" onClick={() => setStep(1)} className="btn-ghost text-xs">
                  <ChevronLeft className="w-4 h-4" /> Back to Team Details
                </button>
                <button type="submit" className="btn-primary">
                  Review &amp; Submit <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.form>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="card p-6 space-y-6"
            >
              <div className="border-b border-metal-100 pb-4">
                <h2 className="text-title text-navy-900 text-lg font-bold">Step 3: Review Registration</h2>
                <p className="text-xs text-metal-500 mt-1">
                  Verify your details before final submission. Once submitted, slot reservation is locked.
                </p>
              </div>

              <div className="space-y-4 divide-y divide-metal-100 text-sm">
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold text-metal-400 uppercase tracking-wider">Team Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-metal-500">Team Name:</span>
                      <p className="font-semibold text-navy-900">{step1Form.getValues('teamName')}</p>
                    </div>
                    <div>
                      <span className="text-metal-500">College Name:</span>
                      <p className="font-semibold text-navy-900">{step1Form.getValues('collegeName')}</p>
                    </div>
                    <div>
                      <span className="text-metal-500">Leader Name:</span>
                      <p className="font-semibold text-navy-900">{step1Form.getValues('leaderName')}</p>
                    </div>
                    <div>
                      <span className="text-metal-500">Leader Year / Branch:</span>
                      <p className="font-semibold text-navy-900">
                        {step1Form.getValues('leaderYear')} · {step1Form.getValues('leaderBranch')}
                      </p>
                    </div>
                    <div>
                      <span className="text-metal-500">Leader Email:</span>
                      <p className="font-semibold text-navy-900">{step1Form.getValues('leaderEmail')}</p>
                    </div>
                    <div>
                      <span className="text-metal-500">Leader Contact:</span>
                      <p className="font-semibold text-navy-900">{step1Form.getValues('leaderPhone')}</p>
                    </div>
                    {step1Form.getValues('member1Name') && (
                      <div>
                        <span className="text-metal-500">Member 1:</span>
                        <p className="font-semibold text-navy-900">
                          {step1Form.getValues('member1Name')}
                          {(step1Form.getValues('member1Year') || step1Form.getValues('member1Branch')) &&
                            ` (${[step1Form.getValues('member1Year'), step1Form.getValues('member1Branch')].filter(Boolean).join(' · ')})`}
                        </p>
                      </div>
                    )}
                    {step1Form.getValues('member2Name') && (
                      <div>
                        <span className="text-metal-500">Member 2:</span>
                        <p className="font-semibold text-navy-900">
                          {step1Form.getValues('member2Name')}
                          {(step1Form.getValues('member2Year') || step1Form.getValues('member2Branch')) &&
                            ` (${[step1Form.getValues('member2Year'), step1Form.getValues('member2Branch')].filter(Boolean).join(' · ')})`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <h3 className="text-xs font-bold text-metal-400 uppercase tracking-wider">Selected Task</h3>
                  <div className="p-3 bg-navy-50 rounded-xl border border-navy-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-navy-900">#{selectedTask?.id}</span>
                    </div>
                    <p className="font-bold text-navy-900">{selectedTask?.title}</p>
                    <p className="text-xs text-metal-600 mt-1">{selectedTask?.objective}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <h3 className="text-xs font-bold text-metal-400 uppercase tracking-wider">Payment</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-metal-500">Amount to Pay:</span>
                      <p className="font-bold text-gold-600">₹{totalFee}</p>
                    </div>
                    <div>
                      <span className="text-metal-500">Payment Method:</span>
                      <p className="font-semibold text-navy-900">Razorpay (UPI / Card / Net Banking)</p>
                    </div>
                  </div>
                </div>
              </div>

              {paymentError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{paymentError}</p>
                </div>
              )}

              {activeHold && holdSecondsLeft !== null && holdSecondsLeft > 0 && (
                <div className="p-3 bg-navy-50 border border-navy-200 rounded-xl text-xs text-navy-800 flex items-center gap-2.5">
                  <Clock className="w-4 h-4 shrink-0 text-navy-700" />
                  <p>
                    Your slot is reserved for{' '}
                    <span className="font-mono font-bold">
                      {Math.floor(holdSecondsLeft / 60)}:{String(holdSecondsLeft % 60).padStart(2, '0')}
                    </span>{' '}
                    — complete payment before it releases back to other teams.
                  </p>
                </div>
              )}

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                <p className="font-semibold mb-1">✓ Secure Payment & Storage</p>
                <p>Clicking below opens Razorpay's secure checkout. Your registration is created in our database only after the payment is verified server-side.</p>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button type="button" onClick={() => setStep(2)} className="btn-ghost text-xs" disabled={isSubmitting}>
                  <ChevronLeft className="w-4 h-4" /> Back to Fee Details
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="btn-gold px-6 py-3 font-bold"
                >
                  {isSubmitting ? 'Processing Payment…' : `Pay ₹${totalFee} & Complete Registration`}
                  {!isSubmitting && <Sparkles className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && completedRegistration && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-headline text-navy-900">Registration Complete!</h2>
                <p className="text-sm text-metal-600 max-w-md mx-auto mt-1">
                  Your team has been registered for AAYODHYAM 2026. Keep your digital pass for verification.
                </p>
              </div>

              <div id="registration-pass" className="card border-2 border-navy-900 p-6 bg-gradient-to-br from-white to-navy-50 relative overflow-hidden shadow-elevated">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between border-b border-navy-900/10 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center overflow-hidden">
                      <img src={logoImg} alt="AAYODHYAM logo" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-bold text-navy-900 text-sm leading-none">AAYODHYAM 2026</h3>
                      <p className="text-[10px] text-metal-500">Official Team Registration Pass</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold bg-navy-900 text-gold-400 px-3 py-1 rounded-full">
                      {completedRegistration.registrationId}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                  <div>
                    <span className="text-metal-500 block">Team Name:</span>
                    <span className="font-bold text-navy-900 text-sm">{completedRegistration.teamName}</span>
                  </div>
                  <div>
                    <span className="text-metal-500 block">Leader Name:</span>
                    <span className="font-bold text-navy-900 text-sm">{completedRegistration.leaderName}</span>
                  </div>
                  <div>
                    <span className="text-metal-500 block">Allocated Task:</span>
                    <span className="font-semibold text-navy-900">
                      #{completedRegistration.taskId}: {completedRegistration.taskTitle}
                    </span>
                  </div>
                  <div>
                    <span className="text-metal-500 block">College Name:</span>
                    <span className="font-semibold text-navy-900">{completedRegistration.collegeName}</span>
                  </div>
                  <div>
                    <span className="text-metal-500 block">Payment Status:</span>
                    <span className="badge badge-verified">Payment Verified</span>
                  </div>
                  <div>
                    <span className="text-metal-500 block">Razorpay Payment ID:</span>
                    <span className="font-mono font-semibold text-navy-900 uppercase">{completedRegistration.transactionId}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-navy-900/10 flex items-center justify-between text-[11px] text-metal-500">
                  <span>Department of Metallurgy &amp; Materials Engg, WCE Sangli</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => window.print()}
                  className="btn-outline text-xs px-5 py-2.5"
                >
                  <Printer className="w-4 h-4" /> Print / Save Pass
                </button>
                <Link to="/dashboard" className="btn-primary text-xs px-5 py-2.5">
                  Go to Team Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}