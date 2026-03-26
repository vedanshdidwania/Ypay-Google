import React, { useState } from 'react';
import { Shield, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  action: 'enable' | 'verify';
}

export default function TwoFactorModal({ isOpen, onClose, onSuccess, userId, action }: TwoFactorModalProps) {
  const [step, setStep] = useState<'qr' | 'verify'>(action === 'enable' ? 'qr' : 'verify');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');

  const generateSecret = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: (await supabase.auth.getUser()).data.user?.email })
      });
      const data = await response.json();

      if (data.error) throw new Error(data.error);
      setQrCode(data.qrCodeUrl);
      setSecret(data.secret);
      setStep('qr');
    } catch (error: any) {
      console.error('Error generating 2FA secret:', error);
      toast.error(error.message || 'Failed to generate 2FA secret');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;

    try {
      setLoading(true);
      if (action === 'enable') {
        const response = await fetch('/api/auth/2fa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, secret, code })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        
        toast.success('2FA enabled successfully!');
        onSuccess();
        onClose();
      } else {
        const response = await fetch('/api/auth/2fa/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, code })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        if (data.isValid) {
          onSuccess();
          onClose();
        } else {
          toast.error('Invalid verification code');
        }
      }
    } catch (error: any) {
      console.error('Error verifying 2FA code:', error);
      toast.error(error.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && action === 'enable' && !qrCode) {
      generateSecret();
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center text-brand mb-6 border border-brand/20">
                <Shield className="w-8 h-8" />
              </div>
              
              <h2 className="text-2xl font-display font-bold text-white mb-2">
                {action === 'enable' ? 'Enable Two-Factor' : 'Two-Factor Verification'}
              </h2>
              <p className="text-gray-400 text-sm mb-8">
                {action === 'enable' 
                  ? 'Scan the QR code with your authenticator app to get started.' 
                  : 'Enter the 6-digit code from your authenticator app.'}
              </p>

              {step === 'qr' && qrCode && (
                <div className="space-y-6 w-full">
                  <div className="bg-white p-4 rounded-2xl inline-block mx-auto mb-4">
                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-left">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Secret Key</p>
                    <p className="text-sm font-mono text-white break-all">{secret}</p>
                  </div>
                  <button
                    onClick={() => setStep('verify')}
                    className="w-full py-4 btn-primary rounded-2xl font-bold shadow-lg shadow-brand/20"
                  >
                    Next Step
                  </button>
                </div>
              )}

              {step === 'verify' && (
                <div className="space-y-6 w-full">
                  <div className="flex justify-center gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-3xl font-mono font-bold text-center text-white focus:outline-none focus:border-brand tracking-[0.5em]"
                    />
                  </div>
                  <button
                    onClick={handleVerify}
                    disabled={loading || code.length !== 6}
                    className="w-full py-4 btn-primary rounded-2xl font-bold shadow-lg shadow-brand/20 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Verify Code'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
