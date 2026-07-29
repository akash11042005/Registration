import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, UserPlus, Globe } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const schema = z.object({
  displayName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function SignUpPage() {
  const { signUpWithEmail, signInWithGoogle, authError, clearAuthError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string; search?: string } })?.from;
  const fromPath = from ? `${from.pathname}${from.search || ''}` : '/';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      clearAuthError();
      await signUpWithEmail(data.email, data.password, data.displayName);
      navigate(fromPath, { replace: true });
    } catch { }
  };

  const handleGoogle = async () => {
    try {
      setGoogleLoading(true);
      clearAuthError();
      await signInWithGoogle();
      navigate(fromPath, { replace: true });
    } catch {
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center bg-metal-50 py-16 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-navy-900 flex items-center justify-center mx-auto mb-3">
              <span className="text-gold-400 font-display font-black">Aa</span>
            </div>
            <h1 className="text-xl font-bold text-navy-900">Create Your Account</h1>
            <p className="text-sm text-metal-500 mt-1">Register for AAYODHYAM 2026</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 space-y-5"
          >
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border-2 border-metal-200 bg-white text-sm font-semibold text-metal-800 hover:border-navy-300 hover:bg-metal-50 transition-all disabled:opacity-50"
            >
              <Globe className="w-4 h-4 text-blue-600" />
              {googleLoading ? 'Connecting…' : 'Sign up with Google'}
            </button>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-metal-200" />
              <span className="text-xs text-metal-400 font-medium">or create with email</span>
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
                <label className="form-label" htmlFor="displayName">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-metal-400" />
                  <input
                    {...register('displayName')}
                    id="displayName"
                    type="text"
                    autoComplete="name"
                    className={cn('form-input pl-10', errors.displayName && 'border-red-400')}
                    placeholder="Your full name"
                  />
                </div>
                {errors.displayName && <p className="form-error"><AlertCircle className="w-3 h-3" />{errors.displayName.message}</p>}
              </div>

              <div>
                <label className="form-label" htmlFor="email">College Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-metal-400" />
                  <input
                    {...register('email')}
                    id="email"
                    type="email"
                    autoComplete="email"
                    className={cn('form-input pl-10', errors.email && 'border-red-400')}
                    placeholder="you@college.edu"
                  />
                </div>
                {errors.email && <p className="form-error"><AlertCircle className="w-3 h-3" />{errors.email.message}</p>}
              </div>

              <div>
                <label className="form-label" htmlFor="password">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-metal-400" />
                  <input
                    {...register('password')}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={cn('form-input pl-10 pr-10', errors.password && 'border-red-400')}
                    placeholder="Min. 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-metal-400 hover:text-metal-700"
                    aria-label="Toggle password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="form-error"><AlertCircle className="w-3 h-3" />{errors.password.message}</p>}
              </div>

              <div>
                <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-metal-400" />
                  <input
                    {...register('confirmPassword')}
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={cn('form-input pl-10', errors.confirmPassword && 'border-red-400')}
                    placeholder="Repeat password"
                  />
                </div>
                {errors.confirmPassword && <p className="form-error"><AlertCircle className="w-3 h-3" />{errors.confirmPassword.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full justify-center"
              >
                <UserPlus className="w-4 h-4" />
                {isSubmitting ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-xs text-metal-500">
              Already have an account?{' '}
              <Link to="/signin" state={from ? { from } : undefined} className="text-navy-700 font-semibold hover:text-navy-900">
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}