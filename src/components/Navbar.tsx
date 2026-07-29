import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut, LayoutDashboard, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Rules', href: '/rules' },
  { label: 'Problem Statements', href: '/problem-statements' },
  { label: 'FAQ', href: '/faqs' },
  { label: 'Timeline', href: '/timeline' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Contact', href: '/contact' },
];

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change size-up, and lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
    setMobileOpen(false);
    navigate('/');
  };

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/70 backdrop-blur-xl shadow-card border-b border-white/40'
          : 'bg-transparent border-b border-transparent'
      )}
      style={isScrolled ? { WebkitBackdropFilter: 'blur(20px)' } : undefined}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <motion.div
              whileHover={{ scale: 1.06, rotate: -4 }}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 rounded-lg bg-navy-900 flex items-center justify-center transition-colors group-hover:bg-navy-950"
            >
              <span className="text-gold-400 font-display font-black text-sm tracking-tight">Aa</span>
            </motion.div>
            <div className="hidden sm:block leading-none">
              <span className="font-display font-bold text-navy-900 text-base leading-none block">
                AAYODHYAM
              </span>
              <span
                className={cn(
                  'text-xs font-medium leading-none block mt-0.5 transition-colors',
                  isScrolled ? 'text-metal-500' : 'text-metal-600'
                )}
              >
                2026 Hackathon
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                end={link.href === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isScrolled
                      ? isActive
                        ? 'text-navy-900'
                        : 'text-metal-700 hover:text-navy-900 hover:bg-metal-900/5'
                      : isActive
                        ? 'text-white'
                        : 'text-white/85 hover:text-white hover:bg-white/10'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className={cn(
                          'absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full',
                          isScrolled ? 'bg-gold-500' : 'bg-gold-400'
                        )}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative hidden lg:block">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  onBlur={() => setTimeout(() => setUserMenuOpen(false), 150)}
                  className={cn(
                    'flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border transition-colors',
                    isScrolled
                      ? 'border-metal-200 bg-white hover:border-navy-300'
                      : 'border-white/30 bg-white/10 hover:border-white/60'
                  )}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="avatar" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-navy-900 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {(user.displayName || user.email || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className={cn('text-sm font-medium max-w-[120px] truncate', isScrolled ? 'text-metal-800' : 'text-white')}>
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-elevated border border-metal-100 py-1 z-50"
                    >
                      <div className="px-4 py-2.5 border-b border-metal-100">
                        <p className="text-xs text-metal-500 font-medium">Signed in as</p>
                        <p className="text-sm font-semibold text-metal-900 truncate">{user.email}</p>
                      </div>
                      {isAdmin ? (
                        <NavLink
                          to="/admin"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gold-700 hover:bg-gold-50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Shield className="w-4 h-4" />
                          Admin Dashboard
                        </NavLink>
                      ) : (
                        <NavLink
                          to="/dashboard"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-metal-700 hover:text-navy-900 hover:bg-metal-50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          My Dashboard
                        </NavLink>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/signin"
                className={cn(
                  'hidden lg:inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
                  isScrolled
                    ? 'text-navy-900 hover:bg-navy-900/5 border border-navy-200'
                    : 'text-white border border-white/40 hover:bg-white/10'
                )}
              >
                Sign In
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              className={cn(
                'lg:hidden p-2 rounded-lg transition-colors',
                isScrolled ? 'text-metal-700 hover:bg-metal-900/5' : 'text-white hover:bg-white/10'
              )}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="lg:hidden bg-white/95 backdrop-blur-xl border-t border-metal-100 shadow-elevated overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.href}
                  to={link.href}
                  end={link.href === '/'}
                  className={({ isActive }) =>
                    cn(
                      'block px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                      isActive ? 'text-navy-900 bg-navy-50' : 'text-metal-700 hover:text-navy-900 hover:bg-metal-50'
                    )
                  }
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
              <div className="pt-3 border-t border-metal-100 space-y-2">
                {user ? (
                  <>
                    {isAdmin ? (
                      <NavLink
                        to="/admin"
                        className="block px-3 py-2.5 text-sm font-medium text-gold-700 hover:bg-gold-50 rounded-lg"
                        onClick={() => setMobileOpen(false)}
                      >
                        <Shield className="inline w-4 h-4 mr-2" />
                        Admin Dashboard
                      </NavLink>
                    ) : (
                      <NavLink
                        to="/dashboard"
                        className="block px-3 py-2.5 text-sm font-medium text-metal-700 hover:text-navy-900 hover:bg-metal-50 rounded-lg"
                        onClick={() => setMobileOpen(false)}
                      >
                        <LayoutDashboard className="inline w-4 h-4 mr-2" />
                        My Dashboard
                      </NavLink>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <LogOut className="inline w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/signin"
                    className="block px-3 py-2.5 text-sm font-semibold text-center text-white bg-navy-900 hover:bg-navy-950 rounded-lg"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}