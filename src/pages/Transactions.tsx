import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Filter,
  Loader2,
  ExternalLink,
  Clock,
  Download
} from 'lucide-react';
import { formatCurrency, formatUSDT } from '../lib/utils';
import { motion } from 'framer-motion';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  tx_hash: string;
  created_at: string;
}

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) fetchTransactions();
  }, [user]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredTransactions = transactions.filter(tx => 
    tx.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.tx_hash?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ['ID', 'Type', 'Amount', 'Status', 'Hash', 'Date'];
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(tx => [
        tx.id,
        tx.type,
        tx.amount,
        tx.status,
        tx.tx_hash || '',
        new Date(tx.created_at).toLocaleString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 sm:mb-14">
          <div className="text-center md:text-left">
            <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3">Transaction History</h1>
            <p className="text-gray-500 uppercase tracking-widest text-xs sm:text-sm font-bold">Monitor your financial activity</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <button 
                onClick={handleExport}
                className="flex-1 sm:flex-none p-4 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-3"
                title="Export to CSV"
              >
                <Download className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-xs sm:text-sm font-bold uppercase tracking-widest">Export</span>
              </button>
              <button className="sm:hidden p-4 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors">
                <Filter className="w-5 h-5" />
              </button>
            </div>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search hash or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-sm sm:text-base text-white focus:outline-none focus:border-brand/50 w-full sm:w-72 transition-colors"
              />
            </div>
            <button className="hidden sm:block p-4 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors">
              <Filter className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="card overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-bottom border-white/5">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Hash</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTransactions.map((tx) => (
                  <motion.tr 
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          tx.type === 'deposit' ? 'bg-green-500/10 text-green-500' : 
                          tx.type === 'withdrawal' ? 'bg-red-500/10 text-red-500' : 
                          'bg-blue-500/10 text-blue-500'
                        }`}>
                          {tx.type === 'deposit' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <span className="text-sm font-bold text-white capitalize">{tx.type.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-white">{formatUSDT(tx.amount)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        tx.status === 'completed' ? 'bg-green-500/10 text-green-500' : 
                        tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                        {tx.tx_hash?.substring(0, 12)}...
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {new Date(tx.created_at).toLocaleDateString()}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-white/5">
            {filteredTransactions.map((tx) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 space-y-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      tx.type === 'deposit' ? 'bg-green-500/10 text-green-500' : 
                      tx.type === 'withdrawal' ? 'bg-red-500/10 text-red-500' : 
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {tx.type === 'deposit' ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="text-base font-bold text-white capitalize">{tx.type.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{formatUSDT(tx.amount)}</p>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      tx.status === 'completed' ? 'bg-green-500/10 text-green-500' : 
                      tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
                {tx.tx_hash && (
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">TX Hash</span>
                    <div className="flex items-center gap-2 text-xs text-brand font-mono">
                      {tx.tx_hash.substring(0, 16)}...
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {filteredTransactions.length === 0 && (
            <div className="p-12 text-center">
              <History className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 font-bold">No transactions found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
