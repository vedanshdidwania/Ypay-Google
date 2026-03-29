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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 sm:mb-10 md:mb-12">
          <div className="text-center md:text-left">
            <h1 className="text-4xl sm:text-4xl md:text-5xl font-display font-bold text-white tracking-tight">P2P Marketplace</h1>
            <p className="text-base sm:text-base md:text-lg text-gray-400 mt-3 sm:mt-3 flex items-center justify-center md:justify-start gap-2.5 sm:gap-2.5">
              <ShieldCheck className="w-6 h-6 sm:w-6 sm:h-6 text-brand" />
              Direct fiat-to-crypto settlements with verified merchants.
            </p>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-4">
            <button 
              onClick={() => navigate('/wallet')}
              className="flex-1 md:flex-none px-8 sm:px-8 py-4.5 sm:py-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-base sm:text-base font-bold text-white hover:bg-white/10 transition-all"
            >
              My Wallet
            </button>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 md:flex-none btn-primary px-8 sm:px-10 py-4.5 sm:py-4 text-base sm:text-base"
            >
              <Plus className="w-6 h-6 sm:w-6 sm:h-6" />
              Post Ad
            </button>
          </div>
        </div>

        {/* Asset Selector */}
        <div className="flex items-center gap-4 sm:gap-5 mb-10 sm:mb-10 overflow-x-auto pb-3 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {ASSETS.map((asset) => (
            <button
              key={asset.id}
              onClick={() => setSelectedAsset(asset.id)}
              className={cn(
                "flex items-center gap-3 sm:gap-4 px-6 sm:px-6 py-4 sm:py-4 rounded-xl sm:rounded-2xl border transition-all shrink-0",
                selectedAsset === asset.id 
                  ? "bg-brand/10 border-brand text-white shadow-lg shadow-brand/10" 
                  : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
              )}
            >
              <img src={asset.icon} alt={asset.name} className="w-7 h-7 sm:w-7 sm:h-7" referrerPolicy="no-referrer" />
              <span className="font-bold text-base sm:text-base">{asset.id}</span>
            </button>
          ))}
        </div>

        {/* Filters Bar */}
        <div className="card p-5 sm:p-5 mb-10 md:mb-10 flex flex-col lg:flex-row items-center justify-between gap-5 sm:gap-8">
          <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl w-full lg:w-auto">
            <button
              onClick={() => setFilterType('buy')}
              className={cn(
                "flex-1 lg:flex-none px-6 sm:px-12 py-4 sm:py-3 rounded-lg sm:rounded-xl text-base sm:text-base font-bold transition-all",
                filterType === 'buy' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-400 hover:text-white"
              )}
            >
              Buy
            </button>
            <button
              onClick={() => setFilterType('sell')}
              className={cn(
                "flex-1 lg:flex-none px-6 sm:px-12 py-4 sm:py-3 rounded-lg sm:rounded-xl text-base sm:text-base font-bold transition-all",
                filterType === 'sell' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-400 hover:text-white"
              )}
            >
              Sell
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 w-full lg:w-auto">
            <div className="relative w-full sm:flex-1 sm:min-w-[250px]">
              <Search className="absolute left-5 sm:left-5 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-5 sm:h-5 text-gray-500" />
              <input 
                type="number" 
                value={searchAmount}
                onChange={(e) => setSearchAmount(e.target.value)}
                placeholder="Enter amount (INR)..." 
                className="w-full bg-[#050505] border border-white/10 rounded-xl sm:rounded-2xl pl-14 sm:pl-12 pr-5 py-5 sm:py-4 text-base sm:text-base focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all text-white"
              />
            </div>
            
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <select 
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="flex-1 sm:flex-none bg-[#050505] border border-white/10 rounded-xl sm:rounded-2xl px-5 sm:px-5 py-5 sm:py-4 text-base sm:text-base text-white focus:outline-none focus:border-brand"
              >
                <option value="All">All Payments</option>
                {PAYMENT_METHODS.map(pm => (
                  <option key={pm} value={pm}>{pm}</option>
                ))}
              </select>

              <button className="p-5 sm:p-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-gray-400 hover:bg-white/10 transition-all">
                <Filter className="w-6 h-6 sm:w-6 sm:h-6" />
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
                className="card p-6 sm:p-8 hover:border-brand/30 transition-all group relative overflow-hidden"
              >
                {ad.user_profile?.has_verification_badge && (
                  <div className="absolute top-0 right-0 bg-brand/10 text-brand px-4 sm:px-6 py-1.5 rounded-bl-lg sm:rounded-bl-2xl text-[11px] sm:text-[12px] font-bold uppercase tracking-widest border-l border-b border-brand/20 flex items-center gap-1.5 sm:gap-2">
                    <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Top Merchant
                  </div>
                )}

                <div className="flex flex-col gap-6 sm:gap-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8">
                    {/* Merchant Info */}
                    <div className="flex items-center gap-4 sm:gap-5">
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white/5 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center text-brand border border-white/10 group-hover:border-brand/30 transition-all">
                          <User className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                        </div>
                        {ad.user_profile?.is_verified_merchant && (
                          <div className="absolute -bottom-1.5 -right-1.5 bg-[#050505] p-1 rounded-full">
                            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-brand" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="text-base sm:text-lg md:text-xl font-bold text-white tracking-tight truncate">
                            {ad.user_profile?.full_name || 'Anonymous'}
                          </span>
                          <button 
                            onClick={() => toggleFavorite(ad.user_id)}
                            className={cn(
                              "p-1.5 rounded-lg transition-all",
                              favorites.includes(ad.user_id) ? "text-red-500" : "text-gray-600 hover:text-red-500"
                            )}
                          >
                            <Heart className={cn("w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5", favorites.includes(ad.user_id) && "fill-current")} />
                          </button>
                        </div>
                        <div className="flex items-center gap-3 md:gap-4 mt-1 md:mt-1.5">
                          <span className="text-xs sm:text-[12px] md:text-[13px] font-bold text-gray-500 uppercase tracking-widest">
                            {ad.user_profile?.trades_completed || 0} Trades
                          </span>
                          <span className="w-1 h-1 bg-gray-700 rounded-full" />
                          <span className="text-xs sm:text-[12px] md:text-[13px] font-bold text-brand uppercase tracking-widest">
                            {ad.user_profile?.completion_rate || 0}% Success
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price Info */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start border-t md:border-none border-white/5 pt-4 md:pt-0">
                      <p className="text-xs sm:text-[12px] md:text-[13px] font-bold text-gray-500 uppercase tracking-widest mb-1 sm:mb-1.5">Price per {selectedAsset}</p>
                      <div className="flex flex-col items-end">
                        <p className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white leading-none">
                          ₹{ad.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                        {ad.pricing_type === 'dynamic' && (
                          <span className="text-[10px] sm:text-[11px] md:text-[13px] font-bold text-green-500 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                            <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            Market +{ad.margin}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-end border-t border-white/5 pt-6">
                    {/* Limits & Payment */}
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-5">
                      <div>
                        <p className="text-xs sm:text-[12px] md:text-[13px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Available</p>
                        <p className="text-sm sm:text-base md:text-lg font-bold text-brand">
                          {ad.total_amount?.toFixed(2) || '0.00'} {ad.asset}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-[12px] md:text-[13px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Limits</p>
                        <p className="text-sm sm:text-base md:text-lg font-bold text-white">
                          {formatCurrency(ad.min_limit)} - {formatCurrency(ad.max_limit)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs sm:text-[12px] md:text-[13px] font-bold text-gray-500 uppercase tracking-widest mb-2">Payment Methods</p>
                      <div className="flex flex-wrap gap-2">
                        {ad.payment_methods.map((pm, i) => (
                          <span key={i} className="px-3 py-1.5 bg-white/5 text-[11px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest rounded-lg sm:rounded-xl border border-white/10">
                            {pm}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Ratings */}
                    <div className="flex items-center gap-5 md:justify-center">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-brand" />
                        <span className="text-xs sm:text-[12px] font-bold text-gray-500 uppercase tracking-widest">
                          {ad.user_profile?.speed_rating || 5.0} Speed
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-brand" />
                        <span className="text-xs sm:text-[12px] font-bold text-gray-500 uppercase tracking-widest">
                          {ad.user_profile?.comm_rating || 5.0} Comm
                        </span>
                      </div>
                    </div>

                    {/* Action */}
                    <button 
                      onClick={() => navigate(`/p2p/create/${ad.id}`)}
                      className={cn(
                        "w-full py-4 sm:py-5 rounded-xl sm:rounded-[2rem] font-bold text-sm sm:text-base transition-all shadow-lg",
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
        <div className="mt-10 sm:mt-12 p-6 sm:p-8 bg-gradient-to-r from-brand/10 to-transparent border border-brand/20 rounded-2xl sm:rounded-3xl flex flex-col md:flex-row items-center gap-6 sm:gap-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-brand/20 rounded-xl sm:rounded-2xl flex items-center justify-center text-brand shadow-xl border border-brand/30 shrink-0">
            <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-base sm:text-lg font-bold text-white mb-1.5">Institutional-Grade Escrow Protection</h4>
            <p className="text-xs sm:text-xs md:text-sm text-gray-400">Our automated settlement protocol locks funds the moment a trade starts. Your crypto is released only when payment is confirmed by both parties.</p>
          </div>
          <button className="w-full md:w-auto px-8 py-4 sm:py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl sm:rounded-2xl text-sm sm:text-sm font-bold text-white transition-all">
            Learn More
          </button>
        </div>

        {/* Create Ad Modal */}
        <AnimatePresence>
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                className="relative w-full max-w-2xl bg-[#0a0a0a] rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10"
              >
                <div className="p-6 sm:p-8 md:p-10 max-h-[90vh] overflow-y-auto no-scrollbar">
                  <div className="flex items-center justify-between mb-6 sm:mb-8 md:mb-10">
                    <div>
                      <h3 className="text-2xl sm:text-2xl font-display font-bold text-white tracking-tight">Post Advertisement</h3>
                      <p className="text-[10px] sm:text-[10px] text-brand font-bold uppercase tracking-widest mt-1">Global Marketplace Listing</p>
                    </div>
                    <button 
                      onClick={() => setIsCreateModalOpen(false)}
                      className="p-3 sm:p-3 hover:bg-white/5 rounded-xl sm:rounded-2xl transition-colors border border-white/5"
                    >
                      <X className="w-5 h-5 sm:w-5 sm:h-5 text-gray-500" />
                    </button>
                  </div>

                  <form className="space-y-6 sm:space-y-8" onSubmit={handleCreateAd}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                      {/* Type & Asset */}
                      <div className="space-y-4 sm:space-y-6">
                        <div className="space-y-3">
                          <label className="text-xs sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Trade Type</label>
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 p-1 bg-white/5 rounded-xl sm:rounded-2xl border border-white/10">
                            <button
                              type="button"
                              onClick={() => setNewAd(prev => ({ ...prev, type: 'buy' }))}
                              className={cn(
                                "py-3 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-xs font-bold transition-all",
                                newAd.type === 'buy' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-500 hover:text-white"
                              )}
                            >
                              I want to Buy
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewAd(prev => ({ ...prev, type: 'sell' }))}
                              className={cn(
                                "py-3 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-xs font-bold transition-all",
                                newAd.type === 'sell' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-500 hover:text-white"
                              )}
                            >
                              I want to Sell
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-xs sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Asset to Trade</label>
                          <div className="grid grid-cols-2 gap-2">
                            {ASSETS.map(asset => (
                              <button
                                key={asset.id}
                                type="button"
                                onClick={() => setNewAd(prev => ({ ...prev, asset: asset.id }))}
                                className={cn(
                                  "flex items-center gap-3 px-4 sm:px-4 py-3 sm:py-3 rounded-xl sm:rounded-2xl border transition-all",
                                  newAd.asset === asset.id ? "bg-brand/10 border-brand text-white" : "bg-white/5 border-white/10 text-gray-500"
                                )}
                              >
                                <img src={asset.icon} className="w-5 h-5 sm:w-4 sm:h-4" referrerPolicy="no-referrer" />
                                <span className="text-xs sm:text-xs font-bold">{asset.id}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="space-y-4 sm:space-y-6">
                        <div className="space-y-3">
                          <label className="text-xs sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Pricing Type</label>
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 p-1 bg-white/5 rounded-xl sm:rounded-2xl border border-white/10">
                            <button
                              type="button"
                              onClick={() => setNewAd(prev => ({ ...prev, pricing_type: 'fixed' }))}
                              className={cn(
                                "py-3 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-xs font-bold transition-all",
                                newAd.pricing_type === 'fixed' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-500 hover:text-white"
                              )}
                            >
                              Fixed
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewAd(prev => ({ ...prev, pricing_type: 'dynamic' }))}
                              className={cn(
                                "py-3 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-xs font-bold transition-all",
                                newAd.pricing_type === 'dynamic' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-500 hover:text-white"
                              )}
                            >
                              Dynamic
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-xs sm:text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Ad Limit By</label>
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 p-1 bg-white/5 rounded-xl sm:rounded-2xl border border-white/10">
                            <button
                              type="button"
                              onClick={() => setAdLimitType('quantity')}
                              className={cn(
                                "py-3 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-xs font-bold transition-all",
                                adLimitType === 'quantity' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-500 hover:text-white"
                              )}
                            >
                              Quantity
                            </button>
                            <button
                              type="button"
                              onClick={() => setAdLimitType('amount')}
                              className={cn(
                                "py-3 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-xs font-bold transition-all",
                                adLimitType === 'amount' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-500 hover:text-white"
                              )}
                            >
                              Amount
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                      <div className="space-y-4 sm:space-y-6">
                        {adLimitType === 'quantity' ? (
                          <div className="space-y-3">
                            <label className="text-xs sm:text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Total Quantity ({newAd.asset})</label>
                            <input 
                              type="number" 
                              step="0.01"
                              value={newAd.total_amount}
                              onChange={(e) => setNewAd(prev => ({ ...prev, total_amount: parseFloat(e.target.value) }))}
                              className="input-field py-4 sm:py-4 text-sm sm:text-sm" 
                              placeholder="Total amount available"
                            />
                            <p className="text-xs sm:text-xs text-gray-500 mt-1">
                              Total Value: ₹{(newAd.total_amount * (newAd.pricing_type === 'dynamic' ? (marketPrices[newAd.asset.toLowerCase()]?.inr || newAd.price) * (1 + newAd.margin / 100) : newAd.price)).toLocaleString('en-IN')}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <label className="text-xs sm:text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Total Amount (INR)</label>
                            <input 
                              type="number" 
                              step="1"
                              value={totalINR}
                              onChange={(e) => setTotalINR(parseFloat(e.target.value))}
                              className="input-field py-4 sm:py-4 text-sm sm:text-sm" 
                              placeholder="Total INR amount"
                            />
                            <p className="text-xs sm:text-xs text-gray-500 mt-1">
                              Equivalent: {(totalINR / (newAd.pricing_type === 'dynamic' ? (marketPrices[newAd.asset.toLowerCase()]?.inr || newAd.price) * (1 + newAd.margin / 100) : newAd.price)).toFixed(2)} {newAd.asset}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4 sm:space-y-6">
                        {newAd.pricing_type === 'fixed' ? (
                          <div className="space-y-3">
                            <label className="text-xs sm:text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Fixed Price (INR)</label>
                            <input 
                              type="number" 
                              step="0.01"
                              value={newAd.price}
                              onChange={(e) => setNewAd(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                              className="input-field py-4 sm:py-4 text-sm sm:text-sm" 
                            />
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <label className="text-xs sm:text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Margin (%)</label>
                            <div className="relative">
                              <input 
                                type="number" 
                                step="0.1"
                                value={newAd.margin}
                                onChange={(e) => setNewAd(prev => ({ ...prev, margin: parseFloat(e.target.value) }))}
                                className="input-field py-4 sm:py-4 pr-12 text-sm sm:text-sm" 
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs sm:text-xs text-gray-500 font-bold">%</span>
                            </div>
                            <p className="text-xs sm:text-xs text-gray-500 mt-1">
                              Estimated Price: ₹{(marketPrices[newAd.asset.toLowerCase()]?.inr * (1 + newAd.margin / 100)).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                      <div className="space-y-3">
                        <label className="text-xs sm:text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Min Limit (INR)</label>
                        <input 
                          type="number" 
                          value={newAd.min_limit}
                          onChange={(e) => setNewAd(prev => ({ ...prev, min_limit: parseFloat(e.target.value) }))}
                          className="input-field py-4 sm:py-4 text-sm sm:text-sm" 
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs sm:text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Max Limit (INR)</label>
                        <input 
                          type="number" 
                          value={newAd.max_limit}
                          onChange={(e) => setNewAd(prev => ({ ...prev, max_limit: parseFloat(e.target.value) }))}
                          className="input-field py-4 sm:py-4 text-sm sm:text-sm" 
                        />
                      </div>
                    </div>

                    <div className="space-y-4 sm:space-y-4">
                      <label className="text-xs sm:text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Payment Window (Minutes)</label>
                      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                        {[15, 30, 45, 60].map((min) => (
                          <button
                            key={min}
                            type="button"
                            onClick={() => setNewAd(prev => ({ ...prev, payment_window: min }))}
                            className={cn(
                              "py-3 sm:py-3 rounded-lg sm:rounded-xl border text-xs sm:text-[10px] font-bold transition-all",
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

                    <div className="space-y-4">
                      <label className="text-xs sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Payment Methods</label>
                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        {PAYMENT_METHODS.map((pm) => (
                          <label key={pm} className={cn(
                            "flex items-center gap-3 sm:gap-3 px-5 sm:px-5 py-3 sm:py-3 rounded-xl sm:rounded-2xl border transition-all cursor-pointer",
                            newAd.payment_methods.includes(pm) ? "bg-brand/10 border-brand text-white" : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20"
                          )}>
                            <input 
                              type="checkbox" 
                              className="hidden"
                              checked={newAd.payment_methods.includes(pm)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewAd(prev => ({ ...prev, payment_methods: [...prev.payment_methods, pm] }));
                                } else {
                                  setNewAd(prev => ({ ...prev, payment_methods: prev.payment_methods.filter(p => p !== pm) }));
                                }
                              }}
                            />
                            <span className="text-xs sm:text-xs font-bold">{pm}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmitting || newAd.payment_methods.length === 0}
                      className="btn-primary w-full py-4 sm:py-5 text-sm sm:text-base shadow-2xl shadow-brand/20 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                          Publishing...
                        </div>
                      ) : 'Publish Advertisement'}
                    </button>
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
        <div className="fixed bottom-6 right-6 z-40 md:hidden">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-14 h-14 bg-brand text-[#050505] rounded-full shadow-2xl shadow-brand/40 flex items-center justify-center active:scale-95 transition-all"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
}
