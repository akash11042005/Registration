import React from 'react';
import { motion } from 'framer-motion';
import { Microscope, Award, BookOpen, FlaskConical, Users, Globe } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { ORG } from '@/lib/constants';

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.4 },
};

export default function AboutPage() {
  return (
    <PageTransition>
      <div className="page-header pt-24 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 lattice-bg opacity-[0.06]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="section-label text-gold-400">About AAYODHYAM 2026</span>
          <h1 className="text-headline text-white mb-3">A Legacy of Innovation</h1>
          <p className="text-metal-300 text-body-lg max-w-2xl">
            Learn about the department, institution, and the mission behind India's premier metallurgy and materials innovation hackathon.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Event */}
          <motion.div {...fadeInUp}>
            <div className="w-10 h-10 rounded-xl bg-gold-50 flex items-center justify-center text-gold-600 mb-4">
              <Award className="w-5 h-5" />
            </div>
            <h2 className="text-title text-navy-900 mb-4">About AAYODHYAM</h2>
            <div className="space-y-4 text-sm text-metal-600 leading-relaxed">
              <p>
                AAYODHYAM 2026 is a national-level, Metallurgy & Materials Innovation Hackathon, bringing together the most talented engineering students from across India to solve real-world challenges in metallurgy, materials processing, and computational materials science.
              </p>
              <p>
                The name <strong className="text-navy-900">AAYODHYAM</strong> embodies the spirit of relentless problem-solving — a fusion of innovation and precision that defines the engineer's craft. Rooted in the Sanskrit concept of an undefeatable challenge, AAYODHYAM represents a competition where intellect, experimentation, and engineering rigor converge.
              </p>
              <p>
                Unlike typical hackathons, AAYODHYAM is a <em>lab-based</em> research competition — participants conduct real experiments, analyze microstructures, test mechanical properties, and build computational tools. The results are evaluated by a panel of expert faculty and industry professionals using the same standards as published research.
              </p>
            </div>
          </motion.div>

          {/* Department */}
          <motion.div {...fadeInUp}>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
              <Microscope className="w-5 h-5" />
            </div>
            <h2 className="text-title text-navy-900 mb-4">Dept. of Mechanical Engineering</h2>
            <div className="space-y-4 text-sm text-metal-600 leading-relaxed">
              <p>
                The Department of Mechanical Engineering at WCE Sangli is one of Maharashtra's leading centers for metallurgical education and research. Established with a vision to produce industry-ready metallurgical engineers, the department has a strong legacy of academic excellence and applied research.
              </p>
              <p>
                The department is equipped with modern metallurgical laboratories including optical and electron microscopy, heat treatment facilities, mechanical testing rigs, XRD, and computational tools. Faculty members are actively involved in research collaborations with Indian steel majors, automotive OEMs, and DRDO projects.
              </p>
            </div>
          </motion.div>
        </div>

        {/* WCE */}
        <motion.div {...fadeInUp} className="card p-8 mb-12">
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-2">
              <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center text-navy-600 mb-4">
                <BookOpen className="w-5 h-5" />
              </div>
              <h2 className="text-title text-navy-900 mb-4">Walchand College of Engineering, Sangli</h2>
              <p className="text-sm text-metal-600 leading-relaxed mb-4">
                Walchand College of Engineering (WCE), Sangli, is one of Maharashtra's oldest and most prestigious autonomous engineering institutions, established in 1947. WCE is accredited with NAAC Grade A and is affiliated to Shivaji University. The college has consistently ranked among the top engineering institutions in Maharashtra for academic quality, research output, and placement record.
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-metal-600">
                <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-navy-500" />walchandsangli.ac.in</span>
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-navy-500" />Est. 1947</span>
                <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-navy-500" />NAAC Grade A</span>
              </div>
            </div>
            <div className="bg-navy-50 rounded-2xl p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-navy-900 flex items-center justify-center mx-auto mb-3">
                <span className="text-gold-400 font-display font-black text-xl">WCE</span>
              </div>
              <p className="font-bold text-navy-900">WCE Sangli</p>
              <p className="text-xs text-metal-500 mt-1">Vishrambag, Sangli</p>
              <p className="text-xs text-metal-500">Maharashtra – 416415</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { icon: FlaskConical, label: 'Lab Facilities', value: '8+', desc: 'Specialized metallurgy labs' },
            { icon: Users, label: 'Faculty', value: '20+', desc: 'Expert department faculty' },
            { icon: Award, label: 'Research Projects', value: '50+', desc: 'Active sponsored projects' },
            { icon: BookOpen, label: 'Years of Excellence', value: '75+', desc: 'Legacy since 1947' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <motion.div key={item.label} {...fadeInUp} className="card p-5 text-center">
                <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-navy-600" />
                </div>
                <p className="text-2xl font-black text-navy-900 mb-0.5">{item.value}</p>
                <p className="text-xs font-bold text-metal-700">{item.label}</p>
                <p className="text-xs text-metal-500 mt-0.5">{item.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </PageTransition>
  );
}
