import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function FloatingRegisterCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 400 && window.scrollY < document.body.scrollHeight - 800);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-5 right-5 z-40"
        >
          <Link
            to="/register"
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-gold-500 text-navy-950 font-bold text-sm shadow-gold hover:bg-gold-600 hover:-translate-y-1 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Register Team
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
