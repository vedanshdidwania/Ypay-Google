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
import { supabase } from '../lib/supabase';
import { cn, formatCurrency, formatUSDT } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';

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
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'buy' | 'sell'>('buy');
  const [selectedAsset, setSelectedAsset] = useState('USDT');
  const [searchAmount, setSearchAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [marketPrices, setMarketPrices] = useState<any>({});
  const [favorites, setFavorites] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAd, setNewAd] = useState({
    type: 'buy' as 'buy' | 'sell',
    asset: 'USDT',
    pricing_type: 'fixed' as 'fixed' | 'dynamic',
    margin: 0,
    price: 0,
    min_limit: 1000,
    max_limit: 50000,
    payment_methods: [] as string[]
  });

  useEffect(() => {
    fetchAds();
    fetchMarketPrices();
    if (user) {
      fetchFavorites();
    }
  }, [filterType, selectedAsset, selectedPaymentMethod, user]);

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
    if (!user) return;

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
        min_limit: newAd.min_limit,
        max_limit: newAd.max_limit,
        payment_methods: newAd.payment_methods,
        status: 'active'
      });

      if (error) throw error;
      
      setIsCreateModalOpen(false);
      fetchAds();
      toast.success('Advertisement posted successfully!');
    } catch (error: any) {
      console.error('Error creating ad:', error);
      toast.error(error.message || 'Failed to post advertisement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Are you sure you want to delete this advertisement?')) return;
    try {
      const { error } = await supabase.from('ads').update({ status: 'inactive' }).eq('id', adId).eq('user_id', user?.id);
      if (error) throw error;
      fetchAds();
    } catch (error) {
      console.error('Error deleting ad:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold text-white tracking-tight">P2P Marketplace</h1>
            <p className="text-gray-400 mt-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand" />
              Direct fiat-to-crypto settlements with verified merchants.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/wallet')}
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white hover:bg-white/10 transition-all"
            >
              My Wallet
            </button>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary px-8 py-3"
            >
              <Plus className="w-5 h-5" />
              Post Ad
            </button>
          </div>
        </div>

        {/* Asset Selector */}
        <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {ASSETS.map((asset) => (
            <button
              key={asset.id}
              onClick={() => setSelectedAsset(asset.id)}
              className={cn(
                "flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all shrink-0",
                selectedAsset === asset.id 
                  ? "bg-brand/10 border-brand text-white shadow-lg shadow-brand/10" 
                  : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
              )}
            >
              <img src={asset.icon} alt={asset.name} className="w-6 h-6" referrerPolicy="no-referrer" />
              <span className="font-bold text-sm">{asset.id}</span>
            </button>
          ))}
        </div>

        {/* Filters Bar */}
        <div className="card p-4 mb-8 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl w-full lg:w-auto">
            <button
              onClick={() => setFilterType('buy')}
              className={cn(
                "flex-1 lg:flex-none px-10 py-2.5 rounded-xl text-sm font-bold transition-all",
                filterType === 'buy' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-400 hover:text-white"
              )}
            >
              Buy
            </button>
            <button
              onClick={() => setFilterType('sell')}
              className={cn(
                "flex-1 lg:flex-none px-10 py-2.5 rounded-xl text-sm font-bold transition-all",
                filterType === 'sell' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-400 hover:text-white"
              )}
            >
              Sell
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="number" 
                value={searchAmount}
                onChange={(e) => setSearchAmount(e.target.value)}
                placeholder="Enter amount (INR)..." 
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all text-white"
              />
            </div>
            
            <select 
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand"
            >
              <option value="All">All Payments</option>
              {PAYMENT_METHODS.map(pm => (
                <option key={pm} value={pm}>{pm}</option>
              ))}
            </select>

            <button className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:bg-white/10 transition-all">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Ads List */}
        <div className="space-y-4">
          {loading ? (
            <div className="card p-20 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-brand animate-spin mb-4" />
              <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Scanning Marketplace...</p>
            </div>
          ) : ads.length === 0 ? (
            <div className="card p-20 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                <ArrowLeftRight className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Ads Found</h3>
              <p className="text-gray-500 max-w-xs mx-auto">Try adjusting your filters or search amount to find available trades.</p>
            </div>
          ) : (
            ads.map((ad) => (
              <motion.div
                key={ad.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6 hover:border-brand/30 transition-all group relative overflow-hidden"
              >
                {ad.user_profile?.has_verification_badge && (
                  <div className="absolute top-0 right-0 bg-brand/10 text-brand px-4 py-1 rounded-bl-2xl text-[10px] font-bold uppercase tracking-widest border-l border-b border-brand/20 flex items-center gap-1.5">
                    <Award className="w-3 h-3" />
                    Top Merchant
                  </div>
                )}

                <div className="grid lg:grid-cols-4 gap-8 items-center">
                  {/* Merchant Info */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-brand border border-white/10 group-hover:border-brand/30 transition-all">
                        <User className="w-7 h-7" />
                      </div>
                      {ad.user_profile?.is_verified_merchant && (
                        <div className="absolute -bottom-1 -right-1 bg-[#050505] p-0.5 rounded-full">
                          <CheckCircle2 className="w-5 h-5 text-brand" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white tracking-tight truncate">
                          {ad.user_profile?.full_name || 'Anonymous'}
                        </span>
                        <button 
                          onClick={() => toggleFavorite(ad.user_id)}
                          className={cn(
                            "p-1 rounded-lg transition-all",
                            favorites.includes(ad.user_id) ? "text-red-500" : "text-gray-600 hover:text-red-500"
                          )}
                        >
                          <Heart className={cn("w-4 h-4", favorites.includes(ad.user_id) && "fill-current")} />
                        </button>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          {ad.user_profile?.trades_completed || 0} Trades
                        </span>
                        <span className="w-1 h-1 bg-gray-700 rounded-full" />
                        <span className="text-[10px] font-bold text-brand uppercase tracking-widest">
                          {ad.user_profile?.completion_rate || 0}% Success
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={cn(
                                "w-3 h-3", 
                                i < Math.round((ad.user_profile?.rating_sum || 0) / (ad.user_profile?.rating_count || 1)) 
                                  ? "text-yellow-500 fill-current" 
                                  : "text-gray-700"
                              )} 
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-gray-500">
                          ({ad.user_profile?.rating_count || 0})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price Info */}
                  <div className="lg:text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Price per {selectedAsset}</p>
                    <div className="flex flex-col lg:items-center">
                      <p className="text-3xl font-display font-bold text-white leading-none">
                        ₹{ad.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      {ad.pricing_type === 'dynamic' && (
                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest mt-2 flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          Live Market +{ad.margin}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Payment & Limits */}
                  <div>
                    <div className="mb-4">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Limits</p>
                      <p className="text-sm font-bold text-white">
                        {formatCurrency(ad.min_limit)} - {formatCurrency(ad.max_limit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Payment Methods</p>
                      <div className="flex flex-wrap gap-2">
                        {ad.payment_methods.map((pm, i) => (
                          <span key={i} className="px-2.5 py-1 bg-white/5 text-[9px] font-bold text-gray-400 uppercase tracking-widest rounded-lg border border-white/10">
                            {pm}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => navigate(`/p2p/create/${ad.id}`)}
                      className={cn(
                        "w-full py-4 rounded-2xl font-bold text-sm transition-all shadow-lg",
                        filterType === 'buy' 
                          ? "bg-green-600 hover:bg-green-700 text-white shadow-green-900/20" 
                          : "bg-red-600 hover:bg-red-700 text-white shadow-red-900/20"
                      )}
                    >
                      {filterType === 'buy' ? 'Buy ' : 'Sell '}{selectedAsset}
                    </button>
                    <div className="flex items-center justify-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-brand" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          {ad.user_profile?.speed_rating || 5.0} Speed
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3 text-brand" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          {ad.user_profile?.comm_rating || 5.0} Comm
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Trust Banner */}
        <div className="mt-12 p-8 bg-gradient-to-r from-brand/10 to-transparent border border-brand/20 rounded-3xl flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 bg-brand/20 rounded-2xl flex items-center justify-center text-brand shadow-xl border border-brand/30 shrink-0">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-lg font-bold text-white mb-1">Institutional-Grade Escrow Protection</h4>
            <p className="text-sm text-gray-400">Our automated settlement protocol locks funds the moment a trade starts. Your crypto is released only when payment is confirmed by both parties.</p>
          </div>
          <button className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-bold text-white transition-all">
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
                <div className="p-10">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h3 className="text-2xl font-display font-bold text-white tracking-tight">Post Advertisement</h3>
                      <p className="text-[10px] text-brand font-bold uppercase tracking-widest mt-1">Global Marketplace Listing</p>
                    </div>
                    <button 
                      onClick={() => setIsCreateModalOpen(false)}
                      className="p-3 hover:bg-white/5 rounded-2xl transition-colors border border-white/5"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <form className="space-y-8" onSubmit={handleCreateAd}>
                    <div className="grid md:grid-cols-2 gap-8">
                      {/* Type & Asset */}
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Trade Type</label>
                          <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                            <button
                              type="button"
                              onClick={() => setNewAd(prev => ({ ...prev, type: 'buy' }))}
                              className={cn(
                                "py-2.5 rounded-xl text-xs font-bold transition-all",
                                newAd.type === 'buy' ? "bg-brand text-white" : "text-gray-500 hover:text-white"
                              )}
                            >
                              I want to Buy
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewAd(prev => ({ ...prev, type: 'sell' }))}
                              className={cn(
                                "py-2.5 rounded-xl text-xs font-bold transition-all",
                                newAd.type === 'sell' ? "bg-brand text-white" : "text-gray-500 hover:text-white"
                              )}
                            >
                              I want to Sell
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Asset to Trade</label>
                          <div className="grid grid-cols-2 gap-2">
                            {ASSETS.map(asset => (
                              <button
                                key={asset.id}
                                type="button"
                                onClick={() => setNewAd(prev => ({ ...prev, asset: asset.id }))}
                                className={cn(
                                  "flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all",
                                  newAd.asset === asset.id ? "bg-brand/10 border-brand text-white" : "bg-white/5 border-white/10 text-gray-500"
                                )}
                              >
                                <img src={asset.icon} className="w-4 h-4" referrerPolicy="no-referrer" />
                                <span className="text-xs font-bold">{asset.id}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pricing Type</label>
                          <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                            <button
                              type="button"
                              onClick={() => setNewAd(prev => ({ ...prev, pricing_type: 'fixed' }))}
                              className={cn(
                                "py-2.5 rounded-xl text-xs font-bold transition-all",
                                newAd.pricing_type === 'fixed' ? "bg-brand text-white" : "text-gray-500 hover:text-white"
                              )}
                            >
                              Fixed
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewAd(prev => ({ ...prev, pricing_type: 'dynamic' }))}
                              className={cn(
                                "py-2.5 rounded-xl text-xs font-bold transition-all",
                                newAd.pricing_type === 'dynamic' ? "bg-brand text-white" : "text-gray-500 hover:text-white"
                              )}
                            >
                              Dynamic
                            </button>
                          </div>
                        </div>

                        {newAd.pricing_type === 'fixed' ? (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Fixed Price (INR)</label>
                            <input 
                              type="number" 
                              step="0.01"
                              value={newAd.price}
                              onChange={(e) => setNewAd(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                              className="input-field py-4" 
                            />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Margin (%)</label>
                            <div className="relative">
                              <input 
                                type="number" 
                                step="0.1"
                                value={newAd.margin}
                                onChange={(e) => setNewAd(prev => ({ ...prev, margin: parseFloat(e.target.value) }))}
                                className="input-field py-4 pr-12" 
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">Final Price: ₹{(marketPrices[newAd.asset.toLowerCase()]?.inr * (1 + newAd.margin / 100)).toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Min Limit (INR)</label>
                        <input 
                          type="number" 
                          value={newAd.min_limit}
                          onChange={(e) => setNewAd(prev => ({ ...prev, min_limit: parseFloat(e.target.value) }))}
                          className="input-field py-4" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Max Limit (INR)</label>
                        <input 
                          type="number" 
                          value={newAd.max_limit}
                          onChange={(e) => setNewAd(prev => ({ ...prev, max_limit: parseFloat(e.target.value) }))}
                          className="input-field py-4" 
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Payment Methods</label>
                      <div className="flex flex-wrap gap-3">
                        {PAYMENT_METHODS.map((pm) => (
                          <label key={pm} className={cn(
                            "flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all cursor-pointer",
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
                            <span className="text-xs font-bold">{pm}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmitting || newAd.payment_methods.length === 0}
                      className="btn-primary w-full py-5 text-base shadow-2xl shadow-brand/20 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
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
      </div>
    </div>
  );
}
