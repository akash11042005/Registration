import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle, LogIn, Globe } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { useAuth } from '@/contexts/AuthContext';
import { ADMIN_LOGIN_USERNAME, ADMIN_LOGIN_EMAIL, ADMIN_EMAILS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().min(1, 'Enter your email or username').refine(
    (val) => val.trim().toLowerCase() === ADMIN_LOGIN_USERNAME || z.string().email().safeParse(val.trim()).success,
    { message: 'Enter a valid email address' }
  ),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function SignInPage() {
  const { signInWithEmail, signInWithGoogle, authError, clearAuthError, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetInitialEmail, setResetInitialEmail] = useState('');

  const from = (location.state as { from?: { pathname: string; search?: string } })?.from;
  const fromPath = from ? `${from.pathname}${from.search || ''}` : '/';

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const destinationFor = (email: string) =>
    ADMIN_EMAILS.includes(email.trim().toLowerCase()) ? '/admin' : fromPath;

  const onSubmit = async (data: FormData) => {
    try {
      clearAuthError();
      const identifier = data.email.trim().toLowerCase() === ADMIN_LOGIN_USERNAME
        ? ADMIN_LOGIN_EMAIL
        : data.email.trim();
      const signedInUser = await signInWithEmail(identifier, data.password);
      navigate(destinationFor(signedInUser.email), { replace: true });
    } catch { }
  };

  const handleGoogle = async () => {
    try {
      setGoogleLoading(true);
      clearAuthError();
      const signedInUser = await signInWithGoogle();
      navigate(destinationFor(signedInUser.email), { replace: true });
    } catch {
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center bg-metal-50 py-16 px-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-navy-900 flex items-center justify-center mx-auto mb-3">
              <span className="text-gold-400 font-display font-black">Aa</span>
            </div>
            <h1 className="text-xl font-bold text-navy-900">Sign in to AAYODHYAM</h1>
            <p className="text-sm text-metal-500 mt-1">Access your team dashboard and registration</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 space-y-5"
          >
            {/* Google */}
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border-2 border-metal-200 bg-white text-sm font-semibold text-metal-800 hover:border-navy-300 hover:bg-metal-50 transition-all disabled:opacity-50"
            >
              <Globe className="w-4 h-4 text-blue-600" />
              {googleLoading ? 'Connecting…' : 'Continue with Google'}
            </button>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-metal-200" />
              <span className="text-xs text-metal-400 font-medium">or sign in with email</span>
              <div className="flex-1 h-px bg-metal-200" />
            </div>

            {authError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {authError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="form-label" htmlFor="email">Email or Admin Username</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-metal-400" />
                  <input
                    {...register('email')}
                    id="email"
                    type="text"
                    autoComplete="username"
                    className={cn('form-input pl-10', errors.email && 'border-red-400')}
                    placeholder="you@college.edu or admin"
                  />
                </div>
                {errors.email && <p className="form-error"><AlertCircle className="w-3 h-3" />{errors.email.message}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="form-label mb-0" htmlFor="password">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      const typed = (watch('email') || '').trim();
                      setResetInitialEmail(typed.includes('@') ? typed : '');
                      setShowReset(true);
                    }}
                    className="text-xs text-navy-700 hover:text-navy-900 underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-metal-400" />
                  <input
                    {...register('password')}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={cn('form-input pl-10 pr-10', errors.password && 'border-red-400')}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-metal-400 hover:text-metal-700"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="form-error"><AlertCircle className="w-3 h-3" />{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full justify-center"
              >
                <LogIn className="w-4 h-4" />
                {isSubmitting ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-xs text-metal-500">
              Don't have an account?{' '}
              <Link to="/signup" state={from ? { from } : undefined} className="text-navy-700 font-semibold hover:text-navy-900">
                Create account
              </Link>
            </p>
          </motion.div>
        </div>

        {/* Reset password modal */}
        {showReset && (
          <ResetPasswordModal
            onClose={() => { setShowReset(false); setResetSent(false); }}
            sent={resetSent}
            initialEmail={resetInitialEmail}
          />
        )}
      </div>
    </PageTransition>
  );
}

function ResetPasswordModal({ onClose, sent, initialEmail }: { onClose: () => void; sent: boolean; initialEmail?: string }) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState(initialEmail || '');
  const [done, setDone] = useState(sent);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      await resetPassword(email);
      setDone(true);
    } catch {
      setErr('Could not send reset email. Please check the address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-950/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-elevated"
      >
        <h2 className="font-bold text-navy-900 mb-2">Reset Password</h2>
        {done ? (
          <>
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">
              Password reset email sent! Check your inbox.
            </p>
            <button onClick={onClose} className="btn-primary w-full justify-center">Done</button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-metal-600">Enter your email and we'll send you a reset link.</p>
            {err && <p className="text-xs text-red-600">{err}</p>}
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@college.edu"
              className="form-input"
              required
            />
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost w-full justify-center">Cancel</button>
          </form>
        )}
      </motion.div>
    </div>
  );
}