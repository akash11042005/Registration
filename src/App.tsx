import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';

import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import FloatingRegisterCTA from '@/components/FloatingRegisterCTA';
import ErrorBoundary from '@/components/ErrorBoundary';

// Route Lazy Loading
const HomePage = lazy(() => import('@/pages/HomePage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const ProblemStatementsPage = lazy(() => import('@/pages/ProblemStatementsPage'));
const TimelinePage = lazy(() => import('@/pages/TimelinePage'));
const RulesPage = lazy(() => import('@/pages/RulesPage'));
const EligibilityPage = lazy(() => import('@/pages/EligibilityPage'));
const GalleryPage = lazy(() => import('@/pages/GalleryPage'));
const RegistrationPage = lazy(() => import('@/pages/RegistrationPage'));
const FAQsPage = lazy(() => import('@/pages/FAQsPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const SignInPage = lazy(() => import('@/pages/SignInPage'));
const SignUpPage = lazy(() => import('@/pages/SignUpPage'));
const TeamDashboardPage = lazy(() => import('@/pages/TeamDashboardPage'));
const AdminDashboardPage = lazy(() => import('@/pages/AdminDashboardPage'));

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
        <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center animate-bounce">
          <span className="text-gold-400 font-display font-black text-sm">Aa</span>
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
      <AnimatePresence mode="wait">
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
              <ErrorBoundary>
                <AnimatedRoutes />
              </ErrorBoundary>
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