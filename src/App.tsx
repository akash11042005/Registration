import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import logoImg from '@/assets/logo.png';

import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import FloatingRegisterCTA from '@/components/FloatingRegisterCTA';
import ErrorBoundary from '@/components/ErrorBoundary';

// Wraps React.lazy() so a failed dynamic import (the chunk file for a page
// the browser hasn't loaded yet this session) auto-recovers instead of
// leaving navigation permanently stuck. This happens whenever a new deploy
// goes out while someone already has the site open: their loaded app still
// references the OLD build's chunk filenames (Vite hashes them), but the
// server now only has the NEW build's files, so that fetch 404s and the
// page just never finishes loading — clicking nav links appears to "do
// nothing" because Suspense is waiting forever for a promise that already
// failed. A single automatic reload picks up the current index.html (and
// therefore the current chunk references) and fixes it transparently. The
// sessionStorage flag caps this at one automatic reload per tab so a
// genuinely broken chunk doesn't reload-loop forever.
function lazyWithChunkRetry<T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem('aay_chunk_reload_once');
      return mod;
    } catch (err) {
      const flag = 'aay_chunk_reload_once';
      if (!sessionStorage.getItem(flag)) {
        sessionStorage.setItem(flag, '1');
        window.location.reload();
        // Never resolve — the reload is already in flight, so there's no
        // useful component to return before the page unloads.
        return new Promise<T>(() => { });
      }
      throw err;
    }
  });
}

// Route Lazy Loading
const HomePage = lazyWithChunkRetry(() => import('@/pages/HomePage'));
const AboutPage = lazyWithChunkRetry(() => import('@/pages/AboutPage'));
const ProblemStatementsPage = lazyWithChunkRetry(() => import('@/pages/ProblemStatementsPage'));
const TimelinePage = lazyWithChunkRetry(() => import('@/pages/TimelinePage'));
const RulesPage = lazyWithChunkRetry(() => import('@/pages/RulesPage'));
const EligibilityPage = lazyWithChunkRetry(() => import('@/pages/EligibilityPage'));
const GalleryPage = lazyWithChunkRetry(() => import('@/pages/GalleryPage'));
const RegistrationPage = lazyWithChunkRetry(() => import('@/pages/RegistrationPage'));
const FAQsPage = lazyWithChunkRetry(() => import('@/pages/FAQsPage'));
const ContactPage = lazyWithChunkRetry(() => import('@/pages/ContactPage'));
const SignInPage = lazyWithChunkRetry(() => import('@/pages/SignInPage'));
const SignUpPage = lazyWithChunkRetry(() => import('@/pages/SignUpPage'));
const TeamDashboardPage = lazyWithChunkRetry(() => import('@/pages/TeamDashboardPage'));
const AdminDashboardPage = lazyWithChunkRetry(() => import('@/pages/AdminDashboardPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center animate-bounce overflow-hidden">
          <img src={logoImg} alt="AAYODHYAM logo" className="w-full h-full object-cover" />
        </div>
        <p className="text-xs font-semibold text-metal-500 uppercase tracking-widest">Loading AAYODHYAM 2026…</p>
      </div>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  // React Router doesn't reset scroll position on navigation by default —
  // without this, clicking a nav link while scrolled down on the current
  // page leaves you at that same scroll offset on the new page, looking
  // like the page didn't load until you scroll back up manually.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Suspense fallback={<LoadingFallback />}>
      {/* mode="wait" (removed) makes AnimatePresence hold the OLD route on
          screen until its exit animation fully completes before mounting
          the new one. Combined with a single shared Suspense boundary
          around lazily-loaded route pages, that wait can get stuck: if the
          new page's chunk is still loading when the exit animation would
          otherwise finish, this Suspense boundary shows its fallback for
          the WHOLE subtree — including the old page still mid-exit — which
          can prevent Framer Motion from ever getting the "exit complete"
          signal it's waiting for. The visible symptom is exactly what was
          reported: navigation works for the first click or two, then gets
          increasingly stuck, needing several repeated clicks before a page
          finally changes. Dropping mode="wait" lets old/new overlap briefly
          instead of hard-blocking on each other, avoiding that deadlock. */}
      <AnimatePresence>
        {/* Keyed per-route so a caught error resets automatically on the
            next navigation instead of permanently showing the error screen
            for the rest of the session (a fresh ErrorBoundary instance
            mounts whenever the pathname changes, since a changed key always
            forces React to remount rather than reuse the old instance). */}
        <ErrorBoundary key={location.pathname}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/problem-statements" element={<ProblemStatementsPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/eligibility" element={<EligibilityPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/register" element={<RegistrationPage />} />
            <Route path="/faqs" element={<FAQsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/dashboard" element={<TeamDashboardPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            {/* Catch-all 404 */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </ErrorBoundary>
      </AnimatePresence>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="flex flex-col min-h-screen font-sans bg-white text-metal-900">
            <Navbar />
            <main className="flex-1">
              <AnimatedRoutes />
            </main>
            <Footer />
            <BackToTop />
            <FloatingRegisterCTA />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}