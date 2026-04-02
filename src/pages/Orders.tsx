import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';
import { 
  ShoppingBag, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Filter,
  Loader2,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatUSDT } from '../lib/utils';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface Order {
  id: string;
  type: 'buy' | 'sell';
  amount_inr: number;
  amount_usdt: number;
  rate: number;
  status: string;
  created_at: string;
  ad_id: string;
}

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'cancelled'>('active');

  useEffect(() => {
    if (user) fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch user's ads to get their IDs
      const { data: userAds } = await supabase
        .from('ads')
        .select('id')
        .eq('user_id', user?.id);
      
      const adIds = userAds?.map(ad => ad.id) || [];
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          user_profile:profiles!orders_user_id_fkey(id, full_name, email, avatar_url),
          ad:ads!orders_ad_id_fkey(
            *,
            ad_profile:profiles!ads_user_id_fkey(id, full_name, email, avatar_url)
          )
        `);
      
      if (adIds.length > 0) {
        query = query.or(`user_id.eq.${user?.id},ad_id.in.(${adIds.join(',')})`);
      } else {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'active') return ['pending', 'paid', 'disputed'].includes(order.status);
    return order.status === activeTab;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background page-padding">
      <div className="responsive-container">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12 sm:mb-16">
          <div className="text-center lg:text-left">
            <h1 className="heading-xl mb-3">My Orders</h1>
            <p className="label-xs">Track your P2P trade status</p>
          </div>

          <div className="flex items-center justify-center gap-2 p-2 bg-white/5 border border-white/10 rounded-xl overflow-x-auto no-scrollbar">
            {(['active', 'completed', 'cancelled'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 sm:px-8 py-3 rounded-lg label-xs transition-all whitespace-nowrap ${
                  activeTab === tab ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-gray-500 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          {filteredOrders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card card-padding hover-lift hover-glow transition-all group"
            >
              <Link to={`/p2p/order/${order.id}`} className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
                <div className="flex items-center gap-6 sm:gap-8">
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${
                    order.type === 'buy' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {order.type === 'buy' ? <ArrowDownLeft className="w-6 h-6 sm:w-8 sm:h-8" /> : <ArrowUpRight className="w-6 h-6 sm:w-8 sm:h-8" />}
                  </div>
                  
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 sm:gap-4 mb-2">
                      <span className={`label-xs ${
                        order.type === 'buy' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {order.type} USDT
                      </span>
                      <span className="text-gray-700">•</span>
                      <span className="text-xs sm:text-sm text-gray-500 font-mono truncate">#{order.id.substring(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-6">
                      <span className="text-2xl sm:text-3xl font-bold text-white">{formatCurrency(order.amount_inr)}</span>
                      <span className="text-gray-700">/</span>
                      <span className="text-lg sm:text-xl text-gray-400">{formatUSDT(order.amount_usdt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row items-center justify-between lg:justify-end gap-6 sm:gap-10 pt-6 lg:pt-0 border-t lg:border-none border-white/5">
                  <div className="flex items-center gap-6 sm:gap-10">
                    <div className="text-left lg:text-right">
                      <p className="label-xs mb-1.5">Status</p>
                      <div className="flex items-center gap-2 sm:gap-3 lg:justify-end">
                        {order.status === 'completed' ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" /> : 
                         order.status === 'cancelled' ? <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" /> : 
                         <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />}
                        <span className={`text-sm sm:text-base font-bold capitalize ${
                          order.status === 'completed' ? 'text-green-500' : 
                          order.status === 'cancelled' ? 'text-red-500' : 
                          'text-yellow-500'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="label-xs mb-1.5">Date</p>
                      <p className="text-sm sm:text-base font-bold text-white">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-lg sm:rounded-xl items-center justify-center text-gray-500 group-hover:bg-brand group-hover:text-white transition-all">
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}

          {filteredOrders.length === 0 && (
            <div className="card p-20 text-center">
              <ShoppingBag className="w-16 h-16 text-gray-700 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-white mb-2">No {activeTab} orders</h3>
              <p className="text-gray-500 mb-8">You haven't made any {activeTab} trades yet.</p>
              <Link to="/p2p" className="btn-primary px-8 py-3">
                Start Trading
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
