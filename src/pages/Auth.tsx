import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, ArrowRight, Loader2, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import TwoFactorModal from '../components/TwoFactorModal';
import Logo from '../components/Logo';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(() => {
    const pending = sessionStorage.getItem('pending_verification_email');
    console.log('Initial email from session:', pending);
    return pending || '';
  });
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showOtpStep, setShowOtpStep] = useState(() => {
    const pending = !!sessionStorage.getItem('pending_verification_email');
    console.log('Initial showOtpStep from session:', pending);
    return pending;
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [show2FA, setShow2FA] = useState(false);
  const [resetMode, setResetMode] = useState(false);
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
        console.log('Attempting sign up for:', email);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              full_name: fullName,
              phone_number: phone || null,
              referred_by: referralCode
            },
          },
        });
        
        console.log('Sign up response:', { user: data.user, session: data.session, error });
        
        if (error) throw error;
        
        if (data.user && !data.session) {
          console.log('Setting OTP step to true');
          sessionStorage.setItem('pending_verification_email', email);
          setShowOtpStep(true);
          setSuccess('A 6-digit verification code has been sent to your email.');
        } else if (data.session) {
          console.log('Session present, navigating to dashboard');
          sessionStorage.removeItem('pending_verification_email');
          navigate('/dashboard');
        } else if (data.user) {
          // Fallback for some Supabase configurations
          console.log('User present but no session, forcing OTP step');
          sessionStorage.setItem('pending_verification_email', email);
          setShowOtpStep(true);
        }
      }
      if (isLogin && !show2FA) navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: 'signup',
      });

      if (verifyError) throw verifyError;

      sessionStorage.removeItem('pending_verification_email');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to verify code.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = () => {
    sessionStorage.removeItem('pending_verification_email');
    setShowOtpStep(false);
    setOtpCode('');
    setError(null);
    setSuccess(null);
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      setSuccess('Verification code resent successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center page-padding">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/10 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="card card-padding shadow-2xl">
          <div className="flex justify-center mb-8">
            <Logo showText={false} size="xl" />
          </div>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">
              {showOtpStep ? 'Verify Email' : (resetMode ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Account'))}
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              {showOtpStep 
                ? (
                  <>
                    Enter the code sent to <span className="text-brand font-medium">{email}</span>
                    <button
                      onClick={handleChangeEmail}
                      className="block mx-auto text-xs text-brand hover:text-brand/80 mt-2 font-medium"
                    >
                      Change email
                    </button>
                  </>
                )
                : (resetMode 
                  ? 'Enter your email to receive a password reset link' 
                  : (isLogin ? 'Enter your credentials to access your account' : 'Join Ypay and start trading USDT instantly'))}
            </p>
          </div>

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
              {success}
            </div>
          )}

          {showOtpStep ? (
            <form onSubmit={handleVerifyOtp} className="space-y-8">
              <div className="space-y-3">
                <label className="label-xs ml-1">Verification Code</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:border-brand/50 transition-colors text-white text-center tracking-[1em] text-2xl font-bold"
                    placeholder="000000"
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full py-4 bg-brand hover:bg-brand/90 disabled:bg-brand/50 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand/20 flex items-center justify-center space-x-2 group"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Verify & Complete</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-sm text-brand hover:text-brand/80 font-medium"
                >
                  Didn't receive the code? Resend
                </button>
              </div>

              <div className="pt-4 border-t border-white/5 text-center">
                <button
                  type="button"
                  onClick={() => setShowOtpStep(false)}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Back to Registration
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={resetMode ? handleResetPassword : handleAuth} className="space-y-6">
            {!isLogin && !resetMode && (
              <>
                <div className="space-y-3">
                  <label className="label-xs ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:border-brand/50 transition-colors text-white"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="label-xs ml-1">Mobile Number (Optional)</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:border-brand/50 transition-colors text-white"
                      placeholder="+1 234 567 890"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-3">
              <label className="label-xs ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:border-brand/50 transition-colors text-white"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {!resetMode && (
              <div className="space-y-3">
                <div className="flex items-center justify-between ml-1">
                  <label className="label-xs">Password</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setResetMode(true)}
                      className="text-xs text-brand hover:text-brand/80 font-medium"
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
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:border-brand/50 transition-colors text-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
                {success}
              </div>
            )}

            {!isLogin && !resetMode && sessionStorage.getItem('pending_verification_email') && (
              <div className="p-5 rounded-xl bg-brand/10 border border-brand/20 text-center space-y-3">
                <p className="text-sm text-brand">You have a pending verification for {sessionStorage.getItem('pending_verification_email')}</p>
                <button
                  type="button"
                  onClick={() => setShowOtpStep(true)}
                  className="text-sm text-brand hover:text-brand/80 font-bold underline"
                >
                  Go to OTP Verification
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-brand hover:bg-brand/90 disabled:bg-brand/50 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand/20 flex items-center justify-center space-x-2 group"
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
          )}

          {!showOtpStep && (
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
          )}
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
