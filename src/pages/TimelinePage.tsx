import React from 'react';
import { motion } from 'framer-motion';
import PageTransition from '@/components/PageTransition';
import { EVENT_PHASES } from '@/lib/timeline';
import { cn } from '@/lib/utils';

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.4 },
};

export default function TimelinePage() {
  return (
    <PageTransition>
      <div className="page-header pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="section-label text-gold-400">Event Schedule</span>
          <h1 className="text-headline text-white mb-3">Full Timeline</h1>
          <p className="text-metal-300 text-body-lg max-w-2xl">
            AAYODHYAM 2026 runs from publicity in early August through the prize distribution ceremony on 19 September 2026.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="relative pl-10">
          {/* Vertical connecting line */}
          <div className="absolute left-4 top-2 bottom-2 w-px bg-metal-200" />

          <div className="space-y-8">
            {EVENT_PHASES.map((phase, i) => {
              const Icon = phase.icon;
              return (
                <motion.div
                  key={phase.number}
                  {...fadeInUp}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="relative"
                >
                  {/* Numbered dot */}
                  <div
                    className={cn(
                      'absolute -left-10 top-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm z-10',
                      phase.highlight ? 'bg-gold-500 text-navy-950' : 'bg-navy-900 text-white'
                    )}
                  >
                    {phase.number}
                  </div>

                  <div className="card p-5">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        phase.highlight ? 'bg-gold-50' : 'bg-navy-50'
                      )}>
                        <Icon className={cn('w-5 h-5', phase.highlight ? 'text-gold-600' : 'text-navy-700')} />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h2 className="font-bold text-navy-900">{phase.title}</h2>
                          <span className="text-xs font-bold text-gold-600 tabular-nums">{phase.dateRange}</span>
                        </div>
                        <p className="text-sm text-metal-600 leading-relaxed">{phase.description}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}