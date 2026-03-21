import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  History, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ExternalLink, 
  Activity,
  User,
  Lock,
  CreditCard,
  Info,
  CheckCircle2,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface Order {
  id: string;
  amount_usdt: number;
  amount_fiat: number;
  price: number;
  status: string;
  created_at: string;
  buyer_id: string;
  seller_id: string;
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'settings'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`buyer_id.eq.${user?.id},seller_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-50 text-green-600 border-green-100';
      case 'pending': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'paid': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'cancelled': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatUSDT = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' USDT';
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">Account Overview</h1>
            <p className="text-gray-500 mt-1">Welcome back, {profile?.full_name || 'User'}</p>
          </div>
          
          <div className="flex items-center gap-2 p-1 bg-white border border-gray-200 rounded-xl shadow-sm">
            <button
              onClick={() => setActiveTab('orders')}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-semibold transition-all",
                activeTab === 'orders' ? "bg-brand text-white shadow-md" : "text-gray-500 hover:text-gray-900"
              )}
            >
              Activity
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-semibold transition-all",
                activeTab === 'settings' ? "bg-brand text-white shadow-md" : "text-gray-500 hover:text-gray-900"
              )}
            >
              Settings
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Stats Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-brand">
                  <Wallet className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Balance</p>
                  <p className="text-2xl font-bold text-gray-900">₹4,28,500</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Available USDT</span>
                  <span className="font-semibold text-gray-900">4,812.50</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Locked in Escrow</span>
                  <span className="font-semibold text-amber-600">1,200.00</span>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <Link to="/wallet" className="w-full btn-primary py-3 flex items-center justify-center">
                    Add Funds
                  </Link>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-widest">Network Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-600">TRON Network</span>
                  </div>
                  <span className="text-xs font-bold text-green-600">ONLINE</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-600">Escrow Engine</span>
                  </div>
                  <span className="text-xs font-bold text-green-600">ACTIVE</span>
                </div>
                <div className="pt-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                      <span>Node Load</span>
                      <span>14%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="w-[14%] h-full bg-brand" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8">
            {activeTab === 'orders' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                  <button 
                    onClick={fetchOrders}
                    className="text-xs font-bold text-brand uppercase tracking-widest hover:text-indigo-700 transition-colors"
                  >
                    Refresh Ledger
                  </button>
                </div>

                {loading ? (
                  <div className="card p-20 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-sm text-gray-500">Loading records...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="card p-20 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <History className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-500">No transactions found in your history.</p>
                    <Link to="/p2p" className="mt-6 inline-flex btn-primary">
                      Start Trading
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card p-6 hover:border-brand/30 transition-all group"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center border",
                              order.buyer_id === user?.id 
                                ? "bg-green-50 border-green-100 text-green-600" 
                                : "bg-indigo-50 border-indigo-100 text-brand"
                            )}>
                              {order.buyer_id === user?.id ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <span className="font-bold text-gray-900">
                                  {order.buyer_id === user?.id ? 'Buy' : 'Sell'} USDT
                                </span>
                                <span className={cn(
                                  "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border",
                                  getStatusColor(order.status)
                                )}>
                                  {order.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {new Date(order.created_at).toLocaleDateString()}
                                <span>•</span>
                                <span>ID: {order.id.slice(0, 8)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-12">
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-900">{formatUSDT(order.amount_usdt)}</p>
                              <p className="text-xs font-medium text-gray-500">{formatCurrency(order.amount_fiat)}</p>
                            </div>
                            <Link
                              to={`/p2p/order/${order.id}`}
                              className="p-3 bg-gray-50 text-gray-400 hover:text-brand hover:bg-brand-light rounded-xl transition-all"
                            >
                              <ExternalLink className="w-5 h-5" />
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                <div className="card p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Personal identity details</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={profile?.full_name || ''} 
                        className="input-field bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={profile?.email || ''} 
                        className="input-field bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div className="card p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Settlement Settings</h2>
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Automated payout configuration</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">TRC20 Wallet Address</label>
                      <input 
                        type="text" 
                        placeholder="Enter TRC20 Address"
                        className="input-field font-mono"
                      />
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
                      <Info className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                      <p className="text-xs text-indigo-900 leading-relaxed">
                        Ensure your TRC20 address is correct. Automated settlements are irreversible once executed on the blockchain.
                      </p>
                    </div>
                    <button className="btn-primary w-full md:w-auto px-12">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
