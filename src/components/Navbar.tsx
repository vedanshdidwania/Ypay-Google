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
  ShoppingCart
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { cn } from '../lib/utils';
import { NotificationCenter } from './Notifications';

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
    { name: 'Wallet', path: '/wallet', icon: Wallet, auth: true },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, auth: true },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      isScrolled ? "bg-white/80 backdrop-blur-md border-b border-gray-200 py-3" : "bg-transparent py-5"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-brand/10 group-hover:scale-105 transition-transform overflow-hidden">
              <img src="/logo.png" alt="Ypay Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-display font-bold text-gray-900 tracking-tight leading-none">YPAY</span>
              <span className="text-[10px] font-bold text-brand uppercase tracking-widest mt-0.5">P2P Protocol</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              (!link.auth || user) && (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                    isActive(link.path) 
                      ? "text-brand bg-brand-light" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <link.icon className="w-4 h-4" />
                  {link.name}
                </Link>
              )
            ))}
            {profile?.is_admin && (
              <Link
                to="/admin"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  isActive('/admin')
                    ? "text-brand bg-brand-light"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                <ShieldCheck className="w-4 h-4" />
                Admin
              </Link>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <NotificationCenter />

                <div className="relative">
                  <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-all"
                  >
                    <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-white text-xs font-bold">
                      {user.email?.[0].toUpperCase()}
                    </div>
                    <div className="hidden sm:flex flex-col items-start leading-none">
                      <span className="text-[10px] font-bold text-gray-900 truncate max-w-[80px]">{profile?.full_name || 'User'}</span>
                      <span className="text-[8px] text-gray-500 truncate max-w-[80px]">{user.email}</span>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform", isUserMenuOpen && "rotate-180")} />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100 mb-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Account</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                      </div>
                      <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                        <UserIcon className="w-4 h-4" />
                        Profile Settings
                      </Link>
                      <button 
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors mt-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
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
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 py-4 px-4 space-y-2">
          {navLinks.map((link) => (
            (!link.auth || user) && (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive(link.path) 
                    ? "text-brand bg-brand-light" 
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <link.icon className="w-5 h-5" />
                {link.name}
              </Link>
            )
          ))}
          {user && (
            <button 
              onClick={() => {
                handleSignOut();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
