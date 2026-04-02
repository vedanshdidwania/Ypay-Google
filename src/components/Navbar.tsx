import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  ShieldCheck, 
  Bell, 
  Menu, 
  X, 
  LogOut,
  User as UserIcon,
  ChevronDown,
  Wallet,
  ArrowRight,
  ShoppingCart,
  History,
  Gift,
  HelpCircle,
  Plus
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { cn } from '../lib/utils';
import { NotificationCenter } from './Notifications';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navLinks = [
    { name: 'Market', path: '/p2p', icon: ShoppingCart },
    { name: 'Orders', path: '/orders', icon: ArrowLeftRight, auth: true },
    { name: 'History', path: '/transactions', icon: History, auth: true },
    { name: 'Wallet', path: '/wallet', icon: Wallet, auth: true },
    { name: 'Referrals', path: '/referrals', icon: Gift, auth: true },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, auth: true },
  ];

  const mobileActions = [
    { name: 'Post Ad', path: '/p2p', icon: ArrowRight, action: 'post-ad' },
    { name: 'Support', path: '#', icon: HelpCircle },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      isScrolled 
        ? "bg-black/80 backdrop-blur-md border-b border-white/5 py-3 shadow-lg" 
        : "bg-transparent py-5"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <Logo size="md" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => (
              (!link.auth || user) && (
                <motion.div
                  key={link.path}
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 0 }}
                >
                  <Link
                    to={link.path}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs xl:text-sm font-medium transition-all",
                      isActive(link.path) 
                        ? "text-brand bg-brand/10" 
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <link.icon className="w-3.5 h-3.5" />
                    {link.name}
                  </Link>
                </motion.div>
              )
            ))}
            {profile?.is_admin && (
              <motion.div
                whileHover={{ y: -1 }}
                whileTap={{ y: 0 }}
              >
                <Link
                  to="/admin"
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs xl:text-sm font-medium transition-all",
                    isActive('/admin')
                      ? "text-brand bg-brand/10"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin
                </Link>
              </motion.div>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <div className="scale-90 sm:scale-100 origin-right">
                  <NotificationCenter />
                </div>

                <div className="relative">
                  <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-1.5 sm:gap-2 pl-1.5 pr-2 sm:pl-2 sm:pr-3 py-1 sm:py-1.5 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl hover:bg-white/10 transition-all"
                  >
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-brand rounded-md sm:rounded-lg flex items-center justify-center text-white text-xs sm:text-xs font-bold">
                      {user.email?.[0].toUpperCase()}
                    </div>
                    <div className="hidden xl:flex flex-col items-start leading-none">
                      <span className="text-[10px] font-bold text-white truncate max-w-[80px]">{profile?.full_name || 'User'}</span>
                      <span className="text-[8px] text-gray-500 truncate max-w-[80px]">{user.email}</span>
                    </div>
                    <ChevronDown className={cn("w-3 h-3 sm:w-4 sm:h-4 text-gray-500 transition-transform", isUserMenuOpen && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-56 bg-[#111111] border border-white/10 rounded-2xl shadow-2xl py-2 z-50"
                      >
                        <div className="px-4 py-2 border-b border-white/5 mb-2">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Account</p>
                          <p className="text-sm font-medium text-white truncate">{user.email}</p>
                        </div>
                        <Link to="/dashboard?tab=settings" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                          <UserIcon className="w-4 h-4" />
                          Profile Settings
                        </Link>
                        <button 
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors mt-2"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <Link to="/auth" className="btn-primary py-2 text-sm">
                Get Started
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-400 hover:bg-white/5 rounded-xl transition-all"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="lg:hidden bg-[#050505] border-b border-white/10 overflow-hidden"
          >
            <div className="py-6 px-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                {navLinks.map((link) => (
                  (!link.auth || user) && (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-4 sm:p-4 rounded-xl sm:rounded-2xl text-xs sm:text-xs font-bold transition-all border border-white/5",
                        isActive(link.path) 
                          ? "text-brand bg-brand/10 border-brand/20" 
                          : "text-gray-400 bg-white/5 hover:bg-white/10"
                      )}
                    >
                      <link.icon className="w-5 h-5 sm:w-5 sm:h-5" />
                      {link.name}
                    </Link>
                  )
                ))}
                {user && (
                  <Link
                    to="/p2p?create=true"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex flex-col items-center justify-center gap-2 p-4 sm:p-4 rounded-xl sm:rounded-2xl text-xs sm:text-xs font-bold transition-all border border-brand/20 text-brand bg-brand/5"
                  >
                    <Plus className="w-5 h-5 sm:w-5 sm:h-5" />
                    Post Ad
                  </Link>
                )}
              </div>

              {user ? (
                <div className="space-y-2">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-brand rounded-xl flex items-center justify-center text-white text-lg font-bold">
                      {user.email?.[0].toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">{profile?.full_name || 'User'}</span>
                      <span className="text-xs text-gray-500">{user.email}</span>
                    </div>
                  </div>
                  
                  <Link 
                    to="/dashboard?tab=settings" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-bold text-gray-400 bg-white/5 hover:bg-white/10 transition-all"
                  >
                    <UserIcon className="w-5 h-5" />
                    Profile Settings
                  </Link>
                  
                  <button 
                    onClick={() => {
                      handleSignOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-bold text-red-400 bg-red-400/5 hover:bg-red-400/10 transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link 
                  to="/auth" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full btn-primary py-4 flex items-center justify-center gap-2"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </Link>
              )}

              <div className="pt-6 border-t border-white/5 flex items-center justify-center gap-6">
                <a href="#" className="text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Support</a>
                <a href="#" className="text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Terms</a>
                <a href="#" className="text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Privacy</a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
