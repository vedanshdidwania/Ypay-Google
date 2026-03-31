import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';
import { 
  ArrowLeft, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  Clock,
  User,
  Star,
  Info,
  Zap,
  MessageSquare
} from 'lucide-react';
import { cn, formatCurrency, formatUSDT } from '../lib/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface Ad {
  id: string;
  user_id: string;
  type: 'buy' | 'sell';
  asset: string;
  price: number;
  min_limit: number;
  max_limit: number;
  total_amount: number;
  payment_methods: string[];
  user_profile?: {
    full_name: string;
    email: string;
    trades_completed: number;
    completion_rate: number;
    rating_sum: number;
    rating_count: number;
    speed_rating: number;
    comm_rating: number;
    is_verified_merchant: boolean;
  };
}

export default function P2PCreateOrder() {
  const { adId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [ad, setAd] = useState<Ad | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fiatAmount, setFiatAmount] = useState('');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [inputMode, setInputMode] = useState<'fiat' | 'crypto'>('fiat');
  const [paymentWindow, setPaymentWindow] = useState(15);
  const [isTrading, setIsTrading] = useState(false);
  const [platformFee, setPlatformFee] = useState(0);

  useEffect(() => {
    if (adId) {
      fetchAd();
      fetchSettings();
    }
  }, [adId]);

  const handleFiatChange = (value: string) => {
    setFiatAmount(value);
    if (ad && ad.price > 0 && value) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        // Use higher precision for crypto to satisfy RPC validation
        const crypto = (numValue / ad.price).toFixed(8);
        setCryptoAmount(crypto);
      } else {
        setCryptoAmount('');
      }
    } else {
      setCryptoAmount('');
    }
  };

  const handleCryptoChange = (value: string) => {
    setCryptoAmount(value);
    if (ad && ad.price > 0 && value) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        // Fiat is usually 2 decimals
        const fiat = (numValue * ad.price).toFixed(2);
        setFiatAmount(fiat);
      } else {
        setFiatAmount('');
      }
    } else {
      setFiatAmount('');
    }
  };

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('app_settings').select('*').limit(1).single();
      if (data) {
        setSettings(data);
        setPlatformFee(data.platform_fee || 0);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchAd = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ads')
        .select(`
          *,
          user_profile:profiles(full_name, email, trades_completed, completion_rate, rating_sum, rating_count, speed_rating, comm_rating, is_verified_merchant)
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
    if (!isSupabaseConfigured) {
      toast.error('Supabase is not configured. Please check your environment variables.');
      return;
    }
    if (!user || !ad || !fiatAmount || !cryptoAmount) {
      toast.error('Missing required information to start trade');
      return;
    }

    if (ad.user_id === user.id) {
      toast.error('You cannot trade with your own advertisement');
      return;
    }

    try {
      setIsTrading(true);
      let inrAmount = parseFloat(fiatAmount);
      let cryptoQty = parseFloat(cryptoAmount);

      if (isNaN(inrAmount) || isNaN(cryptoQty) || inrAmount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      // Ensure exact precision for RPC validation to avoid "Amount mismatch" errors
      let finalInr = inrAmount;
      let finalCrypto = cryptoQty;

      if (inputMode === 'fiat') {
        finalCrypto = Number((finalInr / ad.price).toFixed(8));
      } else {
        finalInr = Number((finalCrypto * ad.price).toFixed(2));
      }

      // Check seller balance if user is selling (ad type is 'buy')
      if (ad.type === 'buy') {
        const { data: profile, error: profileError } = await supabase.from('profiles').select('balance_usdt').eq('id', user.id).single();
        if (profileError) {
          console.error('Error fetching profile balance:', profileError);
          throw new Error('Failed to verify your balance. Please try again.');
        }
        if (profile && profile.balance_usdt < finalCrypto) {
          toast.error(`Insufficient balance. You need ${finalCrypto.toFixed(2)} USDT to sell.`);
          return;
        }
      }

      // Check limits
      if (finalInr < ad.min_limit || finalInr > ad.max_limit) {
        toast.error(`Amount must be between ₹${ad.min_limit.toLocaleString()} and ₹${ad.max_limit.toLocaleString()}`);
        return;
      }

      // Check ad total amount
      if (ad.total_amount && finalCrypto > ad.total_amount) {
        toast.error(`Maximum available quantity is ${ad.total_amount.toFixed(2)} ${ad.asset}`);
        return;
      }

      console.log('Starting P2P trade with params:', {
        p_ad_id: ad.id,
        p_amount_usdt: finalCrypto,
        p_amount_inr: finalInr,
        p_rate: ad.price
      });

      const { data: orderId, error } = await supabase.rpc('start_p2p_trade', {
        p_ad_id: ad.id,
        p_amount_usdt: finalCrypto,
        p_amount_inr: finalInr,
        p_rate: ad.price
      });

      if (error) {
        console.error('Supabase RPC error starting trade:', error);
        throw error;
      }

      // Send notification to ad owner
      await supabase.from('notifications').insert({
        user_id: ad.user_id,
        title: 'New P2P Order',
        message: `You have a new ${ad.type === 'buy' ? 'sell' : 'buy'} order for ${finalCrypto.toFixed(2)} ${ad.asset}`,
        type: 'order_update',
        is_read: false
      });
      
      toast.success('Order created successfully!');
      navigate(`/p2p/order/${orderId}`);
    } catch (error: any) {
      console.error('Error starting trade:', error);
      toast.error(error.message || 'Failed to start trade. Please try again.');
    } finally {
      setIsTrading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-brand" />
      </div>
    );
  }

  if (!ad) return null;

  const cryptoFeeAmount = cryptoAmount ? (parseFloat(cryptoAmount) * platformFee / 100) : 0;
  const netCryptoAmount = cryptoAmount ? (parseFloat(cryptoAmount) - cryptoFeeAmount) : 0;

  return (
    <div className="min-h-screen bg-[#050505] pt-20 sm:pt-24 pb-8 sm:pb-12">
      <div className="max-w-5xl mx-auto px-4">
        <button 
          onClick={() => navigate('/p2p')}
          className="flex items-center gap-3 sm:gap-4 text-gray-400 hover:text-white mb-8 sm:mb-10 transition-all group"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-white/10 transition-all">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-0.5 transition-transform" />
          </div>
          <span className="font-bold uppercase tracking-widest text-[10px] sm:text-xs">Back to Marketplace</span>
        </button>

        <div className="grid lg:grid-cols-12 gap-6 sm:gap-10">
          {/* Left Side: Ad Info */}
          <div className="lg:col-span-4 space-y-6 sm:space-y-8">
            <div className="card p-6 sm:p-10">
              <div className="flex items-center gap-4 sm:gap-5 mb-8 sm:mb-10">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 bg-brand/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-brand border border-brand/20">
                    <User className="w-7 h-7 sm:w-10 sm:h-10" />
                  </div>
                  {ad.user_profile?.is_verified_merchant && (
                    <div className="absolute -bottom-1.5 -right-1.5 bg-[#050505] p-1 rounded-full">
                      <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-brand" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-2xl font-bold text-white tracking-tight truncate">
                    {ad.user_profile?.full_name || 'Anonymous'}
                  </h3>
                  <div className="flex items-center gap-2 sm:gap-2.5 mt-1 sm:mt-1.5">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={cn(
                            "w-3 h-3 sm:w-4 h-4", 
                            i < Math.round((ad.user_profile?.rating_sum || 0) / (ad.user_profile?.rating_count || 1)) 
                              ? "text-yellow-500 fill-current" 
                              : "text-gray-700"
                          )} 
                        />
                      ))}
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-gray-500">({ad.user_profile?.rating_count || 0})</span>
                  </div>
                </div>
              </div>

              <div className="space-y-5 sm:space-y-8">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">Price</span>
                  <span className="text-base sm:text-2xl font-bold text-white">₹{ad.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">Available</span>
                  <span className="text-xs sm:text-base font-bold text-brand">{ad.total_amount?.toFixed(2) || '0.00'} {ad.asset}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">Limits</span>
                  <span className="text-xs sm:text-base font-bold text-white">₹{ad.min_limit.toLocaleString()} - ₹{ad.max_limit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mt-1.5">Payments</span>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-end max-w-[140px] sm:max-w-[180px]">
                    {ad.payment_methods.map(pm => (
                      <span key={pm} className="px-2 py-1 sm:px-3 sm:py-1.5 bg-white/5 border border-white/10 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        {pm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 sm:mt-10 pt-8 sm:pt-10 border-t border-white/5 grid grid-cols-2 gap-4 sm:gap-5">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-brand" />
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">Speed</p>
                    <p className="text-xs sm:text-sm font-bold text-white">{ad.user_profile?.speed_rating || 5.0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-brand" />
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">Comm</p>
                    <p className="text-xs sm:text-sm font-bold text-white">{ad.user_profile?.comm_rating || 5.0}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-5 sm:p-8 bg-brand/5 border-brand/20">
              <div className="flex items-start gap-3 sm:gap-4">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-brand shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white mb-1.5 sm:mb-2">Institutional Escrow</p>
                  <p className="text-[10px] sm:text-xs text-gray-400 leading-relaxed">
                    The merchant's {ad.asset} is automatically locked in our secure escrow protocol. Release is only possible after payment verification.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Order Form */}
          <div className="lg:col-span-8">
            <div className="card p-6 sm:p-12">
              <div className="flex items-center justify-between mb-8 sm:mb-12">
                <h2 className="text-2xl sm:text-4xl font-display font-bold text-white tracking-tight">
                  {ad.type === 'buy' ? 'Sell' : 'Buy'} {ad.asset}
                </h2>
                <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 bg-white/5 rounded-lg sm:rounded-2xl border border-white/10">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-brand" />
                  <span className="text-[10px] sm:text-sm font-bold text-white">{paymentWindow}m Window</span>
                </div>
              </div>

              <form onSubmit={handleStartTrade} className="space-y-8 sm:space-y-12">
                <div className="space-y-8 sm:space-y-10">
                  <div className="flex flex-col gap-6 sm:gap-8">
                    <div className="flex p-1.5 sm:p-2 bg-white/5 rounded-xl sm:rounded-[24px] border border-white/10 w-full shadow-inner backdrop-blur-sm">
                      <button
                        type="button"
                        onClick={() => setInputMode('fiat')}
                        className={cn(
                          "flex-1 px-6 sm:px-10 py-4 sm:py-4.5 rounded-lg sm:rounded-[18px] text-xs sm:text-sm font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2",
                          inputMode === 'fiat' 
                            ? "bg-brand text-[#050505] shadow-[0_0_20px_rgba(var(--brand-rgb),0.3)]" 
                            : "text-gray-500 hover:text-white hover:bg-white/5"
                        )}
                      >
                        By Amount (INR)
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputMode('crypto')}
                        className={cn(
                          "flex-1 px-6 sm:px-10 py-4 sm:py-4.5 rounded-lg sm:rounded-[18px] text-xs sm:text-sm font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2",
                          inputMode === 'crypto' 
                            ? "bg-brand text-[#050505] shadow-[0_0_20px_rgba(var(--brand-rgb),0.3)]" 
                            : "text-gray-500 hover:text-white hover:bg-white/5"
                        )}
                      >
                        By Quantity ({ad.asset})
                      </button>
                    </div>

                    <div className="space-y-3 sm:space-y-5">
                      <div className="flex justify-between items-end px-2">
                        <label className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">
                          {inputMode === 'fiat' ? 'I want to pay' : 'I want to receive'}
                        </label>
                        <span className="text-[9px] sm:text-[11px] font-bold text-brand uppercase tracking-widest">
                          Limit: ₹{ad.min_limit.toLocaleString()} - ₹{ad.max_limit.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="relative">
                        {inputMode === 'fiat' ? (
                          <input 
                            type="number" 
                            required
                            min={ad.min_limit}
                            max={ad.max_limit}
                            value={fiatAmount}
                            onChange={(e) => handleFiatChange(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl sm:rounded-[2.5rem] px-6 sm:px-10 py-5 sm:py-8 text-2xl sm:text-5xl font-display font-bold focus:outline-none focus:border-brand/50 transition-all text-white placeholder:text-white/10" 
                            placeholder={`${ad.min_limit.toLocaleString()} - ${ad.max_limit.toLocaleString()}`}
                          />
                        ) : (
                          <input 
                            type="number" 
                            required
                            step="0.00000001"
                            value={cryptoAmount}
                            onChange={(e) => handleCryptoChange(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl sm:rounded-[2.5rem] px-6 sm:px-10 py-5 sm:py-8 text-2xl sm:text-5xl font-display font-bold focus:outline-none focus:border-brand/50 transition-all text-white placeholder:text-white/10" 
                            placeholder="0.00"
                          />
                        )}
                        <div className="absolute right-4 sm:right-10 top-1/2 -translate-y-1/2 flex items-center gap-3 sm:gap-6">
                          <button 
                            type="button"
                            onClick={() => {
                              if (inputMode === 'fiat') {
                                handleFiatChange(ad.max_limit.toString());
                              } else {
                                handleCryptoChange((ad.max_limit / ad.price).toFixed(8));
                              }
                            }}
                            className="text-[10px] sm:text-xs font-bold text-brand uppercase tracking-widest hover:text-brand/80 transition-colors"
                          >
                            Max
                          </button>
                          <div className="h-6 w-px bg-white/10" />
                          <div className="font-display font-bold text-gray-600 text-lg sm:text-2xl">
                            {inputMode === 'fiat' ? 'INR' : ad.asset}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                    <div className="p-6 sm:p-8 bg-white/5 rounded-xl sm:rounded-[2.5rem] border border-white/5">
                      <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 sm:mb-3">
                        {inputMode === 'fiat' ? `You will ${ad.type === 'buy' ? 'Send' : 'Receive'}` : 'Total Price'}
                      </p>
                      <div className="flex items-baseline gap-2 sm:gap-3">
                        {inputMode === 'fiat' ? (
                          <>
                            <p className="text-2xl sm:text-4xl font-display font-bold text-brand">
                              {cryptoAmount ? parseFloat(cryptoAmount).toFixed(8) : '0.00'}
                            </p>
                            <p className="text-xs sm:text-base font-bold text-gray-500">{ad.asset}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-2xl sm:text-4xl font-display font-bold text-brand">₹{parseFloat(fiatAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p className="text-xs sm:text-base font-bold text-gray-500">INR</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="p-6 sm:p-8 bg-white/5 rounded-xl sm:rounded-[2.5rem] border border-white/5 flex flex-col justify-center space-y-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">Platform Fee ({platformFee}%)</span>
                        <span className="text-[11px] sm:text-sm font-bold text-white">{cryptoFeeAmount > 0 ? cryptoFeeAmount.toFixed(8) : '0.00'} {ad.asset}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">Net Amount</span>
                        <span className="text-[11px] sm:text-sm font-bold text-brand">
                          {ad.type === 'buy' 
                            ? `₹${parseFloat(fiatAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                            : `${netCryptoAmount > 0 ? netCryptoAmount.toFixed(8) : '0.00'} ${ad.asset}`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-2.5 px-2">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                    <label className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">Payment Window</label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
                    {[15, 30, 45, 60].map((min) => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => setPaymentWindow(min)}
                        className={cn(
                          "py-4 sm:py-5 rounded-lg sm:rounded-2xl border text-xs sm:text-sm font-bold transition-all",
                          paymentWindow === min 
                            ? "bg-brand/10 border-brand text-brand shadow-lg shadow-brand/10" 
                            : "bg-white/5 border-white/10 text-gray-500 hover:bg-white/10"
                        )}
                      >
                        {min} Minutes
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-6 sm:p-8 bg-yellow-500/5 border border-yellow-500/20 rounded-xl sm:rounded-[2.5rem] flex items-start gap-4 sm:gap-5">
                  <AlertCircle className="w-5 h-5 sm:w-7 sm:h-7 text-yellow-500 shrink-0 mt-1" />
                  <div className="space-y-1 sm:space-y-2">
                    <p className="text-xs sm:text-sm font-bold text-white">Trading Policy</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 leading-relaxed">
                      Please ensure you can complete the payment within the selected window. 
                      Frequent cancellations or non-payment may lead to account suspension. 
                      Always use your own bank account for payments.
                    </p>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isTrading || !fiatAmount}
                  className={cn(
                    "w-full py-5 sm:py-8 rounded-xl sm:rounded-[2.5rem] font-display font-bold text-white shadow-2xl transition-all flex items-center justify-center gap-4 sm:gap-5 text-base sm:text-xl",
                    ad.type === 'buy' ? "bg-red-600 hover:bg-red-700 shadow-red-600/20" : "bg-green-600 hover:bg-green-700 shadow-green-600/20",
                    (isTrading || !fiatAmount) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isTrading ? (
                    <>
                      <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" />
                      <span>Initiating Trade...</span>
                    </>
                  ) : (
                    <>
                      <span>{ad.type === 'buy' ? 'Sell' : 'Buy'} {ad.asset} Now</span>
                      <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8" />
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