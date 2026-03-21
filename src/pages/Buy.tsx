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

      const usdtAmount = parseFloat(inrAmount) / (settings?.buy_rate || 1);

      const { error: orderError } = await supabase.from('orders').insert({
        user_id: profile.id,
        type: 'buy',
        amount_inr: parseFloat(inrAmount),
        amount_usdt: usdtAmount,
        rate: settings?.buy_rate,
        status: 'pending',
        payment_method_id: selectedMethod.id,
        payment_screenshot_url: screenshotUrl,
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
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-12 relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 -z-10" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all border-2",
              step >= i ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-[#0a0a0a] border-white/10 text-gray-500"
            )}
          >
            {step > i ? <CheckCircle2 className="w-6 h-6" /> : i}
          </div>
        ))}
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl font-bold mb-6">Enter Amount</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">You Pay (INR)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={inrAmount}
                    onChange={(e) => setInrAmount(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-2xl font-bold focus:outline-none focus:border-blue-500/50 transition-colors"
                    placeholder="0.00"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">INR</div>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center space-x-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">Estimated USDT</div>
                  <div className="text-xl font-bold text-blue-400">
                    {formatUSDT(parseFloat(inrAmount || '0') / (settings?.buy_rate || 1))}
                  </div>
                </div>
              </div>
              <button
                disabled={!inrAmount || parseFloat(inrAmount) <= 0}
                onClick={() => setStep(2)}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold rounded-xl transition-all flex items-center justify-center space-x-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl font-bold mb-6">Select Payment Method</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method)}
                  className={cn(
                    "p-6 rounded-2xl border-2 transition-all text-left group",
                    selectedMethod?.id === method.id ? "bg-blue-600/10 border-blue-600" : "bg-white/5 border-white/5 hover:border-white/10"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                      <CreditCard className="w-5 h-5 text-blue-400" />
                    </div>
                    {selectedMethod?.id === method.id && <CheckCircle2 className="w-5 h-5 text-blue-400" />}
                  </div>
                  <div className="font-bold uppercase text-sm tracking-wider">{method.type}</div>
                  <div className="text-xs text-gray-500">{method.account_name}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 font-bold rounded-xl transition-all">Back</button>
              <button
                disabled={!selectedMethod}
                onClick={() => setStep(3)}
                className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold rounded-xl transition-all"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl font-bold mb-2">Make Payment</h2>
            <p className="text-gray-400 mb-8">Please pay the exact amount to the details below.</p>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-6 mb-8 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <span className="text-gray-500 font-medium">Amount to Pay</span>
                <span className="text-2xl font-bold text-green-400">{formatCurrency(parseFloat(inrAmount))}</span>
              </div>
              
              {selectedMethod?.upi_id && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">UPI ID</span>
                  <span className="font-bold select-all">{selectedMethod.upi_id}</span>
                </div>
              )}
              {selectedMethod?.account_number && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Account Name</span>
                    <span className="font-bold">{selectedMethod.account_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Account Number</span>
                    <span className="font-bold select-all">{selectedMethod.account_number}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">IFSC Code</span>
                    <span className="font-bold select-all">{selectedMethod.ifsc}</span>
                  </div>
                </>
              )}
              {selectedMethod?.qr_image_url && (
                <div className="flex flex-col items-center pt-4">
                  <img src={selectedMethod.qr_image_url} alt="QR Code" className="w-48 h-48 rounded-xl mb-2" />
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
                  className="w-full h-40 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-all overflow-hidden"
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
                <button onClick={() => setStep(2)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 font-bold rounded-xl transition-all">Back</button>
                <button
                  disabled={!screenshot || loading}
                  onClick={handleSubmitOrder}
                  className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold rounded-xl transition-all flex items-center justify-center space-x-2"
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
            <h2 className="text-3xl font-bold mb-4">Order Submitted!</h2>
            <p className="text-gray-400 mb-8 max-w-sm mx-auto">
              Your order has been received and is currently under review. You can track the status in your dashboard.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all"
            >
              Go to Dashboard
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
