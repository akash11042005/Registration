import React, { useRef } from 'react';
import { Megaphone, AlertCircle, Calendar, MapPin, Info } from 'lucide-react';
import { useAnnouncements } from '@/hooks/useFirestore';
import { AnnouncementCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

const ICONS: Record<AnnouncementCategory, React.ReactNode> = {
  Rule: <AlertCircle className="w-3.5 h-3.5" />,
  Schedule: <Calendar className="w-3.5 h-3.5" />,
  Venue: <MapPin className="w-3.5 h-3.5" />,
  General: <Info className="w-3.5 h-3.5" />,
};

const COLORS: Record<AnnouncementCategory, string> = {
  Rule: 'text-red-600',
  Schedule: 'text-blue-600',
  Venue: 'text-purple-600',
  General: 'text-emerald-600',
};

export default function AnnouncementTicker() {
  const { data: announcements = [] } = useAnnouncements();

  // Duplicate for seamless loop
  const items = [...announcements, ...announcements];

  return (
    <div className="bg-navy-950 border-b border-navy-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-10 gap-4 overflow-hidden">
          {/* Label */}
          <div className="flex items-center gap-1.5 shrink-0 border-r border-white/10 pr-4">
            <Megaphone className="w-3.5 h-3.5 text-gold-400" />
            <span className="text-xs font-bold text-gold-400 uppercase tracking-widest">Live</span>
          </div>

          {/* Ticker */}
          <div className="flex-1 overflow-hidden pause-on-hover">
            <div className="ticker-track flex items-center gap-8" style={{ width: 'max-content' }}>
              {items.map((ann, i) => (
                <div
                  key={`${ann.id ?? i}-${i}`}
                  className="flex items-center gap-2 shrink-0"
                >
                  {ann.important && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-gold-500 text-navy-950 uppercase">
                      Important
                    </span>
                  )}
                  <span className={cn('text-xs font-semibold shrink-0', COLORS[ann.category as AnnouncementCategory] ?? 'text-emerald-500')}>
                    {ICONS[ann.category as AnnouncementCategory]}
                  </span>
                  <span className="text-xs font-semibold text-white">{ann.title}</span>
                  <span className="text-xs text-metal-400">{ann.content}</span>
                  <span className="w-1 h-1 rounded-full bg-gold-500 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
