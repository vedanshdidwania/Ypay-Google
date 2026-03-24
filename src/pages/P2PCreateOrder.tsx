import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';
import { 
  ArrowLeft, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  Clock,
  User,
  Star
} from 'lucide-react';
import { cn, formatCurrency, formatUSDT } from '../lib/utils';
import { motion } from 'framer-motion';

interface Ad {
  id: string;
  user_id: string;
  type: 'buy' | 'sell';
  price: number;
  min_limit: number;
  max_limit: number;
  payment_methods: string[];
  user_profile?: {
    full_name: string;
    email: string;
  };
}

export default function P2PCreateOrder() {
  const { adId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [paymentWindow, setPaymentWindow] = useState(15);
  const [isTrading, setIsTrading] = useState(false);

  useEffect(() => {
    if (adId) {
      fetchAd();
    }
  }, [adId]);

  const fetchAd = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ads')
        .select(`
          *,
          user_profile:profiles(full_name, email)
        `)
        .eq('id', adId)
        .single();

      if (error) throw error;
      setAd(data);
    } catch (error) {
      console.error('Error fetching ad:', error);
      navigate('/p2p');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !ad || !amount) return;

    try {
      setIsTrading(true);
      const inrAmount = parseFloat(amount);
      const usdtAmount = inrAmount / ad.price;
      
      const { data, error } = await supabase
        .from('orders')
        .insert({
          ad_id: ad.id,
          user_id: user.id,
          type: ad.type === 'buy' ? 'sell' : 'buy', // If ad is 'buy', user is 'selling'
          amount_inr: inrAmount,
          amount_usdt: usdtAmount,
          rate: ad.price,
          payment_window: paymentWindow,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      
      navigate(`/p2p/order/${data.id}`);
    } catch (error: any) {
      console.error('Error starting trade:', error);
      alert(error.message || 'Failed to initiate trade. Please try again.');
    } finally {
      setIsTrading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!ad) return null;

  const usdtAmount = amount ? (parseFloat(amount) / ad.price).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-[#050505] pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        <button 
          onClick={() => navigate('/p2p')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold uppercase tracking-widest text-xs">Back to Marketplace</span>
        </button>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left Side: Ad Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{ad.user_profile?.full_name || 'Merchant'}</h3>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-3 h-3 fill-current" />
                    <span className="text-xs font-bold">4.9 (120+ trades)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Price</span>
                  <span className="font-bold text-white">₹{ad.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Limits</span>
                  <span className="font-bold text-white">₹{ad.min_limit.toLocaleString()} - ₹{ad.max_limit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Payment Methods</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {ad.payment_methods.map(pm => (
                      <span key={pm} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[10px] text-gray-400 font-bold uppercase">
                        {pm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6 bg-brand/5 border-brand/10">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white mb-1">Escrow Protection</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    The seller's USDT is locked in our secure escrow wallet. Once you complete the payment and the seller confirms, the USDT will be released to your wallet automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Order Form */}
          <div className="lg:col-span-3">
            <div className="card p-8">
              <h2 className="text-2xl font-display font-bold text-white mb-8">
                {ad.type === 'buy' ? 'Sell' : 'Buy'} USDT
              </h2>

              <form onSubmit={handleStartTrade} className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Amount to {ad.type === 'buy' ? 'Sell' : 'Buy'}</label>
                    <span className="text-[10px] font-bold text-brand uppercase tracking-widest">
                      Balance: {ad.type === 'buy' ? '0.00 USDT' : '₹0.00'}
                    </span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      required
                      min={ad.min_limit}
                      max={ad.max_limit}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-3xl font-bold focus:outline-none focus:border-brand/50 transition-colors text-white" 
                      placeholder={`${ad.min_limit} - ${ad.max_limit}`}
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-gray-500">INR</div>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">You will {ad.type === 'buy' ? 'Send' : 'Receive'}</p>
                      <p className="text-2xl font-bold text-brand">{usdtAmount} USDT</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Price</p>
                      <p className="text-lg font-bold text-white">₹{ad.price.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Payment Window</label>
                  <div className="grid grid-cols-4 gap-3">
                    {[15, 30, 45, 60].map((min) => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => setPaymentWindow(min)}
                        className={cn(
                          "px-4 py-3 rounded-xl border text-xs font-bold transition-all",
                          paymentWindow === min 
                            ? "bg-brand/10 border-brand text-brand shadow-lg shadow-brand/10" 
                            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                        )}
                      >
                        {min}m
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Please ensure you can complete the payment within the selected window. 
                    Frequent cancellations may lead to account restrictions.
                  </p>
                </div>

                <button 
                  type="submit" 
                  disabled={isTrading || !amount}
                  className={cn(
                    "w-full py-5 rounded-2xl font-bold text-white shadow-xl transition-all flex items-center justify-center gap-3",
                    ad.type === 'buy' ? "bg-red-600 hover:bg-red-700 shadow-red-600/20" : "bg-green-600 hover:bg-green-700 shadow-green-600/20",
                    (isTrading || !amount) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isTrading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Initiating Trade...</span>
                    </>
                  ) : (
                    <>
                      <span>{ad.type === 'buy' ? 'Sell' : 'Buy'} USDT Now</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
