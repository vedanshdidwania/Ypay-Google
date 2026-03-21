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
  AlertTriangle
} from 'lucide-react';
import { cn, formatCurrency, formatUSDT } from '../lib/utils';
import type { Order, PaymentMethod, AppSettings, UserProfile, KYCSubmission } from '../types';

import Modal from '../components/Modal';

export default function Admin() {
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop() || 'dashboard';

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, path: '/admin' },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, path: '/admin/orders' },
    { id: 'kyc', label: 'KYC Review', icon: ShieldCheck, path: '/admin/kyc' },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle, path: '/admin/disputes' },
    { id: 'merchants', label: 'Merchants', icon: ShieldCheck, path: '/admin/merchants' },
    { id: 'rates', label: 'Rates', icon: TrendingUp, path: '/admin/rates' },
    { id: 'payments', label: 'Payments', icon: CreditCard, path: '/admin/payments' },
    { id: 'users', label: 'Users', icon: Users, path: '/admin/users' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Admin Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="card p-6 sticky top-24">
              <div className="flex items-center gap-3 mb-8 px-2">
                <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-[0.2em]">Admin Terminal</h2>
              </div>
              <nav className="space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={cn(
                      "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-sm font-bold uppercase tracking-wider",
                      (currentPath === item.id || (currentPath === 'admin' && item.id === 'dashboard'))
                        ? "bg-brand text-white shadow-md" 
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
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
            <Route path="merchants" element={<AdminMerchants />} />
            <Route path="rates" element={<AdminRates />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="users" element={<AdminUsers />} />
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
    totalVolume: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [ordersRes, usersRes] = await Promise.all([
      supabase.from('orders').select('*'),
      supabase.from('profiles').select('*', { count: 'exact' })
    ]);

    if (ordersRes.data) {
      const pending = ordersRes.data.filter(o => o.status === 'pending').length;
      const volume = ordersRes.data.reduce((acc, o) => acc + o.amount_inr, 0);
      setStats({
        totalOrders: ordersRes.data.length,
        pendingOrders: pending,
        totalUsers: usersRes.count || 0,
        totalVolume: volume
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold text-gray-900">System Overview</h2>
        <p className="text-sm text-gray-500 mt-1">Real-time protocol metrics and network status.</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Total Orders</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalOrders}</div>
        </div>
        <div className="card p-6">
          <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Pending Orders</div>
          <div className="text-3xl font-bold text-gray-900">{stats.pendingOrders}</div>
        </div>
        <div className="card p-6">
          <div className="text-[10px] font-bold text-brand uppercase tracking-widest mb-2">Total Users</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalUsers}</div>
        </div>
        <div className="card p-6">
          <div className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-2">Total Volume</div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalVolume)}</div>
        </div>
      </div>
    </div>
  );
}

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);
    
    if (!error) fetchOrders();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-gray-900">Order Management</h2>
          <p className="text-sm text-gray-500 mt-1">Review and process settlement requests.</p>
        </div>
        <button 
          onClick={fetchOrders} 
          className="text-[10px] font-bold text-brand uppercase tracking-widest hover:text-indigo-700"
        >
          Refresh Ledger
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">User / Type</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-sm text-gray-900">{order.user_email}</div>
                    <div className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      order.type === 'buy' ? "text-green-600" : "text-brand"
                    )}>
                      {order.type} USDT
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{formatUSDT(order.amount_usdt)}</div>
                    <div className="text-xs text-gray-500">{formatCurrency(order.amount_inr)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                      order.status === 'pending' ? "text-amber-600 border-amber-200 bg-amber-50" :
                      order.status === 'approved' ? "text-green-600 border-green-200 bg-green-50" :
                      order.status === 'paid' ? "text-brand border-indigo-200 bg-indigo-50" :
                      "text-red-600 border-red-200 bg-red-50"
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
                            className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => updateStatus(order.id, 'rejected')}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {order.status === 'approved' && order.type === 'sell' && (
                        <button
                          onClick={() => updateStatus(order.id, 'paid')}
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 text-brand rounded-lg transition-colors"
                          title="Mark as Paid"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                      )}
                      <button className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-400 rounded-lg transition-colors">
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
    </div>
  );
}

function AdminRates() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    const { error } = await supabase
      .from('app_settings')
      .update({
        buy_rate: settings.buy_rate,
        sell_rate: settings.sell_rate
      })
      .eq('id', settings.id);
    
    if (!error) {
      setSuccess('Rates updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    }
    setLoading(false);
  };

  const [success, setSuccess] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-gray-900">Rate Management</h2>
        <p className="text-sm text-gray-500 mt-1">Configure global USDT exchange rates.</p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-green-600 text-xs font-bold uppercase tracking-widest">
          {success}
        </div>
      )}

      <div className="card p-8 max-w-md">
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Buy Rate (INR per USDT)</label>
            <input
              type="number"
              step="0.01"
              value={settings?.buy_rate || ''}
              onChange={(e) => setSettings(s => s ? { ...s, buy_rate: parseFloat(e.target.value) } : null)}
              className="input-field text-2xl font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sell Rate (INR per USDT)</label>
            <input
              type="number"
              step="0.01"
              value={settings?.sell_rate || ''}
              onChange={(e) => setSettings(s => s ? { ...s, sell_rate: parseFloat(e.target.value) } : null)}
              className="input-field text-2xl font-bold"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 text-sm"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /><span>Save Protocol Rates</span></>}
          </button>
        </form>
      </div>
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
    is_active: true
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
    const { error } = await supabase.from('payment_methods').insert([newMethod]);
    if (!error) {
      setIsAdding(false);
      setNewMethod({ type: 'upi', account_name: '', is_active: true });
      fetchMethods();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('payment_methods').update({ is_active: !current }).eq('id', id);
    fetchMethods();
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteMethod = async (id: string) => {
    const { error } = await supabase.from('payment_methods').delete().eq('id', id);
    if (!error) {
      setDeletingId(null);
      fetchMethods();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-gray-900">Payment Methods</h2>
          <p className="text-sm text-gray-500 mt-1">Manage supported settlement gateways.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="btn-primary px-6 py-2.5 text-xs"
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
          <button onClick={() => setDeletingId(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-600 transition-all">Cancel</button>
          <button onClick={() => deletingId && deleteMethod(deletingId)} className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-bold text-white transition-all">Delete Gateway</button>
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
          {newMethod.type !== 'bank' ? (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment ID / Number</label>
              <input 
                type="text"
                value={newMethod.upi_id || ''}
                onChange={(e) => setNewMethod({ ...newMethod, upi_id: e.target.value })}
                className="input-field font-mono"
                placeholder="john@upi or 9876543210"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Number</label>
                <input 
                  type="text"
                  value={newMethod.account_number || ''}
                  onChange={(e) => setNewMethod({ ...newMethod, account_number: e.target.value })}
                  className="input-field font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">IFSC Code</label>
                <input 
                  type="text"
                  value={newMethod.ifsc || ''}
                  onChange={(e) => setNewMethod({ ...newMethod, ifsc: e.target.value })}
                  className="input-field font-mono uppercase"
                />
              </div>
            </div>
          )}
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-600 transition-all">Cancel</button>
            <button type="submit" className="flex-1 py-3 btn-primary rounded-xl font-bold">Add Gateway</button>
          </div>
        </form>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {methods.map((method) => (
          <div key={method.id} className="card p-6 relative group border-transparent hover:border-brand/20 transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-brand">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleActive(method.id, method.is_active)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all",
                    method.is_active ? "text-green-600 border-green-200 bg-green-50" : "text-gray-400 border-gray-200 bg-gray-50"
                  )}
                >
                  {method.is_active ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => setDeletingId(method.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">{method.type}</div>
              <div className="font-bold text-lg text-gray-900">{method.account_name}</div>
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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  };

  const toggleStatus = async (id: string, current: boolean) => {
    await supabase.from('profiles').update({ is_disabled: !current }).eq('id', id);
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-gray-900">User Management</h2>
        <p className="text-sm text-gray-500 mt-1">Monitor and manage protocol participants.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">User</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Joined</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{user.full_name || 'No Name'}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                      user.is_admin ? "text-purple-600 border-purple-200 bg-purple-50" : "text-gray-400 border-gray-200 bg-gray-50"
                    )}>
                      {user.is_admin ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                      !user.is_disabled ? "text-green-600 border-green-200 bg-green-50" : "text-red-600 border-red-200 bg-red-50"
                    )}>
                      {!user.is_disabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => toggleStatus(user.id, user.is_disabled)}
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest hover:underline",
                        user.is_disabled ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {user.is_disabled ? 'Enable' : 'Disable'}
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

function AdminSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    const { error } = await supabase
      .from('app_settings')
      .update(settings)
      .eq('id', settings.id);
    
    if (!error) {
      setSuccess('Settings updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    }
    setLoading(false);
  };

  const [success, setSuccess] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-gray-900">Protocol Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Configure global application parameters.</p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-green-600 text-xs font-bold uppercase tracking-widest">
          {success}
        </div>
      )}

      <div className="card p-8 max-w-3xl">
        <form onSubmit={handleUpdate} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin Settlement Wallet (TRC20)</label>
              <input
                type="text"
                value={settings?.admin_wallet_address || ''}
                onChange={(e) => setSettings(s => s ? { ...s, admin_wallet_address: e.target.value } : null)}
                className="input-field font-mono text-sm"
                placeholder="T..."
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Support Gateway (Email/Telegram)</label>
              <input
                type="text"
                value={settings?.support_contact || ''}
                onChange={(e) => setSettings(s => s ? { ...s, support_contact: e.target.value } : null)}
                className="input-field"
                placeholder="@support_handle"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Landing Headline</label>
              <input
                type="text"
                value={settings?.homepage_headline || ''}
                onChange={(e) => setSettings(s => s ? { ...s, homepage_headline: e.target.value } : null)}
                className="input-field"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Landing Subheadline</label>
              <textarea
                rows={3}
                value={settings?.homepage_subheadline || ''}
                onChange={(e) => setSettings(s => s ? { ...s, homepage_subheadline: e.target.value } : null)}
                className="input-field resize-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 text-sm"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /><span>Update Protocol Configuration</span></>}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminKYC() {
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
    const { error } = await supabase
      .from('kyc_submissions')
      .update({ status, admin_feedback: feedback })
      .eq('id', id);
    
    if (!error) {
      await supabase.from('profiles').update({ kyc_status: status }).eq('id', userId);
      setFeedback('');
      setSelectedDoc(null);
      fetchSubmissions();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-gray-900">Identity Verification</h2>
        <p className="text-sm text-gray-500 mt-1">Review and validate user KYC submissions.</p>
      </div>
      
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">User / Type</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-sm text-gray-900">{sub.user_email}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-brand">{sub.document_type.replace('_', ' ')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                      sub.status === 'pending' ? "text-yellow-600 border-yellow-200 bg-yellow-50" :
                      sub.status === 'approved' ? "text-green-600 border-green-200 bg-green-50" :
                      "text-red-600 border-red-200 bg-red-50"
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
                  <img src={submissions.find(s => s.id === selectedDoc)?.document_front_url} className="w-full rounded-xl border border-gray-100 shadow-sm" />
                </div>
                {submissions.find(s => s.id === selectedDoc)?.document_back_url && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Back Side</p>
                    <img src={submissions.find(s => s.id === selectedDoc)?.document_back_url} className="w-full rounded-xl border border-gray-100 shadow-sm" />
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
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-bold text-white transition-all"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleReview(selectedDoc, submissions.find(s => s.id === selectedDoc)!.user_id, 'approved')}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-bold text-white transition-all"
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
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    const { data } = await supabase
      .from('p2p_orders')
      .select('*, buyer:profiles!buyer_id(email), seller:profiles!seller_id(email)')
      .eq('dispute_status', 'open')
      .order('disputed_at', { ascending: false });
    
    if (data) {
      setDisputes(data);
    }
    setLoading(false);
  };

  const resolveDispute = async (orderId: string, winnerId: string) => {
    const { error } = await supabase
      .from('p2p_orders')
      .update({ 
        dispute_status: 'resolved',
        status: 'completed' // Or 'cancelled' depending on decision
      })
      .eq('id', orderId);
    
    if (!error) {
      fetchDisputes();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-gray-900">Dispute Resolution</h2>
        <p className="text-sm text-gray-500 mt-1">Mediate and resolve order conflicts.</p>
      </div>
      
      {loading ? (
        <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin text-brand mx-auto" /></div>
      ) : disputes.length === 0 ? (
        <div className="card p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">No active disputes requiring attention.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Order ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Parties</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Reason</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {disputes.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-[10px] text-gray-500">{d.id.slice(0, 8)}...</td>
                    <td className="px-6 py-4">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Buyer: {d.buyer.email}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Seller: {d.seller.email}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 italic">"{d.dispute_reason}"</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/p2p/orders/${d.id}`} className="p-2 text-gray-400 hover:text-brand transition-colors">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => resolveDispute(d.id, d.buyer_id)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all"
                        >
                          Award Buyer
                        </button>
                        <button 
                          onClick={() => resolveDispute(d.id, d.seller_id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all"
                        >
                          Award Seller
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
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified_merchant: !currentStatus })
      .eq('id', userId);
    
    if (!error) {
      fetchMerchants();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-gray-900">Merchant Verification</h2>
        <p className="text-sm text-gray-500 mt-1">Manage verified protocol merchants.</p>
      </div>
      
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">User</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Stats</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-gray-100">
            {merchants.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{m.email}</div>
                  <div className="text-[10px] text-gray-400 font-mono">ID: {m.id.slice(0, 8)}...</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-gray-900">{m.trades_completed} Trades</div>
                  <div className="text-xs text-gray-500">{m.completion_rate}% Completion</div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                    m.is_verified_merchant ? "text-brand border-brand/20 bg-indigo-50" : "text-gray-400 border-gray-200 bg-gray-50"
                  )}>
                    {m.is_verified_merchant ? 'Verified' : 'Standard'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => toggleMerchantStatus(m.id, m.is_verified_merchant)}
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-widest hover:underline",
                      m.is_verified_merchant ? "text-red-600" : "text-brand"
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
