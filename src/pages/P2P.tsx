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
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
    completed_trades: number;
    completion_rate: number;
  };
}

export default function P2P() {
  const { user, profile } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'buy' | 'sell'>('buy');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [rate, setRate] = useState(89.00);

  useEffect(() => {
    fetchAds();
    fetchRate();
  }, [filterType]);

  const fetchRate = async () => {
    try {
      const { data, error } = await supabase.from('app_settings').select('buy_rate').single();
      if (data) setRate(data.buy_rate);
    } catch (error) {
      console.error('Error fetching rate:', error);
    }
  };

  const fetchAds = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('advertisements')
        .select(`
          *,
          user_profile:profiles(full_name, completed_trades, completion_rate)
        `)
        .eq('type', filterType === 'buy' ? 'sell' : 'buy') // If I want to BUY, I see SELL ads
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
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">P2P Marketplace</h1>
            <p className="text-gray-500 mt-1">Direct fiat-to-crypto settlements with verified merchants.</p>
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
          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl w-full md:w-auto">
            <button
              onClick={() => setFilterType('buy')}
              className={cn(
                "flex-1 md:flex-none px-8 py-2 rounded-lg text-sm font-bold transition-all",
                filterType === 'buy' ? "bg-white text-brand shadow-sm" : "text-gray-500 hover:text-gray-900"
              )}
            >
              Buy
            </button>
            <button
              onClick={() => setFilterType('sell')}
              className={cn(
                "flex-1 md:flex-none px-8 py-2 rounded-lg text-sm font-bold transition-all",
                filterType === 'sell' ? "bg-white text-brand shadow-sm" : "text-gray-500 hover:text-gray-900"
              )}
            >
              Sell
            </button>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search amount..." 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              />
            </div>
            <button className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-all">
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
                    <div className="w-12 h-12 bg-brand-light rounded-xl flex items-center justify-center text-brand font-bold">
                      {ad.user_profile?.full_name?.[0] || 'M'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-bold text-gray-900">{ad.user_profile?.full_name || 'Merchant'}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand" />
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <span>{ad.user_profile?.completed_trades || 0} Trades</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="text-green-600">{ad.user_profile?.completion_rate || 100}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Price Info */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Price per USDT</p>
                    <p className="text-2xl font-display font-bold text-gray-900">₹{ad.price.toFixed(2)}</p>
                  </div>

                  {/* Limits & Payment */}
                  <div>
                    <div className="mb-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Available Limits</p>
                      <p className="text-sm font-medium text-gray-700">
                        {formatCurrency(ad.min_limit)} - {formatCurrency(ad.max_limit)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ad.payment_methods.map((pm, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 text-[9px] font-bold text-gray-500 uppercase tracking-widest rounded-md">
                          {pm}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex justify-end">
                    <button className={cn(
                      "btn-primary w-full md:w-auto px-10",
                      filterType === 'buy' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                    )}>
                      {filterType === 'buy' ? 'Buy USDT' : 'Sell USDT'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Trust Banner */}
        <div className="mt-12 p-6 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-indigo-900">Escrow Protection Active</p>
            <p className="text-xs text-indigo-700">All trades are secured by our automated settlement protocol. Your funds are safe.</p>
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
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-display font-bold text-gray-900">Post Advertisement</h3>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Marketplace Listing</p>
                    </div>
                    <button 
                      onClick={() => setIsCreateModalOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  <form className="space-y-6" onSubmit={(e) => {
                    e.preventDefault();
                    // Implementation for creating ad
                    setIsCreateModalOpen(false);
                  }}>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</label>
                        <select className="input-field">
                          <option value="buy">Buy</option>
                          <option value="sell">Sell</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price (INR)</label>
                        <input type="number" defaultValue={rate} className="input-field" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Min Limit</label>
                        <input type="number" placeholder="1000" className="input-field" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Max Limit</label>
                        <input type="number" placeholder="50000" className="input-field" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment Methods</label>
                      <div className="flex flex-wrap gap-2">
                        {['UPI', 'Bank Transfer', 'Paytm', 'PhonePe', 'GPay'].map((pm) => (
                          <label key={pm} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                            <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand" />
                            <span className="text-xs font-bold text-gray-600">{pm}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button type="submit" className="btn-primary w-full py-4 text-sm">
                      Publish Advertisement
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
