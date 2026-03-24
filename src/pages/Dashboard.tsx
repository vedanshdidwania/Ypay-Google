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
  Clock,
  ShieldCheck,
  Loader2,
  Plus,
  Star,
  ShoppingCart
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

interface Order {
  id: string;
  user_id: string;
  ad_id: string;
  type: 'buy' | 'sell';
  amount_usdt: number;
  amount_inr: number;
  rate: number;
  status: string;
  created_at: string;
  ad?: {
    user_id: string;
  };
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'orders' | 'settings'>(
    (searchParams.get('tab') as 'orders' | 'settings') || 'orders'
  );

  useEffect(() => {
    const tab = searchParams.get('tab') as 'orders' | 'settings';
    if (tab && (tab === 'orders' || tab === 'settings')) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const [trc20Address, setTrc20Address] = useState('');
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch Orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*, ad:ads(*)')
        .or(`user_id.eq.${user?.id},ad.user_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // Fetch Ads
      const { data: adsData, error: adsError } = await supabase
        .from('ads')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (adsError) throw adsError;
      setAds(adsData || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setTrc20Address(profile.trc20_address || '');
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;
      setAvatarUrl(publicUrl);
      alert('Profile picture updated!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      alert(error.message || 'Error uploading avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({ 
          trc20_address: trc20Address,
          full_name: fullName
        })
        .eq('id', user.id);

      if (error) throw error;
      alert('Settings saved successfully!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert(error.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      alert('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      setPasswordLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      alert('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      alert(error.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'paid': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
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
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Account Overview</h1>
            <p className="text-gray-400 mt-1">Welcome back, {profile?.full_name || 'User'}</p>
          </div>
          
          <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-xl shadow-lg">
            <button
              onClick={() => setActiveTab('orders')}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-semibold transition-all",
                activeTab === 'orders' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-400 hover:text-white"
              )}
            >
              Activity
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-semibold transition-all",
                activeTab === 'settings' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-400 hover:text-white"
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
                <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                  <Wallet className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Balance</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency((profile?.balance_usdt || 0) * 89)}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Available USDT</span>
                  <span className="font-semibold text-white">{formatUSDT(profile?.balance_usdt || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Locked in Escrow</span>
                  <span className="font-semibold text-amber-500">{formatUSDT(profile?.escrow_balance_usdt || 0)}</span>
                </div>
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <Link to="/wallet" className="w-full btn-primary py-3 flex items-center justify-center">
                    Add Funds
                  </Link>
                  <Link to="/p2p/my-ads" className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl flex items-center justify-center transition-all border border-white/5 text-sm font-bold">
                    Manage My Ads
                  </Link>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Network Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-400">TRON Network</span>
                  </div>
                  <span className="text-xs font-bold text-green-500">ONLINE</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-400">Escrow Engine</span>
                  </div>
                  <span className="text-xs font-bold text-green-500">ACTIVE</span>
                </div>
                <div className="pt-4">
                  <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      <span>Node Load</span>
                      <span>14%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                    <div className="group relative cursor-help">
                      <div className="px-2.5 py-1 bg-brand/10 border border-brand/20 rounded-lg flex items-center gap-2">
                        <Wallet className="w-3.5 h-3.5 text-brand" />
                        <span className="text-xs font-bold text-brand">{formatUSDT(profile?.balance_usdt || 0)}</span>
                      </div>
                      <div className="absolute left-0 top-full mt-2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10">
                        <div className="bg-[#111111] text-white px-3 py-2 rounded-xl shadow-2xl text-[10px] font-bold whitespace-nowrap border border-white/10">
                          Estimated Value: {formatCurrency((profile?.balance_usdt || 0) * 89)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={fetchDashboardData}
                      className="text-xs font-bold text-brand uppercase tracking-widest hover:text-brand/80 transition-colors"
                    >
                      Refresh
                    </button>
                    <Link 
                      to="/wallet"
                      className="text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1"
                    >
                      View All <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {loading ? (
                  <div className="card p-20 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-sm text-gray-500">Loading records...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="card p-20 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                      <History className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="text-gray-500">No transactions found in your history.</p>
                    <Link to="/p2p" className="mt-6 inline-flex btn-primary">
                      Start Trading
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => {
                      const buyerId = order.type === 'buy' ? order.user_id : order.ad?.user_id;
                      const isBuyer = user?.id === buyerId;
                      
                      return (
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
                                isBuyer 
                                  ? "bg-green-500/10 border-green-500/20 text-green-400" 
                                  : "bg-brand/10 border-brand/20 text-brand"
                              )}>
                                {isBuyer ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="font-bold text-white">
                                    {isBuyer ? 'Buy' : 'Sell'} USDT
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
                                <p className="text-lg font-bold text-white">{formatUSDT(order.amount_usdt)}</p>
                                <p className="text-xs font-medium text-gray-500">{formatCurrency(order.amount_inr)}</p>
                              </div>
                              <Link
                                to={`/p2p/order/${order.id}`}
                                className="p-3 bg-white/5 text-gray-500 hover:text-brand hover:bg-brand/10 rounded-xl transition-all border border-white/5"
                              >
                                <ExternalLink className="w-5 h-5" />
                              </Link>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                <div className="card p-8">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="relative group">
                      <div className="w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center text-gray-500 border border-white/5 overflow-hidden">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-10 h-10" />
                        )}
                        {uploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-brand animate-spin" />
                          </div>
                        )}
                      </div>
                      <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-brand text-white rounded-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-lg shadow-brand/20">
                        <Plus className="w-4 h-4" />
                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                      </label>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{profile?.full_name || 'User'}</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span className="text-xs font-bold">{profile?.trust_score || '5.0'}</span>
                        </div>
                        <span className="text-gray-700">•</span>
                        <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">{profile?.total_trades || 0} Trades</span>
                        <span className="text-gray-700">•</span>
                        <span className="text-xs text-green-500 font-bold uppercase tracking-widest">{profile?.completion_rate || 100}% Completion</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Full Name</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={profile?.full_name || ''} 
                        className="input-field bg-white/5 text-gray-400 cursor-not-allowed border-white/5"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Email Address</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={profile?.email || ''} 
                        className="input-field bg-white/5 text-gray-400 cursor-not-allowed border-white/5"
                      />
                    </div>
                  </div>
                </div>

                <div className="card p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-gray-500 border border-white/5">
                        <ShoppingCart className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">My Advertisements</h2>
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Manage your active P2P ads</p>
                      </div>
                    </div>
                    <Link 
                      to="/p2p" 
                      className="px-6 py-3 bg-brand text-white rounded-xl text-sm font-bold hover:bg-brand/90 transition-all shadow-lg shadow-brand/20"
                    >
                      Create Ad
                    </Link>
                  </div>

                  <div className="space-y-4">
                    {ads.length === 0 ? (
                      <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl">
                        <p className="text-gray-500 text-sm">You haven't created any advertisements yet.</p>
                      </div>
                    ) : (
                      ads.map((ad) => (
                        <div key={ad.id} className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs",
                              ad.type === 'buy' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                            )}>
                              {ad.type.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">₹{ad.rate.toFixed(2)} / USDT</p>
                              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                                Limit: ₹{ad.min_limit.toLocaleString()} - ₹{ad.max_limit.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                              ad.status === 'active' ? "bg-green-500/10 text-green-500" : "bg-gray-500/10 text-gray-500"
                            )}>
                              {ad.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="card p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-gray-500 border border-white/5">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Referral Program</h2>
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Earn rewards for inviting friends</p>
                    </div>
                  </div>

                  <div className="p-6 bg-brand/5 border border-brand/10 rounded-2xl">
                    <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                      Invite your friends to Ypay and earn 0.1% on every trade they complete. Your referral code is:
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-white text-sm">
                        {profile?.referral_code || 'YPAY-' + user?.id.substring(0, 6).toUpperCase()}
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(profile?.referral_code || 'YPAY-' + user?.id.substring(0, 6).toUpperCase());
                          alert('Referral code copied!');
                        }}
                        className="px-6 py-3 bg-brand text-white rounded-xl text-sm font-bold hover:bg-brand/90 transition-all shadow-lg shadow-brand/20"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-gray-500 border border-white/5">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Security Settings</h2>
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Account protection & password</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="p-6 bg-brand/5 border border-brand/10 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Two-Factor Authentication (2FA)</p>
                          <p className="text-xs text-gray-500">Add an extra layer of security to your account.</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-colors">
                        Enable
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">New Password</label>
                          <input 
                            type="password" 
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Confirm Password</label>
                          <input 
                            type="password" 
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="input-field"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={handleUpdatePassword}
                        disabled={passwordLoading}
                        className="btn-primary w-full md:w-auto px-12 disabled:opacity-50"
                      >
                        {passwordLoading ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-gray-500 border border-white/5">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Settlement Settings</h2>
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Automated payout configuration</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Full Name</label>
                      <input 
                        type="text" 
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">TRC20 Wallet Address</label>
                      <input 
                        type="text" 
                        placeholder="Enter TRC20 Address"
                        value={trc20Address}
                        onChange={(e) => setTrc20Address(e.target.value)}
                        className="input-field font-mono"
                      />
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-brand/10 rounded-xl border border-brand/20">
                      <Info className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-300 leading-relaxed">
                        Ensure your TRC20 address is correct. Automated settlements are irreversible once executed on the blockchain.
                      </p>
                    </div>
                    <button 
                      onClick={handleSaveSettings}
                      disabled={saving}
                      className="btn-primary w-full md:w-auto px-12 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
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
