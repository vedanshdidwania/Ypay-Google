import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  TrendingUp, 
  CreditCard, 
  Users, 
  Settings,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Plus,
  Save,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
  Send,
  Image as ImageIcon,
  ExternalLink,
  Clock,
  BarChart3,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { cn, formatCurrency, formatUSDT } from '../lib/utils';
import type { Order, PaymentMethod, AppSettings, UserProfile, KYCSubmission, SupportChat, SupportMessage } from '../types';

import { useAuth } from '../lib/useAuth';
import Modal from '../components/Modal';

export default function Admin() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop() || 'dashboard';

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, path: '/admin' },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, path: '/admin/orders' },
    { id: 'kyc', label: 'KYC Review', icon: ShieldCheck, path: '/admin/kyc' },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle, path: '/admin/disputes' },
    { id: 'withdrawals', label: 'Withdrawals', icon: CreditCard, path: '/admin/withdrawals' },
    { id: 'merchants', label: 'Merchants', icon: ShieldCheck, path: '/admin/merchants' },
    { id: 'payments', label: 'Payments', icon: CreditCard, path: '/admin/payments' },
    { id: 'users', label: 'Users', icon: Users, path: '/admin/users' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
    { id: 'logs', label: 'System Logs', icon: Clock, path: '/admin/logs' },
    { id: 'support', label: 'Support', icon: MessageSquare, path: '/admin/support' },
    { id: 'p2p-chats', label: 'P2P Chats', icon: MessageSquare, path: '/admin/p2p-chats' },
    { id: 'notifications', label: 'Notifications', icon: Send, path: '/admin/notifications' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Admin Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="card p-6 sticky top-24">
              <div className="flex items-center gap-3 mb-8 px-2">
                <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
                <h2 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Admin Terminal</h2>
              </div>
              <nav className="space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={cn(
                      "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-sm font-bold uppercase tracking-wider",
                      (currentPath === item.id || (currentPath === 'admin' && item.id === 'dashboard'))
                        ? "bg-brand text-white shadow-lg shadow-brand/20" 
                        : "text-gray-500 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>

        {/* Admin Content */}
        <div className="flex-1 min-w-0">
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="kyc" element={<AdminKYC />} />
            <Route path="disputes" element={<AdminDisputes />} />
            <Route path="withdrawals" element={<AdminWithdrawals />} />
            <Route path="merchants" element={<AdminMerchants />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="support" element={<AdminSupport />} />
            <Route path="p2p-chats" element={<AdminP2PChats adminId={user?.id} />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="settings" element={<AdminSettings />} />
          </Routes>
        </div>
      </div>
    </div>
  </div>
);
}

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalUsers: 0,
    totalVolume: 0,
    volumeChange: 12.5,
    userChange: 8.2
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    generateChartData();

    // Subscribe to real-time order updates
    const ordersSubscription = supabase
      .channel('admin-dashboard-orders')
      .on('postgres_changes', { event: '*', table: 'orders' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersSubscription);
    };
  }, []);

  const generateChartData = () => {
    const data = Array.from({ length: 7 }, (_, i) => ({
      name: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      volume: Math.floor(Math.random() * 500000) + 100000,
      users: Math.floor(Math.random() * 50) + 10
    }));
    setChartData(data);
  };

  const fetchStats = async () => {
    try {
      const [ordersRes, usersRes, recentRes] = await Promise.all([
        supabase.from('orders').select('*'),
        supabase.from('profiles').select('*', { count: 'exact' }),
        supabase.from('orders').select('*, profiles(email)').order('created_at', { ascending: false }).limit(5)
      ]);

      if (ordersRes.data) {
        const pending = ordersRes.data.filter(o => o.status === 'pending').length;
        const volume = ordersRes.data.reduce((acc, o) => acc + (o.amount_inr || 0), 0);
        setStats(prev => ({
          ...prev,
          totalOrders: ordersRes.data.length,
          pendingOrders: pending,
          totalUsers: usersRes.count || 0,
          totalVolume: volume
        }));
      }

      if (recentRes.data) {
        setRecentOrders(recentRes.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">System Overview</h2>
          <p className="text-sm text-gray-500 mt-1">Real-time protocol metrics and network status.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-brand/10 border border-brand/20 rounded-xl">
          <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-brand uppercase tracking-widest">Live Network</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 group hover:border-brand/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-white/5 rounded-lg text-gray-400 group-hover:text-brand transition-colors">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1 text-green-500 text-[10px] font-bold">
              <ArrowUpRight className="w-3 h-3" />
              <span>+{stats.volumeChange}%</span>
            </div>
          </div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Volume</div>
          <div className="text-2xl font-bold text-white">₹{stats.totalVolume.toLocaleString()}</div>
        </div>

        <div className="card p-6 group hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-white/5 rounded-lg text-gray-400 group-hover:text-amber-500 transition-colors">
              <Clock className="w-5 h-5" />
            </div>
            <div className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-bold uppercase tracking-widest rounded-md">
              Action Required
            </div>
          </div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pending Orders</div>
          <div className="text-2xl font-bold text-white">{stats.pendingOrders}</div>
        </div>

        <div className="card p-6 group hover:border-brand/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-white/5 rounded-lg text-gray-400 group-hover:text-brand transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1 text-green-500 text-[10px] font-bold">
              <ArrowUpRight className="w-3 h-3" />
              <span>+{stats.userChange}%</span>
            </div>
          </div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Users</div>
          <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
        </div>

        <div className="card p-6 group hover:border-brand/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-white/5 rounded-lg text-gray-400 group-hover:text-brand transition-colors">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="px-2 py-0.5 bg-brand/10 text-brand text-[8px] font-bold uppercase tracking-widest rounded-md">
              Protocol Fee: 1%
            </div>
          </div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Platform Revenue</div>
          <div className="text-2xl font-bold text-white">₹{(stats.totalVolume * 0.01).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-display font-bold text-white">Volume Analytics</h3>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">Last 7 Days (INR)</p>
            </div>
            <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00FF00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00FF00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#ffffff20" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#ffffff20" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `₹${value/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#00FF00', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#00FF00" 
                  fillOpacity={1} 
                  fill="url(#colorVolume)" 
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-display font-bold text-white">User Growth</h3>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">New Signups</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-brand rounded-full" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#ffffff20" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#ffffff20" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#00FF00', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="users" 
                  fill="#00FF00" 
                  radius={[4, 4, 0, 0]} 
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-lg font-display font-bold text-white">Recent P2P Orders</h3>
          <Link to="/admin/orders" className="text-[10px] font-bold text-brand uppercase tracking-widest hover:underline">View All Orders</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Order ID</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">User</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-brand mx-auto" />
                  </td>
                </tr>
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-xs">No recent orders.</td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-[10px] text-gray-500">#{order.id.slice(0, 8)}...</td>
                    <td className="px-6 py-4 text-xs text-white">{order.profiles?.email}</td>
                    <td className="px-6 py-4 text-sm font-bold text-white">₹{order.amount_inr.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-full border",
                        order.status === 'pending' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                        order.status === 'completed' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                        "bg-red-500/10 text-red-500 border-red-500/20"
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[10px] text-gray-500 text-right">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminAnalytics() {
  const [data, setData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (orders) {
        // Group by date
        const grouped = orders.reduce((acc: any, order) => {
          const date = new Date(order.created_at).toLocaleDateString();
          if (!acc[date]) {
            acc[date] = { date, volume: 0, revenue: 0, trades: 0, users: new Set() };
          }
          acc[date].volume += order.amount_inr || 0;
          acc[date].revenue += (order.amount_inr || 0) * 0.01; // 1% fee
          acc[date].trades += 1;
          acc[date].users.add(order.user_id);
          return acc;
        }, {});

        const chartData = Object.values(grouped).map((item: any) => ({
          ...item,
          users: item.users.size
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setData(chartData);

        // Status distribution
        const statusCounts = orders.reduce((acc: any, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {});

        setPieData([
          { name: 'Completed', value: statusCounts.completed || 0, fill: '#00FF00' },
          { name: 'Pending', value: statusCounts.pending || 0, fill: '#F59E0B' },
          { name: 'Cancelled', value: statusCounts.cancelled || 0, fill: '#EF4444' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Advanced Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">Deep dive into protocol performance and financial metrics.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-all">
            Export CSV
          </button>
          <button className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-bold hover:bg-brand/90 transition-all shadow-lg shadow-brand/20">
            Generate Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-brand/10 rounded-lg text-brand">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-widest">Avg. Trade</h4>
          </div>
          <div className="text-2xl font-bold text-white">₹42.5k</div>
          <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest">Per P2P Order</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-widest">Merchants</h4>
          </div>
          <div className="text-2xl font-bold text-white">124</div>
          <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest">Verified & Active</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-widest">Dispute Rate</h4>
          </div>
          <div className="text-2xl font-bold text-white">0.4%</div>
          <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest">Last 30 Days</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-widest">Success Rate</h4>
          </div>
          <div className="text-2xl font-bold text-white">98.2%</div>
          <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest">Trade Completion</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-display font-bold text-white">Revenue & Volume Correlation</h3>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">Financial Performance</p>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#ffffff20" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#ffffff20" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#00FF00" 
                  strokeWidth={3} 
                  dot={false}
                  name="Volume (INR)"
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3B82F6" 
                  strokeWidth={3} 
                  dot={false}
                  name="Revenue (INR)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-8">
          <h3 className="text-lg font-display font-bold text-white mb-8">Order Status Distribution</h3>
          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">100%</div>
                <div className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">Total Orders</div>
              </div>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-white">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-display font-bold text-white">User Growth Trend</h3>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">New Signups vs Active Users</p>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#ffffff20" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#ffffff20" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px' }}
              />
              <Area 
                type="monotone" 
                dataKey="users" 
                stroke="#3B82F6" 
                fillOpacity={1} 
                fill="url(#colorUsers)" 
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false });
    
    if (data) {
      setOrders(data.map(o => ({ ...o, user_email: o.profiles?.email })));
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const order = orders.find(o => o.id === id);
      if (!order) return;

      if (status === 'approved' && order.type === 'buy' && !order.ad_id) {
        // Direct deposit approval
        const { error } = await supabase.rpc('approve_direct_deposit', { p_order_id: id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('orders')
          .update({ status })
          .eq('id', id);
        if (error) throw error;
      }

      fetchOrders();
      if (selectedOrder?.id === id) {
        setSelectedOrder(prev => prev ? { ...prev, status } : null);
      }
    } catch (error: any) {
      console.error('Error updating order status:', error);
      alert(error.message || 'Failed to update order status.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-amber-500 border-amber-500/20 bg-amber-500/10';
      case 'approved': return 'text-green-500 border-green-500/20 bg-green-500/10';
      case 'paid': return 'text-brand border-brand/20 bg-brand/10';
      case 'completed': return 'text-green-400 border-green-400/20 bg-green-400/10';
      default: return 'text-red-500 border-red-500/20 bg-red-500/10';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Order Management</h2>
          <p className="text-sm text-gray-500 mt-1">Review and process settlement requests.</p>
        </div>
        <button 
          onClick={fetchOrders} 
          className="text-[10px] font-bold text-brand uppercase tracking-widest hover:text-brand/80"
        >
          Refresh Ledger
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">User / Type</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-sm text-white">{order.user_email}</div>
                    <div className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      order.type === 'buy' ? "text-green-500" : "text-brand"
                    )}>
                      {order.type} USDT
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{formatUSDT(order.amount_usdt)}</div>
                    <div className="text-xs text-gray-500">{formatCurrency(order.amount_inr)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                      order.status === 'pending' ? "text-amber-500 border-amber-500/20 bg-amber-500/10" :
                      order.status === 'approved' ? "text-green-500 border-green-500/20 bg-green-500/10" :
                      order.status === 'paid' ? "text-brand border-brand/20 bg-brand/10" :
                      order.status === 'completed' ? "text-green-400 border-green-400/20 bg-green-400/10" :
                      "text-red-500 border-red-500/20 bg-red-500/10"
                    )}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {order.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateStatus(order.id, 'approved')}
                            className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => updateStatus(order.id, 'rejected')}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {order.status === 'approved' && order.type === 'sell' && (
                        <button
                          onClick={() => updateStatus(order.id, 'paid')}
                          className="p-2 bg-brand/10 hover:bg-brand/20 text-brand rounded-lg transition-colors"
                          title="Mark as Paid"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <Modal 
          isOpen={!!selectedOrder} 
          onClose={() => setSelectedOrder(null)}
          title="Order Details"
        >
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Order Details</h3>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">ID: {selectedOrder.id}</p>
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                getStatusColor(selectedOrder.status)
              )}>
                {selectedOrder.status}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">User Email</p>
                <p className="font-bold text-white">{selectedOrder.user_email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order Type</p>
                <p className={cn(
                  "font-bold uppercase",
                  selectedOrder.type === 'buy' ? "text-green-500" : "text-brand"
                )}>{selectedOrder.type} USDT</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">USDT Amount</p>
                <p className="text-xl font-bold text-white">{formatUSDT(selectedOrder.amount_usdt)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">INR Amount</p>
                <p className="text-xl font-bold text-white">{formatCurrency(selectedOrder.amount_inr)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rate</p>
                <p className="font-bold text-white">{formatCurrency(selectedOrder.rate)} / USDT</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Created At</p>
                <p className="font-bold text-white">{new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>
            </div>

            {selectedOrder.transaction_hash && (
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Transaction Hash (TXID)</p>
                <div className="flex items-center justify-between">
                  <code className="text-xs font-mono text-white break-all">{selectedOrder.transaction_hash}</code>
                  <a 
                    href={`https://tronscan.org/#/transaction/${selectedOrder.transaction_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-brand hover:bg-brand/10 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}

            {selectedOrder.payment_screenshot_url && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment Proof</p>
                <div className="aspect-video rounded-xl overflow-hidden border border-white/10 bg-white/5">
                  <img 
                    src={selectedOrder.payment_screenshot_url} 
                    alt="Payment Proof" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              {selectedOrder.status === 'pending' && (
                <>
                  <button
                    onClick={() => updateStatus(selectedOrder.id, 'approved')}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-600/20"
                  >
                    Approve Order
                  </button>
                  <button
                    onClick={() => updateStatus(selectedOrder.id, 'rejected')}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/20"
                  >
                    Reject Order
                  </button>
                </>
              )}
              {selectedOrder.status === 'approved' && selectedOrder.type === 'sell' && (
                <button
                  onClick={() => updateStatus(selectedOrder.id, 'paid')}
                  className="w-full py-3 bg-brand hover:bg-brand/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand/20"
                >
                  Mark as Paid
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AdminPayments() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newMethod, setNewMethod] = useState<Partial<PaymentMethod>>({
    type: 'upi',
    account_name: '',
    is_active: true,
    bank_name: '',
    account_number: '',
    ifsc: '',
    upi_id: ''
  });

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    const { data } = await supabase.from('payment_methods').select('*');
    if (data) setMethods(data);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('payment_methods').insert([newMethod]);
      if (error) throw error;
      
      setIsAdding(false);
      setNewMethod({ 
        type: 'upi', 
        account_name: '', 
        is_active: true,
        bank_name: '',
        account_number: '',
        ifsc: '',
        upi_id: ''
      });
      fetchMethods();
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      alert(error.message || 'Failed to add payment method.');
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.from('payment_methods').update({ is_active: !current }).eq('id', id);
      if (error) throw error;
      fetchMethods();
    } catch (error: any) {
      console.error('Error toggling payment method status:', error);
      alert(error.message || 'Failed to update payment method status.');
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteMethod = async (id: string) => {
    try {
      const { error } = await supabase.from('payment_methods').delete().eq('id', id);
      if (error) throw error;
      
      setDeletingId(null);
      fetchMethods();
    } catch (error: any) {
      console.error('Error deleting payment method:', error);
      alert(error.message || 'Failed to delete payment method.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Payment Methods</h2>
          <p className="text-sm text-gray-500 mt-1">Manage supported settlement gateways.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="btn-primary px-6 py-2.5 text-xs shadow-lg shadow-brand/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Gateway</span>
        </button>
      </div>

      <Modal
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title="Confirm Deletion"
      >
        <p className="text-gray-500 mb-8">Are you sure you want to remove this payment gateway? This action will affect all active settlement routes.</p>
        <div className="flex gap-4">
          <button onClick={() => setDeletingId(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-gray-400 transition-all">Cancel</button>
          <button onClick={() => deletingId && deleteMethod(deletingId)} className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-bold text-white transition-all shadow-lg shadow-red-600/20">Delete Gateway</button>
        </div>
      </Modal>

      <Modal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        title="Add Payment Gateway"
      >
        <form onSubmit={handleAdd} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gateway Type</label>
            <select 
              value={newMethod.type}
              onChange={(e) => setNewMethod({ ...newMethod, type: e.target.value as any })}
              className="input-field"
            >
              <option value="upi">UPI</option>
              <option value="bank">Bank Transfer</option>
              <option value="paytm">Paytm</option>
              <option value="phonepe">PhonePe</option>
              <option value="gpay">GPay</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Holder Name</label>
            <input 
              type="text"
              required
              value={newMethod.account_name}
              onChange={(e) => setNewMethod({ ...newMethod, account_name: e.target.value })}
              className="input-field"
              placeholder="e.g. John Doe"
            />
          </div>
          {newMethod.type === 'bank' ? (
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bank Name</label>
                <input 
                  type="text"
                  required
                  value={newMethod.bank_name || ''}
                  onChange={(e) => setNewMethod({ ...newMethod, bank_name: e.target.value })}
                  className="input-field"
                  placeholder="e.g. HDFC Bank"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Number</label>
                <input 
                  type="text"
                  required
                  value={newMethod.account_number || ''}
                  onChange={(e) => setNewMethod({ ...newMethod, account_number: e.target.value })}
                  className="input-field font-mono"
                  placeholder="0000 0000 0000 0000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">IFSC Code</label>
                <input 
                  type="text"
                  required
                  value={newMethod.ifsc || ''}
                  onChange={(e) => setNewMethod({ ...newMethod, ifsc: e.target.value.toUpperCase() })}
                  className="input-field font-mono uppercase"
                  placeholder="HDFC0001234"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment ID / Number</label>
              <input 
                type="text"
                required
                value={newMethod.upi_id || ''}
                onChange={(e) => setNewMethod({ ...newMethod, upi_id: e.target.value })}
                className="input-field font-mono"
                placeholder={newMethod.type === 'upi' ? "john@upi" : "9876543210"}
              />
            </div>
          )}
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-gray-400 transition-all">Cancel</button>
            <button type="submit" className="flex-1 py-3 btn-primary rounded-xl font-bold shadow-lg shadow-brand/20">Add Gateway</button>
          </div>
        </form>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {methods.map((method) => (
          <div key={method.id} className="card p-6 relative group border-transparent hover:border-brand/20 transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleActive(method.id, method.is_active)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all",
                    method.is_active ? "text-green-500 border-green-500/20 bg-green-500/10" : "text-gray-500 border-white/5 bg-white/5"
                  )}
                >
                  {method.is_active ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => setDeletingId(method.id)}
                  className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">{method.type}</div>
              <div className="font-bold text-lg text-white">{method.account_name}</div>
              {method.upi_id && <div className="text-sm text-gray-500 font-mono">{method.upi_id}</div>}
              {method.account_number && (
                <div className="text-sm text-gray-500 font-mono">
                  {method.account_number} <span className="mx-2 opacity-30">|</span> {method.ifsc}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userPaymentMethods, setUserPaymentMethods] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  };

  const fetchUserPaymentMethods = async (userId: string) => {
    const { data } = await supabase.from('user_payment_methods').select('*').eq('user_id', userId);
    if (data) setUserPaymentMethods(data);
  };

  const handleManageUser = (user: UserProfile) => {
    setSelectedUser(user);
    setEditForm(user);
    fetchUserPaymentMethods(user.id);
    setIsEditing(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          balance_usdt: editForm.balance_usdt,
          is_admin: editForm.is_admin,
          is_verified_merchant: editForm.is_verified_merchant,
          is_disabled: editForm.is_disabled,
          kyc_status: editForm.kyc_status
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      setIsEditing(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(error.message || 'Failed to update user. Please check your permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePaymentMethod = async (methodId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('user_payment_methods')
      .update({ is_active: !currentStatus })
      .eq('id', methodId);
    
    if (!error && selectedUser) {
      fetchUserPaymentMethods(selectedUser.id);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-white">User Management</h2>
        <p className="text-sm text-gray-500 mt-1">Monitor and manage protocol participants.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">User</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Balance</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{user.full_name || 'No Name'}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{formatUSDT(user.balance_usdt)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                        user.is_admin ? "text-purple-400 border-purple-400/20 bg-purple-400/10" : "text-gray-500 border-white/5 bg-white/5"
                      )}>
                        {user.is_admin ? 'Admin' : 'User'}
                      </span>
                      {user.is_verified_merchant && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border text-brand border-brand/20 bg-brand/10">
                          Merchant
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                      !user.is_disabled ? "text-green-500 border-green-500/20 bg-green-500/10" : "text-red-500 border-red-500/20 bg-red-500/10"
                    )}>
                      {!user.is_disabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleManageUser(user)}
                      className="text-[10px] font-bold uppercase tracking-widest text-brand hover:underline"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isEditing && selectedUser && (
        <Modal
          isOpen={true}
          onClose={() => setIsEditing(false)}
          title={`Manage User: ${selectedUser.email}`}
        >
          <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2">
            <form onSubmit={handleUpdateUser} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                  <input
                    type="text"
                    value={editForm.full_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Balance (USDT)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.balance_usdt || 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setEditForm({ ...editForm, balance_usdt: isNaN(val) ? 0 : val });
                    }}
                    className="input-field font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">KYC Status</label>
                  <select
                    value={editForm.kyc_status || 'unverified'}
                    onChange={(e) => setEditForm({ ...editForm, kyc_status: e.target.value as any })}
                    className="input-field"
                  >
                    <option value="unverified">Unverified</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="flex flex-col gap-4 pt-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={editForm.is_admin || false}
                      onChange={(e) => setEditForm({ ...editForm, is_admin: e.target.checked })}
                      className="w-5 h-5 rounded-lg border-white/10 bg-white/5 text-brand focus:ring-brand"
                    />
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-wider group-hover:text-white">Administrator</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={editForm.is_verified_merchant || false}
                      onChange={(e) => setEditForm({ ...editForm, is_verified_merchant: e.target.checked })}
                      className="w-5 h-5 rounded-lg border-white/10 bg-white/5 text-brand focus:ring-brand"
                    />
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-wider group-hover:text-white">Verified Merchant</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={editForm.is_disabled || false}
                      onChange={(e) => setEditForm({ ...editForm, is_disabled: e.target.checked })}
                      className="w-5 h-5 rounded-lg border-white/10 bg-white/5 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm font-bold text-red-500 uppercase tracking-wider group-hover:text-red-400">Account Disabled</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-gray-400 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-brand hover:bg-brand/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">User Payment Methods</h4>
              <div className="grid grid-cols-1 gap-4">
                {userPaymentMethods.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No payment methods added by user.</p>
                ) : (
                  userPaymentMethods.map((method) => (
                    <div key={method.id} className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{method.type}</div>
                        <div className="font-bold text-white">{method.account_name}</div>
                        <div className="text-xs text-gray-500 font-mono">
                          {method.upi_id || method.account_number}
                        </div>
                      </div>
                      <button
                        onClick={() => togglePaymentMethod(method.id, method.is_active)}
                        className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all",
                          method.is_active ? "text-green-500 border-green-500/20 bg-green-500/10" : "text-gray-500 border-white/5 bg-white/5"
                        )}
                      >
                        {method.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AdminP2PChats({ adminId }: { adminId?: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchActiveOrders();
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      fetchMessages(selectedOrder.id);
      const channel = supabase
        .channel(`admin_p2p_messages:${selectedOrder.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `order_id=eq.${selectedOrder.id}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedOrder]);

  const fetchActiveOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          user_profile:profiles(email, full_name),
          ad:ads(
            ad_profile:profiles(email, full_name)
          )
        `)
        .in('status', ['pending', 'paid', 'disputed'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders(data);
    } catch (error) {
      console.error('Error fetching active orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (orderId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !newMessage.trim()) return;

    try {
      setSending(true);
      const { error } = await supabase.from('chat_messages').insert({
        order_id: selectedOrder.id,
        sender_id: adminId,
        message: `[ADMIN]: ${newMessage}`
      });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex gap-6">
      {/* Order List */}
      <div className="w-80 flex-shrink-0 card flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Active Trades</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-brand mx-auto" /></div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">No active trades found.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {orders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={cn(
                    "w-full p-4 text-left transition-all hover:bg-white/5",
                    selectedOrder?.id === order.id && "bg-brand/10 border-l-4 border-brand"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-brand uppercase tracking-widest">#{order.id.slice(0, 8)}</span>
                    <span className={cn(
                      "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full",
                      order.status === 'disputed' ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-500"
                    )}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-white truncate">
                    {order.user_profile?.full_name} ↔ {order.ad?.ad_profile?.full_name}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">{formatUSDT(order.amount_usdt)} USDT • ₹{order.amount_inr.toLocaleString()}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 card flex flex-col overflow-hidden">
        {selectedOrder ? (
          <>
            <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white">Trade Chat: #{selectedOrder.id.slice(0, 8)}</h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                  {selectedOrder.user_profile?.email} (User) ↔ {selectedOrder.ad?.ad_profile?.email} (Ad Creator)
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[80%]",
                    msg.sender_id === adminId ? "mx-auto items-center" : 
                    msg.sender_id === selectedOrder.user_id ? "mr-auto items-start" : "ml-auto items-end"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-2xl text-sm",
                    msg.sender_id === adminId ? "bg-white/10 text-brand border border-brand/20" :
                    msg.sender_id === selectedOrder.user_id 
                      ? "bg-white/5 text-white rounded-tl-none border border-white/10" 
                      : "bg-brand text-white rounded-tr-none"
                  )}>
                    <p className="text-[8px] font-bold uppercase tracking-widest mb-1 opacity-50">
                      {msg.sender_id === adminId ? 'System Admin' : 
                       msg.sender_id === selectedOrder.user_id ? 'User' : 'Ad Creator'}
                    </p>
                    {msg.image_url && (
                      <img src={msg.image_url} className="max-w-full rounded-lg mb-2" />
                    )}
                    {msg.message}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-white/5 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Send a message as Admin..."
                className="flex-1 bg-[#050505] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand"
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="p-2 bg-brand text-white rounded-xl hover:bg-brand/90 disabled:opacity-50 transition-all shadow-lg shadow-brand/20"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-gray-500 mb-4">
              <MessageSquare className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-display font-bold text-white">No Trade Selected</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">
              Select an active trade from the list to monitor the conversation and intervene if necessary.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
function AdminNotifications() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [targetUser, setTargetUser] = useState<'all' | 'specific'>('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications(data || []);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .limit(100);
    setUsers(data || []);
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const notificationData = {
        title,
        message,
        type,
        user_id: targetUser === 'all' ? null : targetUserId,
        read: false
      };

      const { error } = await supabase
        .from('notifications')
        .insert([notificationData]);

      if (error) throw error;

      alert('Notification sent successfully!');
      setTitle('');
      setMessage('');
      fetchNotifications();
    } catch (error: any) {
      console.error('Error sending notification:', error);
      alert(error.message || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold text-white">System Notifications</h2>
        <p className="text-sm text-gray-500 mt-1">Broadcast messages to users or send targeted alerts.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="card p-8">
          <h3 className="text-lg font-bold text-white mb-6">Send New Notification</h3>
          <form onSubmit={handleSendNotification} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Target Audience</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setTargetUser('all')}
                  className={cn(
                    "flex-1 py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all",
                    targetUser === 'all' ? "bg-brand text-white border-brand shadow-lg shadow-brand/20" : "bg-white/5 text-gray-500 border-white/5 hover:text-white"
                  )}
                >
                  All Users
                </button>
                <button
                  type="button"
                  onClick={() => setTargetUser('specific')}
                  className={cn(
                    "flex-1 py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all",
                    targetUser === 'specific' ? "bg-brand text-white border-brand shadow-lg shadow-brand/20" : "bg-white/5 text-gray-500 border-white/5 hover:text-white"
                  )}
                >
                  Specific User
                </button>
              </div>
            </div>

            {targetUser === 'specific' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Select User</label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Select a user...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.email} ({u.full_name})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Notification Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="input-field"
              >
                <option value="info">Information (Blue)</option>
                <option value="success">Success (Green)</option>
                <option value="warning">Warning (Amber)</option>
                <option value="error">Error (Red)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. System Maintenance"
                className="input-field"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter notification content..."
                className="input-field min-h-[120px] resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              <span>Send Notification</span>
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white">Recent Notifications</h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {notifications.map((n) => (
              <div key={n.id} className="card p-4 border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      n.type === 'info' ? "bg-blue-500/10 text-blue-500" :
                      n.type === 'success' ? "bg-green-500/10 text-green-500" :
                      n.type === 'warning' ? "bg-amber-500/10 text-amber-500" :
                      "bg-red-500/10 text-red-500"
                    )}>
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">{n.title}</h4>
                      <p className="text-xs text-gray-500 leading-relaxed mb-2">{n.message}</p>
                      <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                        <span>{n.user_id ? 'Targeted' : 'Global'}</span>
                        <span>•</span>
                        <span>{new Date(n.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteNotification(n.id)}
                    className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No notifications sent yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('app_settings').select('*').single();
    if (data) setSettings(data);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('app_settings')
        .update({
          buy_rate: settings.buy_rate,
          sell_rate: settings.sell_rate,
          platform_fee: settings.platform_fee,
          admin_wallet_address: settings.admin_wallet_address,
          support_contact: settings.support_contact,
          homepage_headline: settings.homepage_headline,
          homepage_subheadline: settings.homepage_subheadline
        })
        .eq('id', settings.id);
      
      if (error) throw error;
      
      // Log action
      await supabase.from('platform_logs').insert({
        admin_id: user?.id,
        action: 'SETTINGS_UPDATE',
        details: `Protocol settings updated: Buy Rate: ${settings.buy_rate}, Sell Rate: ${settings.sell_rate}, Fee: ${settings.platform_fee}%`
      });

      setSuccess('Settings updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating settings:', error);
      alert(error.message || 'Failed to update settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-white">Protocol Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Configure global application parameters and rates.</p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold uppercase tracking-widest">
          {success}
        </div>
      )}

      <div className="card p-8 max-w-4xl">
        <form onSubmit={handleUpdate} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Buy Rate (INR per USDT)</label>
              <input
                type="number"
                step="0.01"
                value={settings?.buy_rate || 0}
                onChange={(e) => setSettings(s => s ? { ...s, buy_rate: parseFloat(e.target.value) } : null)}
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sell Rate (INR per USDT)</label>
              <input
                type="number"
                step="0.01"
                value={settings?.sell_rate || 0}
                onChange={(e) => setSettings(s => s ? { ...s, sell_rate: parseFloat(e.target.value) } : null)}
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Platform Fee (%)</label>
              <input
                type="number"
                step="0.01"
                value={settings?.platform_fee || 0}
                onChange={(e) => setSettings(s => s ? { ...s, platform_fee: parseFloat(e.target.value) } : null)}
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Support Contact (Email/Telegram)</label>
              <input
                type="text"
                value={settings?.support_contact || ''}
                onChange={(e) => setSettings(s => s ? { ...s, support_contact: e.target.value } : null)}
                className="input-field"
                placeholder="e.g. @support_bot"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin USDT Wallet (TRC20)</label>
              <input
                type="text"
                value={settings?.admin_wallet_address || ''}
                onChange={(e) => setSettings(s => s ? { ...s, admin_wallet_address: e.target.value } : null)}
                className="input-field font-mono"
                placeholder="Enter TRC20 address"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Homepage Headline</label>
              <input
                type="text"
                value={settings?.homepage_headline || ''}
                onChange={(e) => setSettings(s => s ? { ...s, homepage_headline: e.target.value } : null)}
                className="input-field"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Homepage Subheadline</label>
              <textarea
                value={settings?.homepage_subheadline || ''}
                onChange={(e) => setSettings(s => s ? { ...s, homepage_subheadline: e.target.value } : null)}
                className="input-field min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-brand hover:bg-brand/90 text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-brand/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Protocol Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminSupport() {
  const [chats, setChats] = useState<SupportChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<SupportChat | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchChats();
    
    // Subscribe to new chats or updates
    const subscription = supabase
      .channel('support_chats_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_chats' }, () => {
        fetchChats();
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
      // Subscribe to new messages
      const subscription = supabase
        .channel(`chat:${selectedChat.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${selectedChat.id}` }, (payload) => {
          setMessages(prev => [...prev, payload.new as SupportMessage]);
        })
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedChat]);

  const fetchChats = async () => {
    const { data } = await supabase
      .from('support_chats')
      .select('*')
      .order('last_message_at', { ascending: false });
    if (data) setChats(data);
    setLoading(false);
  };

  const fetchMessages = async (chatId: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !newMessage.trim()) return;

    setSending(true);
    const { error } = await supabase.from('support_messages').insert({
      chat_id: selectedChat.id,
      sender_id: 'admin', // In a real app, use the admin's actual ID
      content: newMessage,
      is_admin_reply: true
    });

    if (!error) {
      setNewMessage('');
      // Update last message in chat
      await supabase.from('support_chats').update({
        last_message: newMessage,
        last_message_at: new Date().toISOString()
      }).eq('id', selectedChat.id);
    }
    setSending(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;

    // Mock image upload - in a real app, use supabase.storage
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const { error } = await supabase.from('support_messages').insert({
        chat_id: selectedChat.id,
        sender_id: 'admin',
        content: 'Sent an image',
        image_url: base64String,
        is_admin_reply: true
      });
      if (!error) {
        await supabase.from('support_chats').update({
          last_message: 'Sent an image',
          last_message_at: new Date().toISOString()
        }).eq('id', selectedChat.id);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex gap-6">
      {/* Chat List */}
      <div className="w-80 flex-shrink-0 card flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Support Inbox</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-brand mx-auto" /></div>
          ) : chats.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">No active support chats.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={cn(
                    "w-full p-4 text-left transition-all hover:bg-white/5",
                    selectedChat?.id === chat.id && "bg-brand/10 border-l-4 border-brand"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-bold text-white truncate max-w-[120px]">{chat.user_email}</span>
                    <span className="text-[10px] text-gray-400">{new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{chat.last_message || 'New conversation'}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 card flex flex-col overflow-hidden">
        {selectedChat ? (
          <>
            <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white">{selectedChat.user_email}</h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Active Session</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[80%]",
                    msg.is_admin_reply ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-2xl text-sm",
                    msg.is_admin_reply 
                      ? "bg-brand text-white rounded-tr-none" 
                      : "bg-white/5 text-white rounded-tl-none border border-white/10"
                  )}>
                    {msg.image_url && (
                      <img src={msg.image_url} className="max-w-full rounded-lg mb-2 cursor-pointer" onClick={() => window.open(msg.image_url)} />
                    )}
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-white/5 flex gap-2">
              <label className="p-2 text-gray-400 hover:text-brand cursor-pointer transition-colors">
                <ImageIcon className="w-5 h-5" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your response..."
                className="flex-1 bg-[#050505] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand"
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="p-2 bg-brand text-white rounded-xl hover:bg-brand/90 disabled:opacity-50 transition-all shadow-lg shadow-brand/20"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-gray-500 mb-4">
              <MessageSquare className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-display font-bold text-white">No Chat Selected</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">
              Select a conversation from the inbox to start mediating and providing support.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data } = await supabase
        .from('platform_logs')
        .select('*, profiles:admin_id(email)')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (data) {
        setLogs(data);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('APPROVE')) return 'text-green-500';
    if (action.includes('REJECT') || action.includes('REVOKE')) return 'text-red-500';
    if (action.includes('DISPUTE')) return 'text-amber-500';
    return 'text-brand';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">System Audit Trail</h2>
          <p className="text-sm text-gray-500 mt-1">Immutable record of all administrative actions.</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="p-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
        >
          <Clock className="w-5 h-5" />
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Admin</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Action</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Details</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-brand mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 text-sm">
                    No system logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-white">{log.profiles?.email || 'System'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        getActionColor(log.action)
                      )}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-400 max-w-xs truncate" title={log.details}>
                        {log.details}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[10px] text-gray-500 text-right">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminWithdrawals() {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*, profiles(email, full_name)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setWithdrawals(data);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selectedWithdrawal) return;

    try {
      setIsProcessing(true);
      
      const { error } = await supabase.rpc('process_withdrawal', {
        p_withdrawal_id: selectedWithdrawal.id,
        p_status: status,
        p_feedback: feedback
      });
      
      if (error) throw error;

      // Log action
      await supabase.from('platform_logs').insert({
        admin_id: user?.id,
        action: `WITHDRAWAL_${status.toUpperCase()}`,
        details: `Withdrawal ${selectedWithdrawal.id} for ${selectedWithdrawal.amount} USDT was ${status}. Feedback: ${feedback || 'None'}`,
        user_affected: selectedWithdrawal.user_id
      });

      setFeedback('');
      setSelectedWithdrawal(null);
      fetchWithdrawals();
    } catch (error: any) {
      console.error('Error reviewing withdrawal:', error);
      alert(error.message || 'Failed to update withdrawal status.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-white">Withdrawal Requests</h2>
        <p className="text-sm text-gray-500 mt-1">Review and process user withdrawal requests.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Network/Address</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-brand mx-auto" />
                  </td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-sm">
                    No withdrawal requests found.
                  </td>
                </tr>
              ) : (
                withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{w.profiles?.full_name || 'User'}</span>
                        <span className="text-[10px] text-gray-500">{w.profiles?.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{formatUSDT(w.amount)}</span>
                        <span className="text-[10px] text-gray-500">USDT</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-brand uppercase tracking-widest">{w.network}</span>
                        <span className="text-[10px] text-gray-400 font-mono truncate max-w-[150px]">{w.address}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                        w.status === 'pending' ? "bg-yellow-500/10 text-yellow-500" :
                        w.status === 'approved' ? "bg-green-500/10 text-green-500" :
                        "bg-red-500/10 text-red-500"
                      )}>
                        {w.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[10px] text-gray-500">
                      {new Date(w.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {w.status === 'pending' && (
                        <button 
                          onClick={() => setSelectedWithdrawal(w)}
                          className="p-2 hover:bg-brand/10 text-brand rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={selectedWithdrawal !== null}
        onClose={() => setSelectedWithdrawal(null)}
        title="Review Withdrawal Request"
      >
        {selectedWithdrawal && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">User</p>
                <p className="text-sm text-white font-bold">{selectedWithdrawal.profiles?.full_name}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Amount</p>
                <p className="text-sm text-white font-bold">{formatUSDT(selectedWithdrawal.amount)} USDT</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Network</p>
                <p className="text-sm text-brand font-bold uppercase">{selectedWithdrawal.network}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Wallet Address</p>
                <p className="text-sm text-white font-mono break-all bg-black/40 p-2 rounded-lg">{selectedWithdrawal.address}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin Feedback (Optional)</label>
              <textarea 
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="input-field min-h-[100px]"
                placeholder="Reason for rejection or transaction hash for approval..."
              />
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => handleReview('rejected')}
                disabled={isProcessing}
                className="flex-1 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl font-bold transition-all border border-red-600/20"
              >
                Reject
              </button>
              <button 
                onClick={() => handleReview('approved')}
                disabled={isProcessing}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20"
              >
                Approve & Process
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
function AdminKYC() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    const { data } = await supabase
      .from('kyc_submissions')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false });
    
    if (data) {
      setSubmissions(data.map(s => ({ ...s, user_email: s.profiles?.email })));
    }
    setLoading(false);
  };

  const handleReview = async (id: string, userId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('kyc_submissions')
        .update({ status, admin_feedback: feedback })
        .eq('id', id);
      
      if (error) throw error;

      const { error: profileError } = await supabase.from('profiles').update({ kyc_status: status }).eq('id', userId);
      if (profileError) throw profileError;

      // Log action
      await supabase.from('platform_logs').insert({
        admin_id: user?.id,
        action: `KYC_${status.toUpperCase()}`,
        details: `KYC submission ${id} was ${status}. Feedback: ${feedback || 'None'}`,
        user_affected: userId
      });

      setFeedback('');
      setSelectedDoc(null);
      fetchSubmissions();
    } catch (error: any) {
      console.error('Error reviewing KYC:', error);
      alert(error.message || 'Failed to update KYC status.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-white">Identity Verification</h2>
        <p className="text-sm text-gray-500 mt-1">Review and validate user KYC submissions.</p>
      </div>
      
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">User / Type</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-sm text-white">{sub.user_email}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-brand">{sub.document_type.replace('_', ' ')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                      sub.status === 'pending' ? "text-yellow-500 border-yellow-500/20 bg-yellow-500/10" :
                      sub.status === 'approved' ? "text-green-500 border-green-500/20 bg-green-500/10" :
                      "text-red-500 border-red-500/20 bg-red-500/10"
                    )}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(sub.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedDoc(sub.id)}
                      className="p-2 text-gray-400 hover:text-brand transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDoc && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDoc(null)}
          title="Review KYC Document"
        >
          {submissions.find(s => s.id === selectedDoc) && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Front Side</p>
                  <img src={submissions.find(s => s.id === selectedDoc)?.document_front_url} className="w-full rounded-xl border border-white/10 shadow-sm" />
                </div>
                {submissions.find(s => s.id === selectedDoc)?.document_back_url && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Back Side</p>
                    <img src={submissions.find(s => s.id === selectedDoc)?.document_back_url} className="w-full rounded-xl border border-white/10 shadow-sm" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin Feedback (Optional)</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="input-field h-24 resize-none"
                  placeholder="Reason for rejection..."
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => handleReview(selectedDoc, submissions.find(s => s.id === selectedDoc)!.user_id, 'rejected')}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-bold text-white transition-all shadow-lg shadow-red-600/20"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleReview(selectedDoc, submissions.find(s => s.id === selectedDoc)!.user_id, 'approved')}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-bold text-white transition-all shadow-lg shadow-green-600/20"
                >
                  Approve
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function AdminDisputes() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    const { data } = await supabase
      .from('p2p_disputes')
      .select(`
        *,
        order:orders(
          *,
          user_profile:profiles(email, full_name),
          ad:ads(
            ad_profile:profiles(email, full_name)
          )
        )
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    
    if (data) {
      setDisputes(data);
    }
    setLoading(false);
  };

  const resolveDispute = async (disputeId: string, orderId: string, winnerId: string) => {
    try {
      const { error } = await supabase.rpc('resolve_p2p_dispute', {
        p_dispute_id: disputeId,
        p_order_id: orderId,
        p_winner_id: winnerId,
        p_admin_feedback: `Resolved in favor of user ${winnerId}`
      });
      
      if (error) throw error;
      
      fetchDisputes();
    } catch (error: any) {
      console.error('Error resolving dispute:', error);
      alert(error.message || 'Failed to resolve dispute.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-white">Dispute Resolution</h2>
        <p className="text-sm text-gray-500 mt-1">Mediate and resolve order conflicts.</p>
      </div>
      
      {loading ? (
        <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin text-brand mx-auto" /></div>
      ) : disputes.length === 0 ? (
        <div className="card p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">No active disputes requiring attention.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Order ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Parties</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Reason</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {disputes.map((d) => (
                  <tr key={d.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-[10px] text-gray-500">{d.order_id.slice(0, 8)}...</td>
                    <td className="px-6 py-4">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-brand">User: {d.order?.user_profile?.email}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-orange-500">Ad Creator: {d.order?.ad?.ad_profile?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400 italic">
                      <div>"{d.reason}"</div>
                      {d.video_proof_url && (
                        <a 
                          href={d.video_proof_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-brand hover:underline flex items-center gap-1 mt-1"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>Video Proof</span>
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/p2p/orders/${d.order_id}`} className="p-2 text-gray-400 hover:text-brand transition-colors">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => resolveDispute(d.id, d.order_id, d.order?.user_id)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-green-600/20"
                        >
                          Award User
                        </button>
                        <button 
                          onClick={() => resolveDispute(d.id, d.order_id, d.order?.ad?.user_id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-red-600/20"
                        >
                          Award Ad Creator
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminMerchants() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('trades_completed', { ascending: false });
    
    if (data) {
      setMerchants(data);
    }
    setLoading(false);
  };

  const toggleMerchantStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified_merchant: !currentStatus })
        .eq('id', userId);
      
      if (error) throw error;
      fetchMerchants();
    } catch (error: any) {
      console.error('Error toggling merchant status:', error);
      alert(error.message || 'Failed to update merchant status.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-white">Merchant Verification</h2>
        <p className="text-sm text-gray-500 mt-1">Manage verified protocol merchants.</p>
      </div>
      
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">User</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Stats</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-white/5">
            {merchants.map((m) => (
              <tr key={m.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-white">{m.email}</div>
                  <div className="text-[10px] text-gray-500 font-mono">ID: {m.id.slice(0, 8)}...</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-white">{m.trades_completed} Trades</div>
                  <div className="text-xs text-gray-500">{m.completion_rate}% Completion</div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                    m.is_verified_merchant ? "text-brand border-brand/20 bg-brand/10" : "text-gray-500 border-white/5 bg-white/5"
                  )}>
                    {m.is_verified_merchant ? 'Verified' : 'Standard'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => toggleMerchantStatus(m.id, m.is_verified_merchant)}
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-widest hover:underline",
                      m.is_verified_merchant ? "text-red-500" : "text-brand"
                    )}
                  >
                    {m.is_verified_merchant ? 'Revoke Status' : 'Verify Merchant'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
}
