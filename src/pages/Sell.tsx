import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';
import { Wallet, ArrowRight, Copy, CheckCircle2, Loader2, Info, ExternalLink } from 'lucide-react';
import { cn, formatCurrency, formatUSDT } from '../lib/utils';
import type { AppSettings } from '../types';

export default function Sell() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [usdtAmount, setUsdtAmount] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('app_settings').select('*').limit(1);
    if (data && data.length > 0) setSettings(data[0]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitOrder = async () => {
    if (!profile || !usdtAmount || !txHash) return;
    setLoading(true);

    try {
      const inrAmountRaw = parseFloat(usdtAmount) * (settings?.sell_rate || 1);
      const inrAmountWithFee = inrAmountRaw * (1 - (settings?.platform_fee || 0) / 100);

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const { error: orderError } = await supabase.from('orders').insert({
        user_id: profile.id,
        type: 'sell',
        amount_inr: inrAmountWithFee,
        amount_usdt: parseFloat(usdtAmount),
        rate: settings?.sell_rate,
        status: 'pending',
        transaction_hash: txHash,
        expires_at: expiresAt,
      });

      if (orderError) throw orderError;
      setStep(3);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#050505] pt-24 pb-12">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-12 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 -z-10" />
          {[1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all border-2",
                step >= i ? "bg-brand border-brand text-white shadow-lg shadow-brand/20" : "bg-[#111111] border-white/10 text-gray-500"
              )}
            >
              {step > i ? <CheckCircle2 className="w-6 h-6" /> : i}
            </div>
          ))}
        </div>

        <div className="card p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-2xl font-bold mb-6 text-white">Enter USDT Amount</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">You Sell (USDT)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={usdtAmount}
                      onChange={(e) => setUsdtAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-2xl font-bold focus:outline-none focus:border-brand/50 transition-colors text-white"
                      placeholder="0.00"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-brand">USDT</div>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/10 flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">You will receive</div>
                    <div className="text-xl font-bold text-green-400">
                      {formatCurrency((parseFloat(usdtAmount || '0') * (settings?.sell_rate || 1)) * (1 - (settings?.platform_fee || 0) / 100))}
                    </div>
                    {settings?.platform_fee && (
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                        Incl. {settings.platform_fee}% Protocol Fee
                      </div>
                    )}
                  </div>
                </div>
                <button
                  disabled={!usdtAmount || parseFloat(usdtAmount) <= 0}
                  onClick={() => setStep(2)}
                  className="w-full py-4 bg-brand hover:bg-brand/90 disabled:bg-brand/50 text-white font-bold rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-brand/20"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-2xl font-bold mb-2 text-white">Transfer USDT</h2>
              <p className="text-gray-400 mb-8">Send USDT (TRC20) to the wallet address below.</p>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <span className="text-gray-500 font-medium">Amount to Send</span>
                  <span className="text-2xl font-bold text-brand">{formatUSDT(parseFloat(usdtAmount))}</span>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Our USDT Wallet (TRC20)</label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm truncate text-white">
                      {settings?.admin_wallet_address || 'Loading...'}
                    </div>
                    <button
                      onClick={() => copyToClipboard(settings?.admin_wallet_address || '')}
                      className="p-3 bg-brand hover:bg-brand/90 rounded-xl transition-all shadow-lg shadow-brand/20"
                    >
                      {copied ? <CheckCircle2 className="w-5 h-5 text-white" /> : <Copy className="w-5 h-5 text-white" />}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10 flex items-start space-x-3">
                  <Info className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <p className="text-xs text-yellow-500/80 leading-relaxed">
                    Only send USDT via the TRON (TRC20) network. Sending any other asset or using a different network will result in permanent loss of funds.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-400">Transaction Hash (TXID)</label>
                  <input
                    type="text"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand/50 transition-colors font-mono text-sm text-white"
                    placeholder="Enter 64-character hash"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={() => setStep(1)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all border border-white/10">Back</button>
                  <button
                    disabled={!txHash || loading}
                    onClick={handleSubmitOrder}
                    className="flex-[2] py-4 bg-brand hover:bg-brand/90 disabled:bg-brand/50 text-white font-bold rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-brand/20"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Submit Order</span>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-3xl font-bold mb-4 text-white">Order Submitted!</h2>
              <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                Your sell order has been received. Once the transaction is confirmed on the blockchain, we will process your payment.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-8 py-4 bg-brand hover:bg-brand/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand/20"
              >
                Go to Dashboard
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
