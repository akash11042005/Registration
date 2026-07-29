import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Users, FlaskConical, Clock, Shield, BookOpen, CheckCircle2 } from 'lucide-react';
import PageTransition from '@/components/PageTransition';

const RULES = [
  {
    icon: Users,
    title: 'Team Composition',
    color: 'text-blue-600 bg-blue-50',
    rules: [
      'Each team must comprise 1–3 students.',
      'Students must be currently enrolled in a recognized engineering college in India.',
      'Mixed teams from different colleges are not permitted — all members must be from the same institution.',
      'One team leader must be designated and is responsible for all communication with organizers.',
    ],
  },
  {
    icon: BookOpen,
    title: 'Problem Statement Selection',
    color: 'text-purple-600 bg-purple-50',
    rules: [
      'Each team must select exactly one problem statement from the catalog.',
      'A maximum of 8 teams may register for any single problem statement — first-come, first-served.',
      'Once confirmed (after payment verification), task assignment cannot be changed.',
      'Teams must work only on their assigned task for the duration of the event.',
    ],
  },
  {
    icon: Clock,
    title: 'Registration & Payment',
    color: 'text-emerald-600 bg-emerald-50',
    rules: [
      'Registration requires a valid UTR/transaction ID from UPI payment.',
      'Confirmation is issued only after organizer payment verification.',
      'Partial or fraudulent payment entries will result in immediate disqualification.',
      'Slots are provisionally reserved pending verification; confirmed on approval.',
    ],
  },
  {
    icon: FlaskConical,
    title: 'WCE Lab Usage Policy',
    color: 'text-gold-600 bg-gold-50',
    important: true,
    rules: [
      'WCE laboratory facilities are available exclusively for final testing and microstructural evaluation during jury rounds (Thursday lab day).',
      'All heat treatment, thermal processing, and specimen pre-processing operations must be completed at the participating team\'s home institution before arriving at WCE.',
      'Teams arriving without completed pre-processing will not be granted additional time.',
      'All WCE lab usage must be under the direct supervision of assigned faculty. Unsupervised access is strictly prohibited.',
      'Teams are responsible for any damage to equipment caused by improper use.',
    ],
  },
  {
    icon: Shield,
    title: 'Academic Integrity',
    color: 'text-navy-600 bg-navy-50',
    rules: [
      'All experimental work and analysis must be original and conducted by the registered team members.',
      'Plagiarism in written reports or fabrication of experimental results will result in immediate disqualification.',
      'Teams may consult publicly available literature but must cite all references.',
      'Use of AI tools for data analysis or report writing must be disclosed in the submission.',
    ],
  },
  {
    icon: CheckCircle2,
    title: 'Evaluation & Jury',
    color: 'text-orange-600 bg-orange-50',
    rules: [
      'All team members must be present for the jury evaluation on Friday.',
      'The jury\'s decision is final and binding. No appeals will be entertained.',
      'Jury evaluation is based on: experimental accuracy, methodology, report quality, and viva responses.',
      'Results and scores will be announced at the Friday prize distribution.',
    ],
  },
];

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.4 },
};

export default function RulesPage() {
  return (
    <PageTransition>
      <div className="page-header pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="section-label text-gold-400">Policies & Guidelines</span>
          <h1 className="text-headline text-white mb-3">Rules & Lab Usage Policy</h1>
          <p className="text-metal-300 text-body-lg max-w-2xl">
            All participants must read and comply with these rules before registering. Violation of any rule may result in disqualification.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {/* Important notice */}
        <motion.div {...fadeInUp} className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 mb-1">Critical Lab Policy</p>
            <p className="text-sm text-amber-700 leading-relaxed">
              WCE laboratory facilities are for <strong>final testing & microstructural evaluation only</strong> during jury rounds.
              Heat treatment and specimen pre-processing must be completed at your home institution before arriving at WCE.
              Failure to comply will result in no additional lab time being granted.
            </p>
          </div>
        </motion.div>

        {RULES.map((section) => {
          const Icon = section.icon;
          return (
            <motion.div key={section.title} {...fadeInUp} className={`card p-6 ${section.important ? 'border-gold-200 ring-1 ring-gold-200' : ''}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${section.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-title font-bold text-navy-900 text-base">{section.title}</h2>
                {section.important && (
                  <span className="badge badge-hard ml-auto">Important</span>
                )}
              </div>
              <ul className="space-y-3">
                {section.rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-navy-100 text-navy-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-metal-700 leading-relaxed">{rule}</p>
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>
    </PageTransition>
  );
}