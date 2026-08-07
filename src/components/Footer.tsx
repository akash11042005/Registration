import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Globe, MapPin, Phone, ExternalLink, ArrowUpRight } from 'lucide-react';
import { ORG } from '@/lib/constants';
import logoImg from '@/assets/logo.png';

const footerLinks = {
  'Quick Links': [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Problem Statements', href: '/problem-statements' },
    { label: 'Timeline', href: '/timeline' },
    { label: 'Register', href: '/register' },
  ],
  'Information': [
    { label: 'Rules & Policies', href: '/rules' },
    { label: 'Eligibility', href: '/eligibility' },
    { label: 'FAQs', href: '/faqs' },
    { label: 'Contact', href: '/contact' },
  ],
  'Account': [
    { label: 'Sign In', href: '/signin' },
    { label: 'Create Account', href: '/signup' },
    { label: 'Team Dashboard', href: '/dashboard' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-white">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gold-500 flex items-center justify-center overflow-hidden">
                <img src={logoImg} alt="AAYODHYAM logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="font-display font-bold text-white text-lg leading-none block">AAYODHYAM</span>
                <span className="text-gold-400 text-xs font-medium leading-none block mt-0.5">2026 Hackathon</span>
              </div>
            </div>
            <p className="text-metal-300 text-sm leading-relaxed mb-6 max-w-xs">
              India's premier national Metallurgy & Materials Innovation Hackathon, hosted by the Department of Mechanical Engineering, Walchand College of Engineering, Sangli.
            </p>

            {/* Contact info */}
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5 text-sm text-metal-300">
                <MapPin className="w-4 h-4 text-gold-400 mt-0.5 shrink-0" />
                <span>{ORG.name}, {ORG.college}, {ORG.location}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-metal-300">
                <Mail className="w-4 h-4 text-gold-400 shrink-0" />
                <a href={`mailto:${ORG.email}`} className="hover:text-gold-400 transition-colors">
                  {ORG.email}
                </a>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-metal-300">
                <Phone className="w-4 h-4 text-gold-400 shrink-0" />
                <span>{ORG.phones.join(' / ')}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-metal-300">
                <Globe className="w-4 h-4 text-gold-400 shrink-0" />
                <a
                  href={ORG.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gold-400 transition-colors flex items-center gap-1"
                >
                  walchandsangli.ac.in
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">{heading}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-metal-400 hover:text-gold-400 transition-colors inline-flex items-center gap-1 group"
                    >
                      {link.label}
                      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-metal-500">
            © 2026 AAYODHYAM. Organized by Department of Mechanical Engineering, WCE Sangli. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/rules" className="text-xs text-metal-500 hover:text-metal-300 transition-colors">Rules</Link>
            <Link to="/contact" className="text-xs text-metal-500 hover:text-metal-300 transition-colors">Contact</Link>
            <Link to="/faqs" className="text-xs text-metal-500 hover:text-metal-300 transition-colors">FAQs</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}