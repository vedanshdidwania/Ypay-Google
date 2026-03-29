import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  User, 
  CheckCircle2, 
  Clock,
  ArrowLeftRight,
  Plus,
  X,
  MessageSquare,
  Send,
  ChevronRight,
  AlertCircle,
  Heart,
  TrendingUp,
  Trash2,
  Loader2,
  ChevronDown,
  Star,
  Activity,
  Award
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { cn, formatCurrency, formatUSDT } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import ConfirmationModal from '../components/ConfirmationModal';

interface Ad {
  id: string;
  user_id: string;
  type: 'buy' | 'sell';
  asset: string;
  pricing_type: 'fixed' | 'dynamic';
  margin: number;
  price: number;
  min_limit: number;
  max_limit: number;
  total_amount: number;
  payment_methods: string[];
  terms: string;
  created_at: string;
  user_profile?: {
    full_name: string;
    trades_completed: number;
    completion_rate: number;
    is_verified_merchant: boolean;
    has_verification_badge: boolean;
    rating_sum: number;
    rating_count: number;
    speed_rating: number;
    comm_rating: number;
  };
}

const ASSETS = [
  { id: 'USDT', name: 'Tether', icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  { id: 'BTC', name: 'Bitcoin', icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png' },
  { id: 'ETH', name: 'Ethereum', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { id: 'USDC', name: 'USD Coin', icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png' }
];

const PAYMENT_METHODS = ['UPI', 'Bank Transfer', 'Paytm', 'PhonePe', 'GPay', 'IMPS'];

export default function P2P() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'buy' | 'sell'>('buy');
  const [selectedAsset, setSelectedAsset] = useState('USDT');
  const [searchAmount, setSearchAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [marketPrices, setMarketPrices] = useState<any>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [adToDelete, setAdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adLimitType, setAdLimitType] = useState<'quantity' | 'amount'>('quantity');
  const [totalINR, setTotalINR] = useState(9000);
  const [newAd, setNewAd] = useState({
    type: 'buy' as 'buy' | 'sell',
    asset: 'USDT',
    pricing_type: 'fixed' as 'fixed' | 'dynamic',
    margin: 0,
    price: 90,
    total_amount: 100,
    min_limit: 1000,
    max_limit: 50000,
    payment_methods: [] as string[],
    payment_window: 15
  });

  useEffect(() => {
    const currentPrice = newAd.pricing_type === 'dynamic' 
      ? (marketPrices[newAd.asset.toLowerCase()]?.inr || newAd.price) * (1 + newAd.margin / 100)
      : newAd.price;

    if (adLimitType === 'amount') {
      const qty = totalINR / (currentPrice || 1);
      if (Math.abs(newAd.total_amount - qty) > 0.01) {
        setNewAd(prev => ({ ...prev, total_amount: parseFloat(qty.toFixed(2)) }));
      }
    } else {
      const amount = newAd.total_amount * currentPrice;
      if (Math.abs(totalINR - amount) > 1) {
        setTotalINR(parseFloat(amount.toFixed(2)));
      }
    }
  }, [adLimitType, totalINR, newAd.price, newAd.total_amount, newAd.margin, newAd.pricing_type, marketPrices]);

  useEffect(() => {
    fetchAds();
    fetchMarketPrices();
    if (user) {
      fetchFavorites();
    }

    // Check for create query param
    const params = new URLSearchParams(location.search);
    if (params.get('create') === 'true') {
      setIsCreateModalOpen(true);
      // Remove the param from URL without refreshing
      window.history.replaceState({}, '', '/p2p');
    }
  }, [filterType, selectedAsset, selectedPaymentMethod, user, location.search]);

  const fetchMarketPrices = async () => {
    try {
      const response = await axios.get('/api/prices');
      setMarketPrices(response.data);
      // Update newAd price if it's 0
      if (newAd.price === 0) {
        const basePrice = response.data.tether?.inr || 90;
        setNewAd(prev => ({ ...prev, price: basePrice }));
      }
    } catch (error) {
      console.error('Error fetching market prices:', error);
    }
  };

  const fetchFavorites = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('merchant_favorites')
        .select('merchant_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      setFavorites(data.map(f => f.merchant_id));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const toggleFavorite = async (merchantId: string) => {
    if (!user) return;
    const isFavorite = favorites.includes(merchantId);
    try {
      if (isFavorite) {
        await supabase.from('merchant_favorites').delete().eq('user_id', user.id).eq('merchant_id', merchantId);
        setFavorites(prev => prev.filter(id => id !== merchantId));
      } else {
        await supabase.from('merchant_favorites').insert({ user_id: user.id, merchant_id: merchantId });
        setFavorites(prev => [...prev, merchantId]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const fetchAds = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('ads')
        .select(`
          *,
          user_profile:profiles(full_name, trades_completed, completion_rate, is_verified_merchant, has_verification_badge, rating_sum, rating_count, speed_rating, comm_rating)
        `)
        .eq('status', 'active')
        .eq('type', filterType === 'buy' ? 'sell' : 'buy')
        .eq('asset', selectedAsset)
        .neq('user_id', user?.id);

      if (selectedPaymentMethod !== 'All') {
        query = query.contains('payment_methods', [selectedPaymentMethod]);
      }

      const { data, error } = await query.order('price', { ascending: filterType === 'buy' });

      if (error) throw error;
      
      // Filter by amount locally if searchAmount is set
      let filteredAds = data || [];
      if (searchAmount) {
        const amount = parseFloat(searchAmount);
        if (!isNaN(amount)) {
          filteredAds = filteredAds.filter(ad => amount >= ad.min_limit && amount <= ad.max_limit);
        }
      }

      setAds(filteredAds);
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error('Supabase is not configured. Please check your environment variables.');
      return;
    }
    if (!user) {
      toast.error('Please login to post an advertisement');
      navigate('/auth');
      return;
    }

    if (newAd.payment_methods.length === 0) {
      toast.error('Please select at least one payment method');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Calculate final price if dynamic
      let finalPrice = newAd.price;
      if (newAd.pricing_type === 'dynamic') {
        const marketPrice = marketPrices[selectedAsset.toLowerCase()]?.inr || newAd.price;
        finalPrice = marketPrice * (1 + newAd.margin / 100);
      }

      const { error } = await supabase.from('ads').insert({
        user_id: user.id,
        type: newAd.type,
        asset: newAd.asset,
        pricing_type: newAd.pricing_type,
        margin: newAd.margin,
        price: finalPrice,
        total_amount: newAd.total_amount,
        min_limit: newAd.min_limit,
        max_limit: newAd.max_limit,
        payment_methods: newAd.payment_methods,
        payment_window: newAd.payment_window,
        status: 'active'
      });

      if (error) {
        console.error('Supabase error creating ad:', error);
        throw error;
      }
      
      setIsCreateModalOpen(false);
      fetchAds();
      toast.success('Advertisement posted successfully!');
    } catch (error: any) {
      console.error('Error creating ad:', error);
      toast.error(error.message || 'Failed to post advertisement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAd = async () => {
    if (!adToDelete || !user) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('ads')
        .update({ status: 'inactive' })
        .eq('id', adToDelete)
        .eq('user_id', user?.id);
      
      if (error) throw error;
      fetchAds();
      setShowDeleteConfirm(false);
      toast.success('Advertisement removed successfully');
    } catch (error) {
      console.error('Error deleting ad:', error);
      toast.error('Failed to remove advertisement');
    } finally {
      setIsDeleting(false);
      setAdToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] pt-20 sm:pt-24 pb-8 sm:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 sm:mb-12 md:mb-14">
          <div className="text-center md:text-left">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-white tracking-tight">P2P Marketplace</h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-400 mt-4 sm:mt-5 flex items-center justify-center md:justify-start gap-3 sm:gap-4">
              <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-brand" />
              Direct fiat-to-crypto settlements with verified merchants.
            </p>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-5">
            <button 
              onClick={() => navigate('/wallet')}
              className="flex-1 md:flex-none px-8 sm:px-10 py-5 sm:py-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-base sm:text-lg font-bold text-white hover:bg-white/10 transition-all"
            >
              My Wallet
            </button>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 md:flex-none btn-primary px-8 sm:px-12 py-5 sm:py-4 text-base sm:text-lg"
            >
              <Plus className="w-6 h-6 sm:w-7 sm:h-7" />
              Post Ad
            </button>
          </div>
        </div>

        {/* Asset Selector */}
        <div className="flex items-center gap-4 sm:gap-6 mb-10 sm:mb-12 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {ASSETS.map((asset) => (
            <button
              key={asset.id}
              onClick={() => setSelectedAsset(asset.id)}
              className={cn(
                "flex items-center gap-4 sm:gap-5 px-8 sm:px-10 py-5 sm:py-5 rounded-2xl sm:rounded-3xl border transition-all shrink-0",
                selectedAsset === asset.id 
                  ? "bg-brand/10 border-brand text-white shadow-lg shadow-brand/10" 
                  : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
              )}
            >
              <img src={asset.icon} alt={asset.name} className="w-8 h-8 sm:w-9 sm:h-9" referrerPolicy="no-referrer" />
              <span className="font-bold text-lg sm:text-xl">{asset.id}</span>
            </button>
          ))}
        </div>

        {/* Filters Bar */}
        <div className="card p-6 sm:p-8 mb-10 md:mb-12 flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-10">
          <div className="flex items-center gap-2.5 p-2.5 bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl w-full lg:w-auto">
            <button
              onClick={() => setFilterType('buy')}
              className={cn(
                "flex-1 lg:flex-none px-8 sm:px-16 py-4.5 sm:py-4 rounded-xl sm:rounded-2xl text-base sm:text-lg font-bold transition-all",
                filterType === 'buy' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-400 hover:text-white"
              )}
            >
              Buy
            </button>
            <button
              onClick={() => setFilterType('sell')}
              className={cn(
                "flex-1 lg:flex-none px-8 sm:px-16 py-4.5 sm:py-4 rounded-xl sm:rounded-2xl text-base sm:text-lg font-bold transition-all",
                filterType === 'sell' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-400 hover:text-white"
              )}
            >
              Sell
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 w-full lg:w-auto">
            <div className="relative w-full sm:flex-1 sm:min-w-[300px]">
              <Search className="absolute left-6 sm:left-6 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-6 sm:h-6 text-gray-500" />
              <input 
                type="number" 
                value={searchAmount}
                onChange={(e) => setSearchAmount(e.target.value)}
                placeholder="Enter amount (INR)..." 
                className="w-full bg-[#050505] border border-white/10 rounded-2xl sm:rounded-3xl pl-16 sm:pl-16 pr-6 py-5 sm:py-5 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all text-white"
              />
            </div>
            
            <div className="flex items-center gap-5 w-full sm:w-auto">
              <select 
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="flex-1 sm:flex-none bg-[#050505] border border-white/10 rounded-2xl sm:rounded-3xl px-6 sm:px-8 py-5 sm:py-5 text-base sm:text-lg text-white focus:outline-none focus:border-brand appearance-none"
              >
                <option value="All">All Payments</option>
                {PAYMENT_METHODS.map(pm => (
                  <option key={pm} value={pm}>{pm}</option>
                ))}
              </select>

              <button className="p-5 sm:p-5 bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl text-gray-400 hover:bg-white/10 transition-all">
                <Filter className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>
            </div>
          </div>
        </div>

        {/* Ads List */}
        <div className="space-y-4">
          {loading ? (
            <div className="card p-12 sm:p-20 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-brand animate-spin mb-3 sm:mb-4" />
              <p className="text-xs sm:text-sm text-gray-500 font-bold uppercase tracking-widest">Scanning Marketplace...</p>
            </div>
          ) : ads.length === 0 ? (
            <div className="card p-12 sm:p-20 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-white/10">
                <ArrowLeftRight className="w-8 h-8 sm:w-10 sm:h-10 text-gray-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5 sm:mb-2">No Ads Found</h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-xs mx-auto">Try adjusting your filters or search amount to find available trades.</p>
            </div>
          ) : (
            ads.map((ad) => (
              <motion.div
                key={ad.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6 sm:p-10 hover:border-brand/30 transition-all group relative overflow-hidden"
              >
                {ad.user_profile?.has_verification_badge && (
                  <div className="absolute top-0 right-0 bg-brand/10 text-brand px-5 sm:px-8 py-2 rounded-bl-xl sm:rounded-bl-[2rem] text-[11px] sm:text-[13px] font-bold uppercase tracking-widest border-l border-b border-brand/20 flex items-center gap-2 sm:gap-2.5">
                    <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                    Top Merchant
                  </div>
                )}

                <div className="flex flex-col gap-8 sm:gap-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 sm:gap-12">
                    {/* Merchant Info */}
                    <div className="flex items-center gap-5 sm:gap-6">
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-white/5 rounded-xl sm:rounded-2xl md:rounded-3xl flex items-center justify-center text-brand border border-white/10 group-hover:border-brand/30 transition-all">
                          <User className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10" />
                        </div>
                        {ad.user_profile?.is_verified_merchant && (
                          <div className="absolute -bottom-2 -right-2 bg-[#050505] p-1.5 rounded-full">
                            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-brand" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4">
                          <span className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight truncate">
                            {ad.user_profile?.full_name || 'Anonymous'}
                          </span>
                          <button 
                            onClick={() => toggleFavorite(ad.user_id)}
                            className={cn(
                              "p-2 rounded-xl transition-all",
                              favorites.includes(ad.user_id) ? "text-red-500" : "text-gray-600 hover:text-red-500"
                            )}
                          >
                            <Heart className={cn("w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6", favorites.includes(ad.user_id) && "fill-current")} />
                          </button>
                        </div>
                        <div className="flex items-center gap-4 md:gap-5 mt-2 md:mt-2.5">
                          <span className="text-xs sm:text-sm md:text-base font-bold text-gray-500 uppercase tracking-widest">
                            {ad.user_profile?.trades_completed || 0} Trades
                          </span>
                          <span className="w-1.5 h-1.5 bg-gray-700 rounded-full" />
                          <span className="text-xs sm:text-sm md:text-base font-bold text-brand uppercase tracking-widest">
                            {ad.user_profile?.completion_rate || 0}% Success
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price Info */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start border-t md:border-none border-white/5 pt-6 md:pt-0">
                      <p className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest mb-1.5 sm:mb-2">Price per {selectedAsset}</p>
                      <div className="flex flex-col items-end">
                        <p className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white leading-none">
                          ₹{ad.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                        {ad.pricing_type === 'dynamic' && (
                          <span className="text-[11px] sm:text-[12px] md:text-[14px] font-bold text-green-500 uppercase tracking-widest mt-2 sm:mt-2.5 flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Market +{ad.margin}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 items-end border-t border-white/5 pt-8">
                    {/* Limits & Payment */}
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-6">
                      <div>
                        <p className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Available</p>
                        <p className="text-base sm:text-lg md:text-xl font-bold text-brand">
                          {ad.total_amount?.toFixed(2) || '0.00'} {ad.asset}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Limits</p>
                        <p className="text-base sm:text-lg md:text-xl font-bold text-white">
                          {formatCurrency(ad.min_limit)} - {formatCurrency(ad.max_limit)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Payment Methods</p>
                      <div className="flex flex-wrap gap-2.5">
                        {ad.payment_methods.map((pm, i) => (
                          <span key={i} className="px-4 py-2 bg-white/5 text-[11px] sm:text-[12px] font-bold text-gray-400 uppercase tracking-widest rounded-xl sm:rounded-2xl border border-white/10">
                            {pm}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Ratings */}
                    <div className="flex items-center gap-6 md:justify-center">
                      <div className="flex items-center gap-2.5">
                        <Zap className="w-5 h-5 text-brand" />
                        <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">
                          {ad.user_profile?.speed_rating || 5.0} Speed
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <MessageSquare className="w-5 h-5 text-brand" />
                        <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">
                          {ad.user_profile?.comm_rating || 5.0} Comm
                        </span>
                      </div>
                    </div>

                    {/* Action */}
                    <button 
                      onClick={() => navigate(`/p2p/create/${ad.id}`)}
                      className={cn(
                        "w-full py-5 sm:py-6 rounded-2xl sm:rounded-[2.5rem] font-bold text-base sm:text-lg transition-all shadow-lg",
                        filterType === 'buy' 
                          ? "bg-green-600 hover:bg-green-700 text-white shadow-green-900/20" 
                          : "bg-red-600 hover:bg-red-700 text-white shadow-red-900/20"
                      )}
                    >
                      {filterType === 'buy' ? 'Buy ' : 'Sell '}{selectedAsset}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Trust Banner */}
        <div className="mt-12 sm:mt-16 p-8 sm:p-10 bg-gradient-to-r from-brand/10 to-transparent border border-brand/20 rounded-3xl sm:rounded-[2.5rem] flex flex-col md:flex-row items-center gap-8 sm:gap-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand/20 rounded-2xl sm:rounded-3xl flex items-center justify-center text-brand shadow-xl border border-brand/30 shrink-0">
            <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Institutional-Grade Escrow Protection</h4>
            <p className="text-sm sm:text-base text-gray-400 leading-relaxed">Our automated settlement protocol locks funds the moment a trade starts. Your crypto is released only when payment is confirmed by both parties.</p>
          </div>
          <button className="w-full md:w-auto px-10 py-5 sm:py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl sm:rounded-3xl text-base sm:text-lg font-bold text-white transition-all">
            Learn More
          </button>
        </div>

        {/* Create Ad Modal */}
        <AnimatePresence>
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCreateModalOpen(false)}
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-4xl bg-[#0a0a0a] rounded-[3rem] md:rounded-[4rem] shadow-2xl overflow-hidden border border-white/10"
              >
                <div className="p-8 sm:p-12 md:p-16 max-h-[95vh] overflow-y-auto no-scrollbar">
                  <div className="flex items-center justify-between mb-10 sm:mb-14 md:mb-16">
                    <div>
                      <h3 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white tracking-tighter">Post Advertisement</h3>
                      <p className="text-xs sm:text-sm text-brand font-bold uppercase tracking-[0.3em] mt-2">Global Marketplace Listing</p>
                    </div>
                    <button 
                      onClick={() => setIsCreateModalOpen(false)}
                      className="p-4 sm:p-5 hover:bg-white/5 rounded-2xl sm:rounded-[2rem] transition-colors border border-white/5"
                    >
                      <X className="w-6 h-6 sm:w-7 sm:h-7 text-gray-500" />
                    </button>
                  </div>

                  <form className="space-y-10 sm:space-y-14" onSubmit={handleCreateAd}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 sm:gap-14">
                      {/* Type & Asset */}
                      <div className="space-y-6 sm:space-y-8">
                        <div className="space-y-4">
                          <label className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Trade Type</label>
                          <div className="grid grid-cols-2 gap-3 sm:gap-4 p-2 bg-white/5 rounded-[2rem] border border-white/10">
                            <button
                              type="button"
                              onClick={() => setNewAd(prev => ({ ...prev, type: 'buy' }))}
                              className={cn(
                                "py-4 sm:py-5 rounded-[1.5rem] text-sm sm:text-base font-bold transition-all",
                                newAd.type === 'buy' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-500 hover:text-white"
                              )}
                            >
                              I want to Buy
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewAd(prev => ({ ...prev, type: 'sell' }))}
                              className={cn(
                                "py-4 sm:py-5 rounded-[1.5rem] text-sm sm:text-base font-bold transition-all",
                                newAd.type === 'sell' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-500 hover:text-white"
                              )}
                            >
                              I want to Sell
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Asset to Trade</label>
                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            {ASSETS.map(asset => (
                              <button
                                key={asset.id}
                                type="button"
                                onClick={() => setNewAd(prev => ({ ...prev, asset: asset.id }))}
                                className={cn(
                                  "flex items-center gap-4 px-6 sm:px-8 py-4 sm:py-5 rounded-[2rem] border transition-all",
                                  newAd.asset === asset.id ? "bg-brand/10 border-brand text-white" : "bg-white/5 border-white/10 text-gray-500"
                                )}
                              >
                                <img src={asset.icon} className="w-6 h-6 sm:w-7 sm:h-7" referrerPolicy="no-referrer" />
                                <span className="text-sm sm:text-base font-bold">{asset.id}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                  {/* Pricing & Ad Limit Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 sm:gap-14">
                    <div className="space-y-4">
                      <label className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Pricing Type</label>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 p-2 bg-white/5 rounded-[2rem] border border-white/10">
                        <button
                          type="button"
                          onClick={() => setNewAd(prev => ({ ...prev, pricing_type: 'fixed' }))}
                          className={cn(
                            "py-4 sm:py-5 rounded-[1.5rem] text-sm sm:text-base font-bold transition-all",
                            newAd.pricing_type === 'fixed' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-500 hover:text-white"
                          )}
                        >
                          Fixed
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewAd(prev => ({ ...prev, pricing_type: 'dynamic' }))}
                          className={cn(
                            "py-4 sm:py-5 rounded-[1.5rem] text-sm sm:text-base font-bold transition-all",
                            newAd.pricing_type === 'dynamic' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-500 hover:text-white"
                          )}
                        >
                          Dynamic
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Place Ad By</label>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 p-2 bg-white/5 rounded-[2rem] border border-white/10">
                        <button
                          type="button"
                          onClick={() => setAdLimitType('quantity')}
                          className={cn(
                            "py-4 sm:py-5 rounded-[1.5rem] text-sm sm:text-base font-bold transition-all",
                            adLimitType === 'quantity' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-500 hover:text-white"
                          )}
                        >
                          Quantity
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdLimitType('amount')}
                          className={cn(
                            "py-4 sm:py-5 rounded-[1.5rem] text-sm sm:text-base font-bold transition-all",
                            adLimitType === 'amount' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-500 hover:text-white"
                          )}
                        >
                          Amount (INR)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quantity / Amount Input */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 sm:gap-14">
                    <div className="space-y-4">
                      {adLimitType === 'quantity' ? (
                        <div className="space-y-4">
                          <label className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Total Quantity ({newAd.asset})</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              step="0.01"
                              value={newAd.total_amount}
                              onChange={(e) => setNewAd(prev => ({ ...prev, total_amount: parseFloat(e.target.value) }))}
                              className="input-field py-5 sm:py-6 px-6 text-lg sm:text-xl rounded-[2rem] font-bold" 
                              placeholder="0.00"
                            />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-base sm:text-lg">{newAd.asset}</span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-400 mt-2 font-medium flex items-center gap-2">
                            <TrendingUp className="w-3.5 h-3.5 text-brand" />
                            Total Value: <span className="text-white font-bold">₹{(newAd.total_amount * (newAd.pricing_type === 'dynamic' ? (marketPrices[newAd.asset.toLowerCase()]?.inr || newAd.price) * (1 + newAd.margin / 100) : newAd.price)).toLocaleString('en-IN')}</span>
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <label className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Total Amount (INR)</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              step="1"
                              value={totalINR}
                              onChange={(e) => setTotalINR(parseFloat(e.target.value))}
                              className="input-field py-5 sm:py-6 px-6 text-lg sm:text-xl rounded-[2rem] font-bold" 
                              placeholder="0"
                            />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-base sm:text-lg">INR</span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-400 mt-2 font-medium flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-brand" />
                            Equivalent: <span className="text-white font-bold">{(totalINR / (newAd.pricing_type === 'dynamic' ? (marketPrices[newAd.asset.toLowerCase()]?.inr || newAd.price) * (1 + newAd.margin / 100) : newAd.price)).toFixed(2)} {newAd.asset}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {newAd.pricing_type === 'fixed' ? (
                        <div className="space-y-4">
                          <label className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Fixed Price (INR)</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              step="0.01"
                              value={newAd.price}
                              onChange={(e) => setNewAd(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                              className="input-field py-5 sm:py-6 px-6 text-lg sm:text-xl rounded-[2rem] font-bold" 
                              placeholder="0.00"
                            />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-base sm:text-lg">₹</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <label className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Margin (%)</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              step="0.1"
                              value={newAd.margin}
                              onChange={(e) => setNewAd(prev => ({ ...prev, margin: parseFloat(e.target.value) }))}
                              className="input-field py-5 sm:py-6 px-6 text-lg sm:text-xl rounded-[2rem] font-bold" 
                              placeholder="0.00"
                            />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-base sm:text-lg">%</span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-400 mt-2 font-medium">
                            Effective Price: <span className="text-white font-bold">₹{((marketPrices[newAd.asset.toLowerCase()]?.inr || 90) * (1 + newAd.margin / 100)).toFixed(2)}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Limits & Payment */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 sm:gap-14">
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <label className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Order Limits (INR)</label>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-2">
                            <p className="text-[10px] sm:text-xs font-bold text-gray-600 uppercase tracking-widest ml-1">Min</p>
                            <input 
                              type="number" 
                              value={newAd.min_limit}
                              onChange={(e) => setNewAd(prev => ({ ...prev, min_limit: parseFloat(e.target.value) }))}
                              className="input-field py-4 sm:py-5 px-5 text-sm sm:text-base rounded-2xl font-bold" 
                              placeholder="Min"
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] sm:text-xs font-bold text-gray-600 uppercase tracking-widest ml-1">Max</p>
                            <input 
                              type="number" 
                              value={newAd.max_limit}
                              onChange={(e) => setNewAd(prev => ({ ...prev, max_limit: parseFloat(e.target.value) }))}
                              className="input-field py-4 sm:py-5 px-5 text-sm sm:text-base rounded-2xl font-bold" 
                              placeholder="Max"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Payment Window</label>
                        <div className="grid grid-cols-4 gap-2 sm:gap-3">
                          {[15, 30, 45, 60].map((min) => (
                            <button
                              key={min}
                              type="button"
                              onClick={() => setNewAd(prev => ({ ...prev, payment_window: min }))}
                              className={cn(
                                "py-3 sm:py-4 rounded-xl border text-[10px] sm:text-xs font-bold transition-all",
                                newAd.payment_window === min 
                                  ? "bg-brand/10 border-brand text-brand" 
                                  : "bg-white/5 border-white/10 text-gray-500 hover:bg-white/10"
                              )}
                            >
                              {min}m
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Payment Methods</label>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {PAYMENT_METHODS.map((pm) => (
                          <button
                            key={pm}
                            type="button"
                            onClick={() => {
                              const methods = newAd.payment_methods.includes(pm)
                                ? newAd.payment_methods.filter(m => m !== pm)
                                : [...newAd.payment_methods, pm];
                              setNewAd(prev => ({ ...prev, payment_methods: methods }));
                            }}
                            className={cn(
                              "py-3 sm:py-4 px-3 rounded-xl text-[10px] sm:text-xs font-bold transition-all border",
                              newAd.payment_methods.includes(pm)
                                ? "bg-brand/10 border-brand text-brand shadow-lg shadow-brand/5"
                                : "bg-white/5 border-white/5 text-gray-500 hover:text-white hover:border-white/10"
                            )}
                          >
                            {pm}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                  <div className="pt-6 sm:pt-10">
                    <button 
                      type="submit"
                      disabled={isSubmitting || newAd.payment_methods.length === 0}
                      className="w-full btn-primary py-5 sm:py-6 text-base sm:text-xl rounded-[2rem] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-4"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                          <span>Publishing...</span>
                        </>
                      ) : (
                        <>
                          Publish Advertisement
                          <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-2 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>

        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setAdToDelete(null);
          }}
          onConfirm={handleDeleteAd}
          loading={isDeleting}
          title="Remove Advertisement"
          message="Are you sure you want to remove this advertisement from the marketplace? You can always post a new one later."
          confirmText="Remove Ad"
          variant="danger"
        />

        {/* Floating Action Button for Mobile */}
        <div className="fixed bottom-10 right-10 z-40 md:hidden">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-20 h-20 bg-brand text-[#050505] rounded-full shadow-2xl shadow-brand/40 flex items-center justify-center active:scale-95 transition-all"
          >
            <Plus className="w-10 h-10" />
          </button>
        </div>
      </div>
    </div>
  );
}
