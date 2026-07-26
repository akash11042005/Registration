import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Users, Microscope, Trophy, CheckCircle } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { cn } from '@/lib/utils';

const SCHEDULE = [
  {
    day: 'Monday',
    date: 'September 14, 2026',
    theme: 'Kickoff Day',
    color: 'border-gold-400 bg-gold-50',
    dotColor: 'bg-gold-500',
    events: [
      { time: '09:00 AM', title: 'Inauguration Ceremony', desc: 'Welcome address by HoD, faculty coordinators, and chief guest. Introduction to AAYODHYAM 2026.', icon: Users },
      { time: '10:00 AM', title: 'Problem Statement Briefing', desc: 'Detailed briefing on all 11 problem statements, jury criteria, and lab usage policy.', icon: Microscope },
      { time: '11:30 AM', title: 'Team Registration Verification', desc: 'On-site verification of team registrations, identity confirmation, and slot finalization.', icon: CheckCircle },
      { time: '01:00 PM', title: 'Lunch Break', desc: 'Networking lunch with faculty coordinators and peers from across India.', icon: Clock },
      { time: '02:00 PM', title: 'Mentor Meet & Q&A', desc: 'Open interaction with subject-matter faculty mentors. Teams clarify doubts on their assigned tasks.', icon: Users },
      { time: '04:00 PM', title: 'Hackathon Kickoff', desc: 'Official start of the AAYODHYAM 2026 problem-solving phase. Teams begin work at their home institutions.', icon: Trophy },
    ],
  },
  {
    day: 'Tuesday',
    date: 'September 15, 2026',
    theme: 'Research & Planning',
    color: 'border-blue-400 bg-blue-50',
    dotColor: 'bg-blue-500',
    events: [
      { time: 'All Day', title: 'Research & Literature Review', desc: 'Teams conduct literature review, design experiments, and finalize processing parameters at home institutions.', icon: Microscope },
      { time: '02:00 PM', title: 'Online Check-in (Optional)', desc: 'Virtual check-in with faculty coordinator to validate experimental plan before beginning lab work.', icon: CheckCircle },
    ],
  },
  {
    day: 'Wednesday',
    date: 'September 16, 2026',
    theme: 'Experimental Phase',
    color: 'border-purple-400 bg-purple-50',
    dotColor: 'bg-purple-500',
    events: [
      { time: 'All Day', title: 'Experimental Work at Home Institution', desc: 'Heat treatment, specimen preparation, mechanical testing, and processing at the team\'s home college lab.', icon: Microscope },
      { time: '05:00 PM', title: 'Progress Submission', desc: 'Submit preliminary progress report and experimental data via the Team Dashboard.', icon: CheckCircle },
    ],
  },
  {
    day: 'Thursday',
    date: 'September 17, 2026',
    theme: 'WCE Lab Day',
    color: 'border-emerald-400 bg-emerald-50',
    dotColor: 'bg-emerald-500',
    events: [
      { time: '09:00 AM', title: 'Arrival at WCE, Sangli', desc: 'Teams arrive at Walchand College of Engineering campus. Lab access allocation and safety briefing.', icon: MapPin },
      { time: '10:00 AM', title: 'WCE Lab Sessions (Batch 1)', desc: 'Optical microscopy, metallographic evaluation, mechanical testing, and characterization under faculty supervision.', icon: Microscope },
      { time: '02:00 PM', title: 'WCE Lab Sessions (Batch 2)', desc: 'Continued lab access and characterization. Final data collection and sample documentation.', icon: Microscope },
      { time: '05:00 PM', title: 'Lab Sessions End', desc: 'All lab work concludes. Teams begin preparing final reports and presentations.', icon: CheckCircle },
    ],
  },
  {
    day: 'Friday',
    date: 'September 18, 2026',
    theme: 'Jury Day',
    color: 'border-gold-400 bg-gold-50',
    dotColor: 'bg-gold-500',
    events: [
      { time: '09:00 AM', title: 'Final Report Submission', desc: 'All teams submit final technical reports and datasets via Team Dashboard before the deadline.', icon: CheckCircle },
      { time: '10:00 AM', title: 'Jury Evaluations Begin', desc: 'Expert jury panel evaluates each team\'s work, methodology, and results. Viva-voce for each team.', icon: Users },
      { time: '01:00 PM', title: 'Jury Break & Deliberations', desc: 'Lunch while jury panel reviews scores across all five tracks and selects winners.', icon: Clock },
      { time: '03:00 PM', title: 'Results Announcement', desc: 'Overall rankings announced. Track-wise winners recognized. Certificates presented.', icon: Trophy },
      { time: '04:00 PM', title: 'Prize Distribution & Valediction', desc: 'Cash prizes, certificates, and trophies presented. Closing remarks and group photograph.', icon: Trophy },
    ],
  },
];

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
            AAYODHYAM 2026 runs Monday through Friday, September 14–18, 2026, from inauguration to prize distribution.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-10">
          {SCHEDULE.map((daySchedule, dayIndex) => (
            <motion.div key={daySchedule.day} {...fadeInUp}>
              {/* Day header */}
              <div className={cn('rounded-2xl border-l-4 p-5 mb-5', daySchedule.color)}>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-metal-600" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-metal-500">{daySchedule.day} · Day {dayIndex + 1}</p>
                    <h2 className="font-bold text-navy-900">{daySchedule.date} — {daySchedule.theme}</h2>
                  </div>
                </div>
              </div>

              {/* Events */}
              <div className="relative pl-8">
                {/* Vertical line */}
                <div className="absolute left-3 top-0 bottom-0 w-px bg-metal-200" />

                <div className="space-y-5">
                  {daySchedule.events.map((event, i) => {
                    const Icon = event.icon;
                    return (
                      <motion.div
                        key={event.title}
                        initial={{ opacity: 0, x: -16 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.35, delay: i * 0.08 }}
                        className="relative"
                      >
                        {/* Dot */}
                        <div className={cn('absolute -left-8 top-3 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm', daySchedule.dotColor)} />

                        <div className="card p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4 text-navy-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-gold-600 tabular-nums">{event.time}</span>
                              </div>
                              <h3 className="font-bold text-navy-900 text-sm mb-1">{event.title}</h3>
                              <p className="text-xs text-metal-600 leading-relaxed">{event.desc}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
