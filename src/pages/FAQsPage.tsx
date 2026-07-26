import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { cn } from '@/lib/utils';

const FAQS = [
  {
    category: 'Registration',
    items: [
      {
        q: 'How do I register my team?',
        a: 'Create an account (or sign in with Google), then navigate to the Registration page. Complete the 3-step wizard: team details, payment, and review. You\'ll receive a registration pass with a unique ID upon submission.',
      },
      {
        q: 'Can I change my problem statement after registering?',
        a: 'No. Once your payment is verified and your slot is confirmed, the task assignment is final and cannot be changed. Choose carefully before submitting.',
      },
      {
        q: 'What if my preferred task is already full (5 teams)?',
        a: 'You\'ll need to select a different task. We recommend registering early to secure your preferred problem statement.',
      },
      {
        q: 'Is there a registration deadline?',
        a: 'Registrations remain open until all slots are filled or until the organizers officially close registrations. Watch the announcements ticker for updates.',
      },
    ],
  },
  {
    category: 'Team & Eligibility',
    items: [
      {
        q: 'Can students from different colleges form a team?',
        a: 'No. All team members must be enrolled at the same institution. Cross-college teams are not permitted.',
      },
      {
        q: 'Can a student be part of multiple teams?',
        a: 'No. Each student may register in only one team for AAYODHYAM 2026.',
      },
      {
        q: 'Is there a minimum number of members required?',
        a: 'No. Solo participation (1-member team) is allowed, though teams of 2–3 are recommended given the workload.',
      },
    ],
  },
  {
    category: 'Lab & Equipment',
    items: [
      {
        q: 'What does "WCE lab facilities for final testing only" mean?',
        a: 'All heat treatment, bulk processing, and specimen pre-preparation must be performed at your home college\'s lab. WCE lab access (on Thursday) is reserved exclusively for final optical microscopy, hardness testing, and microstructural evaluation required for the jury evaluation — not for initial processing.',
      },
      {
        q: 'What equipment is available at WCE lab?',
        a: 'The specific equipment provided is listed on each problem statement\'s detail page. Generally: optical metallurgical microscopes, universal hardness testers, UTM (limited slots), Charpy impact tester, etching facilities, and metallographic preparation benches.',
      },
      {
        q: 'What if my home college lacks some equipment?',
        a: 'Teams are expected to use resources available at their home institution or partner with nearby institutes. Contact the organizers early if you have equipment constraints — we may be able to advise alternative approaches.',
      },
    ],
  },
  {
    category: 'Evaluation & Prizes',
    items: [
      {
        q: 'How is evaluation done?',
        a: 'A jury panel of faculty experts evaluates each team on: experimental accuracy and precision, quality of metallographic/test results, technical report completeness, and viva-voce performance. Detailed criteria are listed on each problem statement page.',
      },
      {
        q: 'Are prizes awarded per category or overall?',
        a: 'Prizes are awarded within each of the five problem-statement tracks, plus an overall winner. Exact prize details will be announced via the announcements ticker.',
      },
      {
        q: 'Will certificates be given to all participants?',
        a: 'Yes. Participation certificates will be issued to all registered and participating teams. Merit certificates are issued to winners.',
      },
    ],
  },
  {
    category: 'Technical / Portal',
    items: [
      {
        q: 'How do I track my registration status?',
        a: 'After signing in, visit your Team Dashboard. Your registration status (pending/verified/rejected) and payment status are shown there in real-time.',
      },
      {
        q: 'What payment methods are accepted?',
        a: 'UPI is the accepted payment method. A scannable QR code and the UPI ID are provided during the registration process.',
      },
      {
        q: 'What if I face a technical issue with the portal?',
        a: 'Email metallurgy@walchandsangli.ac.in with a description of the issue and screenshots if possible. We\'ll respond within 24 hours.',
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-metal-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-metal-50 transition-colors"
        aria-expanded={open}
      >
        <span className="font-semibold text-navy-900 text-sm pr-4">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-metal-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-metal-400 shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 border-t border-metal-100 bg-metal-50">
              <p className="text-sm text-metal-600 leading-relaxed">{a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.4 },
};

export default function FAQsPage() {
  return (
    <PageTransition>
      <div className="page-header pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="section-label text-gold-400">Help & Support</span>
          <h1 className="text-headline text-white mb-3">Frequently Asked Questions</h1>
          <p className="text-metal-300 text-body-lg max-w-2xl">
            Everything you need to know about AAYODHYAM 2026. If you can't find your answer here, reach out to us.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {FAQS.map((section) => (
          <motion.div key={section.category} {...fadeInUp}>
            <h2 className="text-sm font-bold text-metal-500 uppercase tracking-wider mb-4">{section.category}</h2>
            <div className="space-y-2">
              {section.items.map((item) => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </PageTransition>
  );
}
