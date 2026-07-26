import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Users, BookOpen, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import PageTransition from '@/components/PageTransition';

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.4 },
};

export default function EligibilityPage() {
  return (
    <PageTransition>
      <div className="page-header pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="section-label text-gold-400">Participation Criteria</span>
          <h1 className="text-headline text-white mb-3">Eligibility</h1>
          <p className="text-metal-300 text-body-lg max-w-2xl">
            AAYODHYAM 2026 is open to undergraduate and postgraduate engineering students across India. Review the criteria before registering.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {/* Who can participate */}
        <motion.div {...fadeInUp} className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center text-navy-600">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-navy-900 text-lg">Who Can Participate</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { ok: true, text: 'B.Tech / B.E. students (1st–4th year) from any engineering branch' },
              { ok: true, text: 'M.Tech students from any engineering branch' },
              { ok: true, text: 'Students from AICTE-approved / university-affiliated colleges across India' },
              { ok: true, text: 'Students from WCE Sangli are welcome to participate' },
              { ok: false, text: 'PhD research scholars (not eligible)' },
              { ok: false, text: 'Non-student participants (industry professionals, faculty, etc.)' },
            ].map((item, i) => (
              <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl ${item.ok ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {item.ok
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                }
                <p className="text-sm text-metal-700 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Team composition */}
        <motion.div {...fadeInUp} className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-navy-900 text-lg">Team Composition</h2>
          </div>
          <div className="space-y-3">
            {[
              'Teams can have 1 to 3 members.',
              'All team members must be enrolled at the same institution.',
              'The team leader acts as the primary point of contact and must be the account owner.',
              'Interdisciplinary teams (e.g., Metallurgy + Computer Science for the Computation & AI track) are highly encouraged.',
              'A single student cannot be registered in more than one team.',
              'There is no restriction on the academic year — 1st year students may compete alongside final-year students.',
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-navy-100 text-navy-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-metal-700 leading-relaxed">{rule}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Academic year */}
        <motion.div {...fadeInUp} className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-navy-900 text-lg">Academic Year Options</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {['1st Year B.Tech', '2nd Year B.Tech', '3rd Year B.Tech', 'Final Year B.Tech', 'M.Tech (1st Year)', 'M.Tech (2nd Year)'].map((yr) => (
              <div key={yr} className="p-3 bg-metal-50 rounded-xl text-center">
                <p className="text-sm font-semibold text-navy-900">{yr}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Important note */}
        <motion.div {...fadeInUp} className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 mb-1">Verification Required</p>
            <p className="text-sm text-amber-700 leading-relaxed">
              Organizers reserve the right to verify the eligibility of any participant at any stage of the hackathon.
              Teams found to have provided false information will be immediately disqualified and may be barred from future editions.
            </p>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
