import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, ArrowRight, Loader2, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import TwoFactorModal from '../components/TwoFactorModal';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [show2FA, setShow2FA] = useState(false);
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // If there's a referral code, switch to sign up mode
    if (referralCode) {
      setIsLogin(false);
    }
  }, [referralCode]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        if (user) {
          // Check if 2FA is enabled
          const { data: profile } = await supabase
            .from('profiles')
            .select('two_factor_enabled')
            .eq('id', user.id)
            .single();

          if (profile?.two_factor_enabled) {
            setTempUserId(user.id);
            setShow2FA(true);
            setLoading(false);
            return;
          }
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              full_name: fullName,
              referred_by: referralCode
            },
          },
        });
        if (error) throw error;
        setSuccess('Registration successful! Please check your email for verification.');
      }
      if (isLogin && !show2FA) navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [success, setSuccess] = useState<string | null>(null);
  const [resetMode, setResetMode] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?tab=reset`,
      });
      if (error) throw error;
      setSuccess('Password reset link sent! Please check your email.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl overflow-hidden border border-gray-100">
              <img 
                src="https://res.cloudinary.com/dvep5xtf2/image/upload/v1774265829/logo.png_l0lsdc.png" 
                alt="Y" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=Y&background=4F46E5&color=fff&bold=true';
                }}
              />
            </div>
          </div>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">
              {resetMode ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Account')}
            </h2>
            <p className="text-gray-500">
              {resetMode 
                ? 'Enter your email to receive a password reset link' 
                : (isLogin ? 'Enter your credentials to access your account' : 'Join Ypay and start trading USDT instantly')}
            </p>
          </div>

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
              {success}
            </div>
          )}

          <form onSubmit={resetMode ? handleResetPassword : handleAuth} className="space-y-4">
            {!isLogin && !resetMode && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-blue-500/50 transition-colors text-white"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-blue-500/50 transition-colors text-white"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {!resetMode && (
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-sm font-medium text-gray-500">Password</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setResetMode(true)}
                      className="text-xs text-blue-500 hover:text-blue-400 font-medium"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-blue-500/50 transition-colors text-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2 group"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{resetMode ? 'Send Reset Link' : (isLogin ? 'Sign In' : 'Sign Up')}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center space-y-4">
            {resetMode ? (
              <button
                onClick={() => setResetMode(false)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Back to Sign In
              </button>
            ) : (
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {tempUserId && (
        <TwoFactorModal
          isOpen={show2FA}
          onClose={() => {
            setShow2FA(false);
            supabase.auth.signOut();
          }}
          onSuccess={() => navigate('/dashboard')}
          userId={tempUserId}
          action="verify"
        />
      )}
    </div>
  );
}
