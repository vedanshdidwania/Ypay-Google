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
      const { data, error } = await supabase
        .from('orders')
        .select('*, ad:ads(*)')
        .or(`user_id.eq.${user?.id},ad.user_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

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
    <div className="min-h-screen bg-[#050505] pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">My Orders</h1>
            <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">Track your P2P trade status</p>
          </div>

          <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
            {(['active', 'completed', 'cancelled'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === tab ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-gray-500 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          {filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-6 hover:border-white/20 transition-all group"
            >
              <Link to={`/p2p/order/${order.id}`} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    order.type === 'buy' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {order.type === 'buy' ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-sm font-bold uppercase tracking-widest ${
                        order.type === 'buy' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {order.type} USDT
                      </span>
                      <span className="text-gray-700">•</span>
                      <span className="text-xs text-gray-500 font-mono">#{order.id.substring(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-white">{formatCurrency(order.amount_inr)}</span>
                      <span className="text-gray-700">/</span>
                      <span className="text-lg text-gray-400">{formatUSDT(order.amount_usdt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right hidden md:block">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Status</p>
                    <div className="flex items-center gap-2 justify-end">
                      {order.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : 
                       order.status === 'cancelled' ? <XCircle className="w-4 h-4 text-red-500" /> : 
                       <Clock className="w-4 h-4 text-yellow-500" />}
                      <span className={`text-sm font-bold capitalize ${
                        order.status === 'completed' ? 'text-green-500' : 
                        order.status === 'cancelled' ? 'text-red-500' : 
                        'text-yellow-500'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-right hidden md:block">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Date</p>
                    <p className="text-sm font-bold text-white">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>

                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-500 group-hover:bg-brand group-hover:text-white transition-all">
                    <ChevronRight className="w-5 h-5" />
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
