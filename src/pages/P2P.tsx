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
  Loader2
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface Ad {
  id: string;
  user_id: string;
  type: 'buy' | 'sell';
  asset: string;
  fiat: string;
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
    rating_sum: number;
    rating_count: number;
  };
}

export default function P2P() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'buy' | 'sell'>('buy');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [rate, setRate] = useState(89.00);
  const [favorites, setFavorites] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAd, setNewAd] = useState({
    type: 'buy' as 'buy' | 'sell',
    price: 89.00,
    min_limit: 1000,
    max_limit: 50000,
    payment_methods: [] as string[]
  });

  useEffect(() => {
    fetchAds();
    fetchRate();
    if (user) {
      fetchFavorites();
    }
  }, [filterType, user]);

  const fetchFavorites = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('merchant_favorites')
        .select('merchant_id')
        .eq('user_id', user.id);
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation "merchant_favorites" does not exist')) {
          console.warn('merchant_favorites table not found');
          return;
        }
        throw error;
      }
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
        const { error } = await supabase
          .from('merchant_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('merchant_id', merchantId);
        if (error) throw error;
        setFavorites(prev => prev.filter(id => id !== merchantId));
      } else {
        const { error } = await supabase
          .from('merchant_favorites')
          .insert({ user_id: user.id, merchant_id: merchantId });
        if (error) throw error;
        setFavorites(prev => [...prev, merchantId]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const fetchRate = async () => {
    try {
      const { data, error } = await supabase.from('app_settings').select('buy_rate').single();
      if (data) {
        setRate(data.buy_rate);
        setNewAd(prev => ({ ...prev, price: data.buy_rate }));
      }
    } catch (error) {
      console.error('Error fetching rate:', error);
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setIsSubmitting(true);
      const { error } = await supabase.from('ads').insert({
        user_id: user.id,
        type: newAd.type,
        asset: 'USDT',
        pricing_type: 'fixed',
        price: newAd.price,
        min_limit: newAd.min_limit,
        max_limit: newAd.max_limit,
        payment_methods: newAd.payment_methods,
        terms: '',
        status: 'active'
      });

      if (error) throw error;
      
      setIsCreateModalOpen(false);
      fetchAds();
      // Reset form
      setNewAd({
        type: 'buy',
        price: rate,
        min_limit: 1000,
        max_limit: 50000,
        payment_methods: []
      });
    } catch (error) {
      console.error('Error creating ad:', error);
      alert('Failed to post advertisement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Are you sure you want to delete this advertisement?')) return;

    try {
      const { error } = await supabase
        .from('ads')
        .update({ status: 'inactive' })
        .eq('id', adId)
        .eq('user_id', user?.id);

      if (error) throw error;
      fetchAds();
    } catch (error) {
      console.error('Error deleting ad:', error);
      alert('Failed to delete advertisement.');
    }
  };

  const fetchAds = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ads')
        .select(`
          *,
          user_profile:profiles(full_name, trades_completed, completion_rate, is_verified_merchant, rating_sum, rating_count)
        `)
        .eq('status', 'active')
        .eq('type', filterType === 'buy' ? 'sell' : 'buy')
        .neq('user_id', user?.id)
        .order('price', { ascending: filterType === 'buy' });

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-[#050505] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">P2P Marketplace</h1>
            <p className="text-gray-400 mt-1">Direct fiat-to-crypto settlements with verified merchants.</p>
          </div>
          
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-5 h-5" />
            Post Advertisement
          </button>
        </div>

        {/* Filters Bar */}
        <div className="card p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-xl w-full md:w-auto">
            <button
              onClick={() => setFilterType('buy')}
              className={cn(
                "flex-1 md:flex-none px-8 py-2 rounded-lg text-sm font-bold transition-all",
                filterType === 'buy' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-400 hover:text-white"
              )}
            >
              Buy
            </button>
            <button
              onClick={() => setFilterType('sell')}
              className={cn(
                "flex-1 md:flex-none px-8 py-2 rounded-lg text-sm font-bold transition-all",
                filterType === 'sell' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-400 hover:text-white"
              )}
            >
              Sell
            </button>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search amount..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all text-white"
              />
            </div>
            <button className="p-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:bg-white/10 transition-all">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Ads List */}
        <div className="space-y-4">
          {loading ? (
            <div className="card p-20 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-500">Scanning marketplace...</p>
            </div>
          ) : ads.length === 0 ? (
            <div className="card p-20 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ArrowLeftRight className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500">No active advertisements found matching your criteria.</p>
            </div>
          ) : (
            ads.map((ad) => (
              <motion.div
                key={ad.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6 hover:shadow-md transition-all group"
              >
                <div className="grid md:grid-cols-4 gap-8 items-center">
                  {/* Merchant Info */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center text-brand font-bold">
                        {ad.user_profile?.full_name?.[0] || 'M'}
                      </div>
                      {ad.user_profile?.is_verified_merchant && (
                        <div className="absolute -top-1 -right-1 bg-[#111111] rounded-full p-0.5 shadow-sm border border-white/5">
                          <CheckCircle2 className="w-4 h-4 text-brand fill-brand/10" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-white">{ad.user_profile?.full_name || 'Merchant'}</span>
                        {ad.user_profile?.is_verified_merchant && (
                          <span className="px-1.5 py-0.5 bg-brand/10 text-brand text-[8px] font-bold uppercase tracking-widest rounded-md">
                            Verified
                          </span>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(ad.user_id);
                          }}
                          className="ml-auto p-1.5 hover:bg-white/5 rounded-lg transition-colors group/fav"
                        >
                          <Heart 
                            className={cn(
                              "w-4 h-4 transition-all",
                              favorites.includes(ad.user_id) 
                                ? "fill-red-500 text-red-500 scale-110" 
                                : "text-gray-600 group-hover/fav:text-red-400"
                            )} 
                          />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-500" />
                          <span>{ad.user_profile?.trades_completed || 0} Trades</span>
                        </div>
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-green-500" />
                          <span className="text-green-400">{ad.user_profile?.completion_rate || 100}% Success</span>
                        </div>
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-brand" />
                          <span className="text-brand">
                            {ad.user_profile?.rating_count && ad.user_profile.rating_count > 0 
                              ? (ad.user_profile.rating_sum / ad.user_profile.rating_count).toFixed(1) 
                              : '5.0'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Price Info */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Price per USDT</p>
                    <p className="text-2xl font-display font-bold text-white">₹{ad.price ? ad.price.toFixed(2) : '0.00'}</p>
                  </div>

                  {/* Limits & Payment */}
                  <div>
                    <div className="mb-3">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Available Limits</p>
                      <p className="text-sm font-medium text-gray-300">
                        {formatCurrency(ad.min_limit)} - {formatCurrency(ad.max_limit)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ad.payment_methods.map((pm, i) => (
                        <span key={i} className="px-2 py-0.5 bg-white/5 text-[9px] font-bold text-gray-500 uppercase tracking-widest rounded-md border border-white/5">
                          {pm}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex items-center gap-2 justify-end">
                    {ad.user_id === user?.id && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAd(ad.id);
                        }}
                        className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all border border-red-500/20"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                    <button 
                      onClick={() => navigate(`/p2p/create/${ad.id}`)}
                      className={cn(
                        "btn-primary w-full md:w-auto px-10",
                        filterType === 'buy' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                      )}
                    >
                      {filterType === 'buy' ? 'Buy USDT' : 'Sell USDT'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Trust Banner */}
        <div className="mt-12 p-6 bg-brand/5 border border-brand/10 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-brand shadow-sm border border-white/5">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Escrow Protection Active</p>
            <p className="text-xs text-gray-400">All trades are secured by our automated settlement protocol. Your funds are safe.</p>
          </div>
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
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/10"
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-display font-bold text-white">Post Advertisement</h3>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Marketplace Listing</p>
                    </div>
                    <button 
                      onClick={() => setIsCreateModalOpen(false)}
                      className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <form className="space-y-6" onSubmit={handleCreateAd}>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Type</label>
                        <select 
                          className="input-field"
                          value={newAd.type}
                          onChange={(e) => setNewAd(prev => ({ ...prev, type: e.target.value as 'buy' | 'sell' }))}
                        >
                          <option value="buy">Buy</option>
                          <option value="sell">Sell</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Price (INR)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={newAd.price}
                          onChange={(e) => setNewAd(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                          className="input-field" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Min Limit</label>
                        <input 
                          type="number" 
                          value={newAd.min_limit}
                          onChange={(e) => setNewAd(prev => ({ ...prev, min_limit: parseFloat(e.target.value) }))}
                          placeholder="1000" 
                          className="input-field" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Max Limit</label>
                        <input 
                          type="number" 
                          value={newAd.max_limit}
                          onChange={(e) => setNewAd(prev => ({ ...prev, max_limit: parseFloat(e.target.value) }))}
                          placeholder="50000" 
                          className="input-field" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Payment Methods</label>
                      <div className="flex flex-wrap gap-2">
                        {['UPI', 'Bank Transfer', 'Paytm', 'PhonePe', 'GPay'].map((pm) => (
                          <label key={pm} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-white/20 bg-transparent text-brand focus:ring-brand"
                              checked={newAd.payment_methods.includes(pm)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewAd(prev => ({ ...prev, payment_methods: [...prev.payment_methods, pm] }));
                                } else {
                                  setNewAd(prev => ({ ...prev, payment_methods: prev.payment_methods.filter(p => p !== pm) }));
                                }
                              }}
                            />
                            <span className="text-xs font-bold text-gray-400">{pm}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmitting || newAd.payment_methods.length === 0}
                      className="btn-primary w-full py-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Publishing...' : 'Publish Advertisement'}
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
