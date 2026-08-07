import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { ORG } from '@/lib/constants';

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.4 },
};

export default function ContactPage() {
  return (
    <PageTransition>
      <div className="page-header pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="section-label text-gold-400">Get In Touch</span>
          <h1 className="text-headline text-white mb-3">Contact Us</h1>
          <p className="text-metal-300 text-body-lg max-w-2xl">
            Reach out with questions about registration, problem statements, lab access, or anything else related to AAYODHYAM 2026.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact info */}
          <motion.div {...fadeInUp} className="space-y-5">
            <h2 className="text-title text-navy-900">Organizer Contact</h2>
            <p className="text-sm text-metal-600 leading-relaxed">
              For all queries related to AAYODHYAM 2026 — including registration, technical issues, payment verification, and lab access — please contact the Department of Mechanical Engineering directly.
            </p>

            {[
              {
                icon: Mail,
                label: 'Email (Primary)',
                value: ORG.email,
                href: `mailto:${ORG.email}`,
                color: 'text-blue-600 bg-blue-50',
              },
              {
                icon: Phone,
                label: 'Phone',
                value: ORG.phones[0],
                href: `tel:${ORG.phones[0].replace(/\s/g, '')}`,
                color: 'text-emerald-600 bg-emerald-50',
              },
              {
                icon: Phone,
                label: 'Phone (Alternate)',
                value: ORG.phones[1],
                href: `tel:${ORG.phones[1].replace(/\s/g, '')}`,
                color: 'text-emerald-600 bg-emerald-50',
              },
              {
                icon: Globe,
                label: 'College Website',
                value: 'walchandsangli.ac.in',
                href: ORG.website,
                color: 'text-purple-600 bg-purple-50',
                external: true,
              },
              {
                icon: MapPin,
                label: 'Address',
                value: `${ORG.name}, ${ORG.college}, ${ORG.location}`,
                color: 'text-gold-600 bg-gold-50',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex gap-4 card p-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-metal-500 uppercase tracking-wider mb-1">{item.label}</p>
                    {item.href ? (
                      <a
                        href={item.href}
                        target={item.external ? '_blank' : undefined}
                        rel={item.external ? 'noopener noreferrer' : undefined}
                        className="text-sm text-navy-700 hover:text-navy-900 font-medium transition-colors"
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-sm text-metal-700">{item.value}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>

          {/* Map / directions */}
          <motion.div {...fadeInUp}>
            <h2 className="text-title text-navy-900 mb-5">Find Us</h2>
            <div className="card overflow-hidden">
              <div className="bg-metal-100 h-64 flex items-center justify-center relative">
                {/* Placeholder map */}
                <div className="absolute inset-0 bg-gradient-to-br from-navy-50 to-navy-100 flex flex-col items-center justify-center">
                  <MapPin className="w-10 h-10 text-navy-400 mb-3" />
                  <p className="font-bold text-navy-700 text-sm">Walchand College of Engineering</p>
                  <p className="text-xs text-navy-500 mt-1">Vishrambag, Sangli, Maharashtra</p>
                  <a
                    href="https://maps.google.com/?q=Walchand+College+of+Engineering+Sangli"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary mt-4 text-xs px-4 py-2"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-navy-900 mb-2">Getting to WCE Sangli</h3>
                <div className="space-y-2 text-sm text-metal-600">
                  <p><strong>By Rail:</strong> Miraj Junction (7 km) — the nearest major railway station, well-connected to Pune, Mumbai, and Bengaluru.</p>
                  <p><strong>By Road:</strong> Sangli is accessible via NH-48 (Pune–Bengaluru highway). MSRTC buses operate from major cities.</p>
                  <p><strong>By Air:</strong> Kolhapur Airport (30 km) is the nearest airport.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}