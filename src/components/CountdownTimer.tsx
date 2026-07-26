import React, { useState, useEffect } from 'react';
import { EVENT_START_DATE } from '@/lib/constants';
import { motion } from 'framer-motion';

interface TimeUnit {
  label: string;
  value: number;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function getTimeLeft() {
  const diff = EVENT_START_DATE.getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!timeLeft) {
    return (
      <div className="text-center">
        <p className="text-xl font-bold text-gold-400">🚀 The Hackathon Has Begun!</p>
      </div>
    );
  }

  const units: TimeUnit[] = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Mins', value: timeLeft.minutes },
    { label: 'Secs', value: timeLeft.seconds },
  ];

  return (
    <div className="flex items-center gap-3 sm:gap-5">
      {units.map((unit, i) => (
        <React.Fragment key={unit.label}>
          <div className="text-center">
            <motion.div
              key={unit.value}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="font-display font-black text-3xl sm:text-5xl text-white leading-none tabular-nums"
            >
              {pad(unit.value)}
            </motion.div>
            <p className="text-xs font-semibold text-metal-400 uppercase tracking-widest mt-1">
              {unit.label}
            </p>
          </div>
          {i < units.length - 1 && (
            <span className="text-2xl sm:text-4xl font-light text-metal-500 leading-none pb-3">:</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
