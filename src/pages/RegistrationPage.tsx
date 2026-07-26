import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Users,
  CreditCard,
  CheckCircle2,
  Copy,
  AlertTriangle,
  Upload,
  Printer,
  Download,
  ArrowRight,
  ShieldCheck,
  Building,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { useAuth } from '@/contexts/AuthContext';
import { useTaskRegistrationCounts, useCreateRegistration, uploadFile } from '@/hooks/useFirestore';
import { PROBLEM_STATEMENTS } from '@/lib/problemStatements';
import {
  BASE_REGISTRATION_FEE,
  HOME_DELIVERY_ADDON_FEE,
  UPI_ID,
  UPI_PAYEE_NAME,
  UPI_TRANSACTION_NOTE,
  MAX_TEAMS_PER_TASK,
  ORG,
} from '@/lib/constants';
import { Registration } from '@/lib/types';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────
// Zod schemas per step
// ─────────────────────────────────────────────────
const step1Schema = z.object({
  teamName: z.string().min(3, 'Team name must be at least 3 characters'),
  leaderName: z.string().min(2, 'Leader name is required'),
  leaderEmail: z.string().email('Valid email is required'),
  leaderPhone: z.string().regex(/^[0-9]{10}$/, 'Must be a valid 10-digit mobile number'),
  member2: z.string().optional(),
  member3: z.string().optional(),
  department: z.string().min(2, 'Department is required'),
  year: z.string().min(1, 'Academic year is required'),
  taskId: z.number({ message: 'Please select a problem statement' }),
});

const step2Schema = z.object({
  transactionId: z.string().min(6, 'UTR / Transaction ID must be at least 6 characters'),
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
  const createReg = useCreateRegistration();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedRegistration, setCompletedRegistration] = useState<Registration | null>(null);

  // Form states
  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      teamName: '',
      leaderName: user?.displayName || '',
      leaderEmail: user?.email || '',
      leaderPhone: '',
      member2: '',
      member3: '',
      department: 'Metallurgy & Materials Engineering',
      year: '3rd Year B.Tech',
      taskId: defaultTaskId,
    },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      transactionId: '',
      wantsHomeDelivery: false,
    },
  });

  // Restore draft from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.step1) step1Form.reset(parsed.step1);
        if (parsed.step2) step2Form.reset(parsed.step2);
      } catch {}
    }
  }, []);

  // Sync leader email/name if user loads after mount
  useEffect(() => {
    if (user) {
      if (!step1Form.getValues('leaderEmail')) step1Form.setValue('leaderEmail', user.email || '');
      if (!step1Form.getValues('leaderName') && user.displayName) step1Form.setValue('leaderName', user.displayName);
    }
  }, [user]);

  // Handle task selection auto-preselect from query param
  useEffect(() => {
    if (defaultTaskId) {
      step1Form.setValue('taskId', defaultTaskId);
    }
  }, [defaultTaskId]);

  const selectedTaskId = step1Form.watch('taskId');
  const selectedTask = PROBLEM_STATEMENTS.find((p) => p.id === selectedTaskId);
  const wantsHomeDelivery = step2Form.watch('wantsHomeDelivery');

  const totalFee = BASE_REGISTRATION_FEE + (wantsHomeDelivery ? HOME_DELIVERY_ADDON_FEE : 0);

  // UPI deep link for QR code
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_PAYEE_NAME)}&am=${totalFee}&cu=INR&tn=${encodeURIComponent(UPI_TRANSACTION_NOTE)}`;

  // Require auth to start
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
              <Link to="/signin" state={{ from: { pathname: '/register' } }} className="btn-primary justify-center">
                Sign In to Continue
              </Link>
              <Link to="/signup" className="btn-outline justify-center">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Step 1 Submit -> Step 2
  const onStep1Submit = (data: Step1Data) => {
    // Check if task is full
    const count = taskCounts[data.taskId] || 0;
    if (count >= MAX_TEAMS_PER_TASK) {
      step1Form.setError('taskId', { message: 'This problem statement has reached its 5-team cap. Please select another task.' });
      return;
    }
    // Save draft
    const draft = { step1: data, step2: step2Form.getValues() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setStep(2);
  };

  // Step 2 Submit -> Step 3 (Review)
  const onStep2Submit = (data: Step2Data) => {
    const draft = { step1: step1Form.getValues(), step2: data };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setStep(3);
  };

  // Handle screenshot file upload
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
      const url = URL.createObjectURL(file);
      setScreenshotPreview(url);
    }
  };

  // Final submit
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const step1 = step1Form.getValues();
      const step2 = step2Form.getValues();

      // Generate Registration ID (format AAY-XXXXXX)
      const randomId = Math.floor(100000 + Math.random() * 900000);
      const regId = `AAY-${randomId}`;

      let screenshotUrl: string | undefined = undefined;

      if (screenshotFile) {
        try {
          screenshotUrl = await uploadFile(screenshotFile, `payment-screenshots/${regId}_${Date.now()}_${screenshotFile.name}`);
        } catch (err) {
          console.warn('Screenshot upload failed, continuing with registration:', err);
        }
      }

      const regData: Omit<Registration, 'id'> = {
        registrationId: regId,
        teamName: step1.teamName,
        leaderName: step1.leaderName,
        leaderEmail: step1.leaderEmail,
        leaderPhone: step1.leaderPhone,
        member2: step1.member2 || undefined,
        member3: step1.member3 || undefined,
        department: step1.department,
        year: step1.year,
        taskId: step1.taskId,
        taskTitle: selectedTask?.title || 'Custom Problem Statement',
        transactionId: step2.transactionId,
        paymentScreenshotUrl: screenshotUrl,
        paymentStatus: 'pending',
        uid: user.uid,
        wantsHomeDelivery: step2.wantsHomeDelivery,
        totalFee,
        createdAt: new Date().toISOString(),
      };

      await createReg.mutateAsync(regData);

      // Clear local draft
      localStorage.removeItem(DRAFT_KEY);

      setCompletedRegistration(regData as Registration);
      setStep(4); // Pass confirmation screen
    } catch (err) {
      console.error('Registration submit error:', err);
      alert('An error occurred while submitting your registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyUpi = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

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
        {/* Step Indicator (Steps 1 to 3) */}
        {step <= 3 && (
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-metal-200 z-0" />
              {[
                { s: 1, label: 'Team & Task', icon: Users },
                { s: 2, label: 'Payment', icon: CreditCard },
                { s: 3, label: 'Review & Submit', icon: CheckCircle2 },
              ].map(({ s, label, icon: Icon }) => (
                <div key={s} className="relative z-10 flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                      step === s
                        ? 'bg-navy-900 text-white ring-4 ring-navy-100 shadow-navy'
                        : step > s
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white border-2 border-metal-300 text-metal-500'
                    )}
                  >
                    {step > s ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-semibold mt-2 transition-colors',
                      step === s ? 'text-navy-900' : 'text-metal-500'
                    )}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {/* STEP 1: TEAM & TASK */}
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
                  Enter your team details and select a problem statement slot (max 3 members per team).
                </p>
              </div>

              {/* Leader Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-metal-400 uppercase tracking-wider">Team Leader Details</h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label" htmlFor="leaderName">Leader Name *</label>
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
                    <label className="form-label" htmlFor="leaderEmail">Leader Email *</label>
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

                <div>
                  <label className="form-label" htmlFor="leaderPhone">WhatsApp / Mobile Number *</label>
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
              </div>

              {/* Team Info */}
              <div className="space-y-4 pt-4 border-t border-metal-100">
                <h3 className="text-xs font-bold text-metal-400 uppercase tracking-wider">Team & College Info</h3>

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
                    <label className="form-label" htmlFor="department">Department / Institution *</label>
                    <input
                      {...step1Form.register('department')}
                      id="department"
                      className={cn('form-input', step1Form.formState.errors.department && 'border-red-400')}
                      placeholder="e.g. Metallurgy & Materials Engg, COEP"
                    />
                    {step1Form.formState.errors.department && (
                      <p className="form-error">{step1Form.formState.errors.department.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label" htmlFor="year">Academic Year *</label>
                    <select
                      {...step1Form.register('year')}
                      id="year"
                      className="form-input"
                    >
                      <option value="1st Year B.Tech">1st Year B.Tech</option>
                      <option value="2nd Year B.Tech">2nd Year B.Tech</option>
                      <option value="3rd Year B.Tech">3rd Year B.Tech</option>
                      <option value="Final Year B.Tech">Final Year B.Tech</option>
                      <option value="M.Tech (1st Year)">M.Tech (1st Year)</option>
                      <option value="M.Tech (2nd Year)">M.Tech (2nd Year)</option>
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label" htmlFor="member2">Member 2 Name (Optional)</label>
                    <input
                      {...step1Form.register('member2')}
                      id="member2"
                      className="form-input"
                      placeholder="Full Name"
                    />
                  </div>

                  <div>
                    <label className="form-label" htmlFor="member3">Member 3 Name (Optional)</label>
                    <input
                      {...step1Form.register('member3')}
                      id="member3"
                      className="form-input"
                      placeholder="Full Name"
                    />
                  </div>
                </div>
                <p className="text-xs text-metal-500">Note: Hard cap of 3 members per team (Leader + up to 2 members).</p>
              </div>

              {/* Task Selection */}
              <div className="space-y-4 pt-4 border-t border-metal-100">
                <h3 className="text-xs font-bold text-metal-400 uppercase tracking-wider">Select Problem Statement *</h3>

                {step1Form.formState.errors.taskId && (
                  <p className="text-xs text-red-600 font-semibold p-2.5 bg-red-50 rounded-lg border border-red-200">
                    {step1Form.formState.errors.taskId.message}
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
                            <span className="text-xs font-semibold text-metal-500 bg-metal-100 px-2 py-0.5 rounded">
                              {ps.category}
                            </span>
                            <span className={cn('badge text-[10px]', ps.difficulty === 'Medium' ? 'badge-medium' : ps.difficulty === 'Hard' ? 'badge-hard' : 'badge-advanced')}>
                              {ps.difficulty}
                            </span>
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
              </div>

              <div className="pt-4 flex justify-end">
                <button type="submit" className="btn-primary">
                  Next: Payment <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.form>
          )}

          {/* STEP 2: PAYMENT */}
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
                <h2 className="text-title text-navy-900 text-lg font-bold">Step 2: Registration Payment</h2>
                <p className="text-xs text-metal-500 mt-1">
                  Scan the UPI QR code to complete payment and enter your transaction/UTR ID.
                </p>
              </div>

              {/* Payment Details & QR */}
              <div className="grid md:grid-cols-2 gap-6 items-center bg-metal-50 p-5 rounded-2xl border border-metal-200">
                <div className="flex flex-col items-center text-center p-3 bg-white rounded-xl border border-metal-200 shadow-sm">
                  <div className="p-3 bg-white rounded-lg">
                    <QRCode value={upiDeepLink} size={160} level="M" />
                  </div>
                  <p className="text-xs font-bold text-navy-900 mt-2">Scan with Google Pay, PhonePe, Paytm or BHIM</p>
                  <p className="text-[11px] text-metal-500">Amount: ₹{totalFee}</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-bold text-metal-400 uppercase tracking-wider">Payee UPI ID</span>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-white px-3 py-1.5 rounded-lg border text-xs font-mono font-bold text-navy-900 flex-1 truncate">
                        {UPI_ID}
                      </code>
                      <button
                        type="button"
                        onClick={copyUpi}
                        className="btn-ghost text-xs px-2.5 py-1.5 shrink-0"
                      >
                        {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedUpi ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-metal-200 pt-3">
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
                </div>
              </div>

              {/* Add-on Option */}
              <div className="p-4 bg-gold-50/50 border border-gold-200 rounded-xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id="homeDelivery"
                  {...step2Form.register('wantsHomeDelivery')}
                  className="mt-1 rounded border-gold-300 text-gold-600 focus:ring-gold-500"
                />
                <label htmlFor="homeDelivery" className="text-xs text-metal-700 cursor-pointer">
                  <span className="font-bold text-navy-900 block mb-0.5">
                    Optional Add-on: Request Home / College Delivery of Raw Materials (+₹300)
                  </span>
                  Check this box if your team requires pre-characterized raw steel specimens shipped directly to your institution prior to the hackathon.
                </label>
              </div>

              {/* Transaction ID & Screenshot */}
              <div className="space-y-4 pt-4 border-t border-metal-100">
                <div>
                  <label className="form-label" htmlFor="transactionId">
                    UPI / UTR Transaction Reference ID *
                  </label>
                  <input
                    {...step2Form.register('transactionId')}
                    id="transactionId"
                    className={cn('form-input font-mono uppercase', step2Form.formState.errors.transactionId && 'border-red-400')}
                    placeholder="e.g. 324589012345"
                  />
                  {step2Form.formState.errors.transactionId && (
                    <p className="form-error">{step2Form.formState.errors.transactionId.message}</p>
                  )}
                  <p className="text-[11px] text-metal-500 mt-1">
                    Enter the 12-digit UTR or Reference Number from your payment confirmation screen.
                  </p>
                </div>

                <div>
                  <label className="form-label">Payment Screenshot (Optional)</label>
                  <div className="flex items-center gap-4">
                    <label className="btn-outline text-xs cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      Choose Image
                      <input type="file" accept="image/*" onChange={handleScreenshotChange} className="hidden" />
                    </label>
                    {screenshotFile && (
                      <span className="text-xs text-emerald-600 font-medium truncate max-w-xs">
                        ✓ {screenshotFile.name}
                      </span>
                    )}
                  </div>
                  {screenshotPreview && (
                    <img src={screenshotPreview} alt="Payment Preview" className="mt-2 h-20 rounded-lg border object-cover" />
                  )}
                </div>
              </div>

              {/* WCE Lab Usage Policy Notice */}
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

          {/* STEP 3: REVIEW & SUBMIT */}
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
                {/* Team Info Summary */}
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold text-metal-400 uppercase tracking-wider">Team Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-metal-500">Team Name:</span>
                      <p className="font-semibold text-navy-900">{step1Form.getValues('teamName')}</p>
                    </div>
                    <div>
                      <span className="text-metal-500">Leader Name:</span>
                      <p className="font-semibold text-navy-900">{step1Form.getValues('leaderName')}</p>
                    </div>
                    <div>
                      <span className="text-metal-500">Leader Email:</span>
                      <p className="font-semibold text-navy-900">{step1Form.getValues('leaderEmail')}</p>
                    </div>
                    <div>
                      <span className="text-metal-500">WhatsApp / Phone:</span>
                      <p className="font-semibold text-navy-900">{step1Form.getValues('leaderPhone')}</p>
                    </div>
                    <div>
                      <span className="text-metal-500">Department / College:</span>
                      <p className="font-semibold text-navy-900">{step1Form.getValues('department')}</p>
                    </div>
                    <div>
                      <span className="text-metal-500">Academic Year:</span>
                      <p className="font-semibold text-navy-900">{step1Form.getValues('year')}</p>
                    </div>
                    {step1Form.getValues('member2') && (
                      <div>
                        <span className="text-metal-500">Member 2:</span>
                        <p className="font-semibold text-navy-900">{step1Form.getValues('member2')}</p>
                      </div>
                    )}
                    {step1Form.getValues('member3') && (
                      <div>
                        <span className="text-metal-500">Member 3:</span>
                        <p className="font-semibold text-navy-900">{step1Form.getValues('member3')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Task Selection Summary */}
                <div className="space-y-2 pt-4">
                  <h3 className="text-xs font-bold text-metal-400 uppercase tracking-wider">Selected Task</h3>
                  <div className="p-3 bg-navy-50 rounded-xl border border-navy-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-navy-900">#{selectedTask?.id}</span>
                      <span className="text-xs font-semibold text-metal-500 bg-white px-2 py-0.5 rounded">
                        {selectedTask?.category}
                      </span>
                    </div>
                    <p className="font-bold text-navy-900">{selectedTask?.title}</p>
                    <p className="text-xs text-metal-600 mt-1">{selectedTask?.objective}</p>
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="space-y-2 pt-4">
                  <h3 className="text-xs font-bold text-metal-400 uppercase tracking-wider">Payment Details</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-metal-500">Transaction Ref / UTR:</span>
                      <p className="font-mono font-bold text-navy-900 uppercase">{step2Form.getValues('transactionId')}</p>
                    </div>
                    <div>
                      <span className="text-metal-500">Total Fee Paid:</span>
                      <p className="font-bold text-gold-600">₹{totalFee}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                <p className="font-semibold mb-1">✓ Secure Data Storage</p>
                <p>Your team registration will be securely stored in the AAYODHYAM 2026 database. Payment verification is typically completed within 12 hours.</p>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button type="button" onClick={() => setStep(2)} className="btn-ghost text-xs">
                  <ChevronLeft className="w-4 h-4" /> Back to Payment
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="btn-gold px-6 py-3 font-bold"
                >
                  {isSubmitting ? 'Confirming Registration…' : 'Submit & Generate Pass'}
                  {!isSubmitting && <Sparkles className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: REGISTRATION PASS CONFIRMATION */}
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

              {/* Digital Pass Card */}
              <div id="registration-pass" className="card border-2 border-navy-900 p-6 bg-gradient-to-br from-white to-navy-50 relative overflow-hidden shadow-elevated">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between border-b border-navy-900/10 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center">
                      <span className="text-gold-400 font-display font-black text-xs">Aa</span>
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
                    <span className="text-metal-500 block">Department / College:</span>
                    <span className="font-semibold text-navy-900">{completedRegistration.department}</span>
                  </div>
                  <div>
                    <span className="text-metal-500 block">Payment Status:</span>
                    <span className="badge badge-pending">Verification Pending</span>
                  </div>
                  <div>
                    <span className="text-metal-500 block">Transaction Ref:</span>
                    <span className="font-mono font-semibold text-navy-900 uppercase">{completedRegistration.transactionId}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-navy-900/10 flex items-center justify-between text-[11px] text-metal-500">
                  <span>Department of Metallurgy &amp; Materials Engg, WCE Sangli</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
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
