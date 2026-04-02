import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, History, Loader2, ExternalLink, AlertCircle, CheckCircle, Copy, Check, Cpu, Shield, Zap, Globe, Lock } from 'lucide-react';
import { cn, formatUSDT } from '../lib/utils';
import type { Transaction } from '../types';
import axios from 'axios';
import Modal from '../components/Modal';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

export default function Wallet() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [showWithdrawSuccess, setShowWithdrawSuccess] = useState(false);
  const [withdrawTxHash, setWithdrawTxHash] = useState('');
  const [depositData, setDepositData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [copied, setCopied] = useState(false);

  const NETWORK_FEE = 1.00;

  useEffect(() => {
    if (profile) {
      fetchTransactions();
    }
  }, [profile]);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', profile?.id)
      .order('created_at', { ascending: false });

    if (data) setTransactions(data);
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !depositAmount) return;
    setIsDepositing(true);
    setError(null);

    try {
      const response = await axios.post('/api/wallet/deposit', {
        amount: parseFloat(depositAmount),
        userId: profile.id
      });

      if (response.data.pay_address) {
        setDepositData(response.data);
        setShowDepositModal(true);
      }
      setDepositAmount('');
      fetchTransactions();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initiate deposit');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !withdrawAmount || !withdrawAddress) return;
    
    const amount = parseFloat(withdrawAmount);
    if (amount < 10) {
      setError('Minimum withdrawal is 10 USDT');
      return;
    }
    if (amount + NETWORK_FEE > profile.balance_usdt) {
      setError('Insufficient balance (including network fee)');
      return;
    }
    
    setError(null);
    setShowWithdrawConfirm(true);
  };

  const confirmWithdraw = async () => {
    if (!profile || !withdrawAmount || !withdrawAddress) return;
    setIsWithdrawing(true);
    setError(null);

    try {
      const amount = parseFloat(withdrawAmount);
      
      const { data: txHash, error: withdrawError } = await supabase.rpc('withdraw_usdt', {
        p_amount: amount,
        p_address: withdrawAddress
      });

      if (withdrawError) throw withdrawError;
      
      setWithdrawTxHash(txHash);
      setShowWithdrawConfirm(false);
      setShowWithdrawSuccess(true);
      setWithdrawAmount('');
      setWithdrawAddress('');
      fetchTransactions();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate withdrawal');
    } finally {
      setIsWithdrawing(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Background Grid Decoration */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:40px_40px]" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Left Column: Balance & Actions */}
        <div className="lg:col-span-4 space-y-8">
          {/* High-Tech Balance Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="cyber-card p-5 sm:p-8 group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-gradient-x" />
            
            <div className="flex justify-between items-start mb-6 sm:mb-10">
              <div className="space-y-1.5">
                <h2 className="text-[10px] sm:text-sm font-bold text-gray-500 tracking-[0.4em] uppercase">Liquidity Reserve</h2>
                <p className="text-[9px] sm:text-xs font-mono text-blue-400/60 uppercase">Network: TRON (TRC20)</p>
              </div>
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/10">
                <WalletIcon className="w-5 h-5 sm:w-7 sm:h-7" />
              </div>
            </div>

            <div className="space-y-2 mb-6 sm:mb-10">
              <div className="text-3xl sm:text-6xl font-display text-white tracking-tighter leading-none">
                {profile?.balance_usdt?.toFixed(2) || '0.00'}
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-lg sm:text-2xl font-display text-blue-500 font-bold">USDT</span>
                <div className="h-px flex-1 bg-white/[0.08]" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-8">
              <div className="p-4 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-blue-500/30 transition-colors">
                <div className="text-[9px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 sm:mb-3">Escrow Balance</div>
                <div className="text-xs sm:text-base font-bold text-amber-400 uppercase tracking-wider font-mono">
                  {profile?.escrow_balance_usdt?.toFixed(2) || '0.00'} USDT
                </div>
              </div>
              <div className="p-4 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-blue-500/30 transition-colors">
                <div className="text-[9px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 sm:mb-3">Merchant Status</div>
                <div className={cn(
                  "text-xs sm:text-base font-bold uppercase tracking-wider",
                  profile?.is_verified_merchant ? "text-green-400" : "text-gray-400"
                )}>
                  {profile?.is_verified_merchant ? 'Verified' : 'Standard'}
                </div>
              </div>
            </div>

            {/* Technical Overlay */}
            <div className="absolute -bottom-8 -right-8 opacity-[0.04] pointer-events-none group-hover:opacity-[0.08] transition-opacity duration-500">
              <Cpu className="w-40 h-40 text-blue-500" />
            </div>
          </motion.div>

          {/* Action Module */}
          <div className="cyber-card p-5 sm:p-8">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                <h3 className="text-base sm:text-lg font-display uppercase tracking-widest text-white">Transfer Protocol</h3>
              </div>
              {/* Mobile Tab Switcher */}
              <div className="flex lg:hidden bg-white/[0.03] p-1 rounded-xl border border-white/[0.08]">
                <button
                  onClick={() => setActiveTab('deposit')}
                  className={cn(
                    "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                    activeTab === 'deposit' ? "bg-white text-black" : "text-gray-500"
                  )}
                >
                  In
                </button>
                <button
                  onClick={() => setActiveTab('withdraw')}
                  className={cn(
                    "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                    activeTab === 'withdraw' ? "bg-white text-black" : "text-gray-500"
                  )}
                >
                  Out
                </button>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6 sm:mb-10 p-4 sm:p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-400 text-xs sm:text-sm font-medium"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <div className="space-y-12 sm:space-y-16">
              {/* Deposit Section */}
              <div className={cn("space-y-8", activeTab === 'deposit' ? "block" : "hidden lg:block")}>
                <div className="flex justify-between items-end">
                  <label className="text-[10px] sm:text-sm font-bold text-gray-500 tracking-[0.3em] uppercase">Inbound Capital</label>
                  <span className="text-[9px] sm:text-xs font-mono text-green-400/60">GATEWAY: NOWPAYMENTS</span>
                </div>
                <form onSubmit={handleDeposit} className="space-y-6">
                  <div className="relative">
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white/[0.03] border border-white/[0.1] rounded-2xl px-6 sm:px-8 py-4 sm:py-5 text-2xl sm:text-3xl font-display focus:outline-none focus:border-blue-500/50 transition-all text-white placeholder:text-gray-800"
                    />
                    <div className="absolute right-6 sm:right-8 top-1/2 -translate-y-1/2 font-display text-lg sm:text-xl text-gray-700">USDT</div>
                  </div>
                  <button
                    disabled={isDepositing || !depositAmount}
                    className="w-full py-4 sm:py-5 bg-white text-black font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-sm sm:text-base uppercase tracking-[0.2em] shadow-xl shadow-white/5"
                  >
                    {isDepositing ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>
                        <ArrowDownLeft className="w-5 h-5" />
                        Initiate Deposit
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="hidden lg:block h-px bg-white/[0.08] relative">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-8 sm:px-10 bg-[#0a0a0a] text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-[0.4em] whitespace-nowrap">SECURE GATEWAY</div>
              </div>

              {/* Withdraw Section */}
              <div className={cn("space-y-8", activeTab === 'withdraw' ? "block" : "hidden lg:block")}>
                <div className="flex justify-between items-end">
                  <label className="text-[10px] sm:text-sm font-bold text-gray-500 tracking-[0.3em] uppercase">Outbound Settlement</label>
                  <span className="text-[9px] sm:text-xs font-mono text-red-400/60">NETWORK: TRC20</span>
                </div>
                <form onSubmit={handleWithdraw} className="space-y-6">
                  <div className="relative">
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white/[0.03] border border-white/[0.1] rounded-2xl px-6 sm:px-8 py-4 sm:py-5 text-2xl sm:text-3xl font-display focus:outline-none focus:border-blue-500/50 transition-all text-white placeholder:text-gray-800"
                    />
                    <div className="absolute right-6 sm:right-8 top-1/2 -translate-y-1/2 font-display text-lg sm:text-xl text-gray-700">USDT</div>
                  </div>
                  <div className="flex justify-between text-[9px] sm:text-xs font-bold uppercase tracking-widest px-2 text-gray-600">
                    <span>Min: 10.00</span>
                    <span>Fee: 1.00</span>
                  </div>
                  <input
                    type="text"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    placeholder="Destination TRC20 Address"
                    className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-6 sm:px-8 py-4 sm:py-5 text-sm sm:text-base font-mono text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-800"
                  />
                  <button
                    disabled={isWithdrawing || !withdrawAmount || !withdrawAddress}
                    className="w-full py-4 sm:py-5 bg-white/[0.05] border border-white/[0.1] text-white font-bold rounded-xl transition-all hover:bg-white/[0.1] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-sm sm:text-base uppercase tracking-[0.2em]"
                  >
                    {isWithdrawing ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>
                        <ArrowUpRight className="w-5 h-5" />
                        Execute Withdrawal
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Transaction History */}
        <div className="lg:col-span-8">
          <div className="cyber-card h-full flex flex-col">
            <div className="p-5 sm:p-8 border-b border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <History className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                <h2 className="text-xl sm:text-2xl font-display uppercase tracking-wider text-white">Ledger History</h2>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">Live Sync</span>
              </div>
            </div>
            
            <div className="flex-1">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.02] text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                      <th className="px-8 py-5 font-bold">Operation</th>
                      <th className="px-8 py-5 font-bold">Volume</th>
                      <th className="px-8 py-5 font-bold">Status</th>
                      <th className="px-8 py-5 font-bold">Timestamp</th>
                      <th className="px-8 py-5 font-bold text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center">
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Decrypting ledger...</p>
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center">
                          <History className="w-12 h-12 text-gray-800 mx-auto mb-4" />
                          <p className="text-gray-500 font-light tracking-wide italic">No transaction records detected in the current session.</p>
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center border transition-all",
                                tx.type === 'deposit' 
                                  ? "bg-green-500/10 border-green-500/20 text-green-400" 
                                  : "bg-red-500/10 border-red-500/20 text-red-400"
                              )}>
                                {tx.type === 'deposit' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-white">{tx.type}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs font-display text-white">
                              {tx.type === 'deposit' ? '+' : '-'}{tx.amount ? tx.amount.toFixed(2) : '0.00'}
                              <span className="text-[9px] font-sans text-gray-500 ml-1">USDT</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border",
                              tx.status === 'completed' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                              tx.status === 'pending' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                              "bg-red-500/10 text-red-400 border-red-500/20"
                            )}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-[9px] font-mono text-gray-500 uppercase">
                              {new Date(tx.created_at).toLocaleDateString()}
                              <span className="block opacity-50">{new Date(tx.created_at).toLocaleTimeString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {tx.tx_hash ? (
                              <a 
                                href={`https://tronscan.org/#/transaction/${tx.tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/[0.03] border border-white/[0.08] rounded-lg text-[9px] font-bold text-gray-500 hover:text-blue-400 hover:bg-white/[0.08] transition-all"
                              >
                                <span className="font-mono">{tx.tx_hash.slice(0, 4)}...{tx.tx_hash.slice(-4)}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              <span className="text-[9px] font-bold text-gray-800 uppercase tracking-widest">N/A</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden p-4 space-y-4">
                {loading ? (
                  <div className="py-16 text-center">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">Decrypting ledger...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="py-16 text-center">
                    <History className="w-12 h-12 text-gray-800 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm font-light tracking-wide italic">No transaction records detected.</p>
                  </div>
                ) : (
                  transactions.map((tx) => (
                    <div key={tx.id} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center border",
                            tx.type === 'deposit' 
                              ? "bg-green-500/10 border-green-500/20 text-green-400" 
                              : "bg-red-500/10 border-red-500/20 text-red-400"
                          )}>
                            {tx.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                          </div>
                          <span className="text-xs font-bold uppercase tracking-widest text-white">{tx.type}</span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border",
                          tx.status === 'completed' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          tx.status === 'pending' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                          "bg-red-500/10 text-red-400 border-red-500/20"
                        )}>
                          {tx.status}
                        </span>
                      </div>
                      
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-xl font-display text-white">
                            {tx.type === 'deposit' ? '+' : '-'}{tx.amount ? tx.amount.toFixed(2) : '0.00'}
                            <span className="text-xs font-sans text-gray-500 ml-1.5">USDT</span>
                          </div>
                          <div className="text-[10px] font-mono text-gray-600 uppercase mt-2">
                            {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                        
                        {tx.tx_hash && (
                          <a 
                            href={`https://tronscan.org/#/transaction/${tx.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-lg text-gray-500"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Confirmation Modal - Enhanced */}
      <Modal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        title="Inbound Transfer Protocol"
        className="bg-[#0a0a0a] border border-white/[0.08]"
      >
        <div className="text-center space-y-8 py-6">
            <div className="relative inline-block">
            <div className="absolute -inset-4 bg-blue-500/20 blur-2xl rounded-full animate-pulse" />
            <div className="relative bg-white p-8 rounded-3xl shadow-2xl">
              {depositData?.pay_address && (
                <QRCodeSVG 
                  value={depositData.pay_address} 
                  size={220}
                  level="H"
                  includeMargin={true}
                />
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-3xl font-display uppercase tracking-tight text-white">Scan to Deposit</h3>
            <p className="text-gray-500 text-sm font-light tracking-wide max-w-xs mx-auto leading-relaxed">
              Transfer exactly <span className="text-blue-400 font-bold">{depositData?.pay_amount} USDT</span> via the <span className="text-white font-bold">TRC20 Network</span> to the address below.
            </p>
          </div>

          <div className="space-y-5">
            <div className="cyber-card p-6 text-left relative group hover:bg-white/[0.05] transition-all">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3">Target Address</div>
              <div className="font-mono text-sm break-all pr-14 text-blue-400 leading-relaxed">
                {depositData?.pay_address}
              </div>
              <button 
                onClick={() => copyToClipboard(depositData?.pay_address)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-white/[0.03] hover:bg-white/[0.08] rounded-xl transition-all"
              >
                {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-gray-400" />}
              </button>
            </div>

            <div className="cyber-card p-6 text-left relative group hover:bg-white/[0.05] transition-all">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3">Exact Amount</div>
              <div className="font-display text-3xl text-white">
                {depositData?.pay_amount} <span className="text-sm font-sans text-gray-500">USDT</span>
              </div>
              <button 
                onClick={() => copyToClipboard(depositData?.pay_amount?.toString())}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-white/[0.03] hover:bg-white/[0.08] rounded-xl transition-all"
              >
                {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-gray-400" />}
              </button>
            </div>
          </div>

          <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-4 text-left">
            <AlertCircle className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-300/80 leading-relaxed font-medium uppercase tracking-wider">
              CRITICAL: Only send <span className="text-white font-bold underline">USDT via TRC20</span>. Assets sent via other networks (ERC20, BEP20, etc.) will be <span className="text-red-400 font-bold">permanently lost</span>.
            </div>
          </div>

          <button
            onClick={() => setShowDepositModal(false)}
            className="w-full py-5 bg-white text-black font-bold rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-[0.2em] text-xs"
          >
            I have completed the transfer
          </button>
          
          <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest">
            <Globe className="w-3 h-3" />
            Waiting for network confirmation...
          </div>
        </div>
      </Modal>

      {/* Withdrawal Confirmation Modal */}
      <Modal
        isOpen={showWithdrawConfirm}
        onClose={() => setShowWithdrawConfirm(false)}
        title="Confirm Withdrawal"
        className="bg-[#0a0a0a] border border-white/[0.08]"
      >
        <div className="space-y-8 py-6">
          <div className="p-8 bg-white/[0.03] border border-white/[0.08] rounded-2xl space-y-5">
            <div className="flex justify-between items-center">
              <span className="text-base text-gray-500">Amount</span>
              <span className="text-xl font-bold text-white">{parseFloat(withdrawAmount).toFixed(2)} USDT</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base text-gray-500">Network Fee</span>
              <span className="text-base font-bold text-blue-400">{NETWORK_FEE.toFixed(2)} USDT</span>
            </div>
            <div className="pt-5 border-t border-white/[0.05] flex justify-between items-center">
              <span className="text-base font-bold text-gray-400">Total Deducted</span>
              <span className="text-2xl font-bold text-white">{(parseFloat(withdrawAmount) + NETWORK_FEE).toFixed(2)} USDT</span>
            </div>
          </div>

          <div className="p-8 bg-white/[0.03] border border-white/[0.08] rounded-2xl space-y-3">
            <div className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Recipient Address</div>
            <div className="font-mono text-sm text-blue-400 break-all leading-relaxed">
              {withdrawAddress}
            </div>
            <div className="text-[11px] font-bold text-gray-600 uppercase tracking-widest pt-3">Network</div>
            <div className="text-sm text-white font-bold">TRON (TRC20)</div>
          </div>

          <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/70 leading-relaxed font-medium uppercase tracking-wider">
              Warning: Ensure the recipient address is correct. Blockchain transactions are irreversible.
            </p>
          </div>

          <div className="flex gap-5">
            <button
              onClick={() => setShowWithdrawConfirm(false)}
              className="flex-1 py-5 bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold rounded-xl transition-all uppercase tracking-widest text-xs"
            >
              Cancel
            </button>
            <button
              onClick={confirmWithdraw}
              disabled={isWithdrawing}
              className="flex-[2] py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20"
            >
              {isWithdrawing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Withdrawal'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Withdrawal Success Modal */}
      <Modal
        isOpen={showWithdrawSuccess}
        onClose={() => setShowWithdrawSuccess(false)}
        title="Withdrawal Initiated"
        className="bg-[#0a0a0a] border border-white/[0.08]"
      >
        <div className="text-center space-y-10 py-8">
          <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>

          <div className="space-y-3">
            <h3 className="text-3xl font-display uppercase tracking-tight text-white">Success</h3>
            <p className="text-gray-500 text-sm font-light tracking-wide max-w-xs mx-auto leading-relaxed">
              Your withdrawal request has been submitted to the network. It will be processed shortly.
            </p>
          </div>

          <div className="cyber-card p-8 space-y-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Transaction Hash</span>
              <span className="text-blue-400 font-mono">{withdrawTxHash.slice(0, 8)}...{withdrawTxHash.slice(-8)}</span>
            </div>
            <a
              href={`https://tronscan.org/#/transaction/${withdrawTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-5 bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs border border-white/[0.08]"
            >
              View on Tronscan
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>

          <button
            onClick={() => setShowWithdrawSuccess(false)}
            className="w-full py-6 bg-blue-600 text-white font-bold rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-[0.2em] text-sm shadow-lg shadow-blue-600/20"
          >
            Close
          </button>
        </div>
      </Modal>
      </div>
    </div>
  );
}
