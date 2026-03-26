import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';
import { CreditCard, ArrowRight, Upload, CheckCircle2, Loader2, Info } from 'lucide-react';
import { cn, formatCurrency, formatUSDT } from '../lib/utils';
import type { AppSettings, PaymentMethod } from '../types';

export default function Buy() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [inrAmount, setInrAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [settingsRes, methodsRes] = await Promise.all([
      supabase.from('app_settings').select('*').single(),
      supabase.from('payment_methods').select('*').eq('is_active', true)
    ]);

    if (settingsRes.data) setSettings(settingsRes.data);
    if (methodsRes.data) setPaymentMethods(methodsRes.data);
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => setScreenshotPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitOrder = async () => {
    if (!profile || !selectedMethod || !inrAmount) return;
    setLoading(true);

    try {
      let screenshotUrl = '';
      if (screenshot) {
        const fileExt = screenshot.name.split('.').pop();
        const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('screenshots')
          .upload(fileName, screenshot);

        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('screenshots').getPublicUrl(fileName);
        screenshotUrl = publicUrl;
      }

      const usdtAmountRaw = parseFloat(inrAmount) / (settings?.buy_rate || 1);
      const usdtAmountWithFee = usdtAmountRaw * (1 - (settings?.platform_fee || 0) / 100);

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const { error: orderError } = await supabase.from('orders').insert({
        user_id: profile.id,
        type: 'buy',
        amount_inr: parseFloat(inrAmount),
        amount_usdt: usdtAmountWithFee,
        rate: settings?.buy_rate,
        status: 'pending',
        payment_method_id: selectedMethod.id,
        payment_screenshot_url: screenshotUrl,
        expires_at: expiresAt,
      });

      if (orderError) throw orderError;
      setStep(4);
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
          {[1, 2, 3].map((i) => (
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
              <h2 className="text-2xl font-bold mb-6 text-white">Enter Amount</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">You Pay (INR)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={inrAmount}
                      onChange={(e) => setInrAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-2xl font-bold focus:outline-none focus:border-brand/50 transition-colors text-white"
                      placeholder="0.00"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">INR</div>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-brand/5 border border-brand/10 flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Estimated USDT</div>
                    <div className="text-xl font-bold text-brand">
                      {formatUSDT((parseFloat(inrAmount || '0') / (settings?.buy_rate || 1)) * (1 - (settings?.platform_fee || 0) / 100))}
                    </div>
                    {settings?.platform_fee && (
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                        Incl. {settings.platform_fee}% Protocol Fee
                      </div>
                    )}
                  </div>
                </div>
                <button
                  disabled={!inrAmount || parseFloat(inrAmount) <= 0}
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
              <h2 className="text-2xl font-bold mb-6 text-white">Select Payment Method</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method)}
                    className={cn(
                      "p-6 rounded-2xl border-2 transition-all text-left group",
                      selectedMethod?.id === method.id ? "bg-brand/10 border-brand" : "bg-white/5 border-white/5 hover:border-white/10"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                        <CreditCard className="w-5 h-5 text-brand" />
                      </div>
                      {selectedMethod?.id === method.id && <CheckCircle2 className="w-5 h-5 text-brand" />}
                    </div>
                    <div className="font-bold uppercase text-sm tracking-wider text-white">{method.type}</div>
                    <div className="text-xs text-gray-500">{method.account_name}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all border border-white/10">Back</button>
                <button
                  disabled={!selectedMethod}
                  onClick={() => setStep(3)}
                  className="flex-[2] py-4 bg-brand hover:bg-brand/90 disabled:bg-brand/50 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand/20"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-2xl font-bold mb-2 text-white">Make Payment</h2>
              <p className="text-gray-400 mb-8">Please pay the exact amount to the details below.</p>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <span className="text-gray-500 font-medium">Amount to Pay</span>
                  <span className="text-2xl font-bold text-green-400">{formatCurrency(parseFloat(inrAmount))}</span>
                </div>
                
                {selectedMethod?.upi_id && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">UPI ID</span>
                    <span className="font-bold select-all text-white">{selectedMethod.upi_id}</span>
                  </div>
                )}
                {selectedMethod?.account_number && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Account Name</span>
                      <span className="font-bold text-white">{selectedMethod.account_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Account Number</span>
                      <span className="font-bold select-all text-white">{selectedMethod.account_number}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">IFSC Code</span>
                      <span className="font-bold select-all text-white">{selectedMethod.ifsc}</span>
                    </div>
                  </>
                )}
                {selectedMethod?.qr_image_url && (
                  <div className="flex flex-col items-center pt-4">
                    <img src={selectedMethod.qr_image_url} alt="QR Code" className="w-48 h-48 rounded-xl mb-2 border border-white/10" />
                    <span className="text-xs text-gray-500">Scan to Pay</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-400">Upload Payment Screenshot</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    className="hidden"
                    id="screenshot-upload"
                  />
                  <label
                    htmlFor="screenshot-upload"
                    className="w-full h-40 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-brand/50 transition-all overflow-hidden bg-white/5"
                  >
                    {screenshotPreview ? (
                      <img src={screenshotPreview} alt="Preview" className="w-full h-full object-contain" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-500 mb-2" />
                        <span className="text-sm text-gray-500">Click to upload screenshot</span>
                      </>
                    )}
                  </label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={() => setStep(2)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all border border-white/10">Back</button>
                  <button
                    disabled={!screenshot || loading}
                    onClick={handleSubmitOrder}
                    className="flex-[2] py-4 bg-brand hover:bg-brand/90 disabled:bg-brand/50 text-white font-bold rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-brand/20"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Submit Order</span>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-3xl font-bold mb-4 text-white">Order Submitted!</h2>
              <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                Your order has been received and is currently under review. You can track the status in your dashboard.
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
