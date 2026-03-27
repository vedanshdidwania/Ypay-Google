import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';
import { Users, Trophy, Gift, Copy, Check, ArrowRight, TrendingUp, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function Referrals() {
  const { profile } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [stats, setStats] = useState({
    l1Count: 0,
    l2Count: 0,
    totalEarnings: 0
  });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const referralLink = profile?.referral_code 
    ? `${window.location.origin}/auth?ref=${profile.referral_code}`
    : 'Loading referral link...';

  useEffect(() => {
    if (profile) {
      fetchReferralData();
    }
  }, [profile]);

  const fetchReferralData = async () => {
    if (!isSupabaseConfigured || !profile) return;
    try {
      // Fetch stats
      const { data: l1Data } = await supabase
        .from('profiles')
        .select('id')
        .eq('referred_by', profile.id);
      
      const { data: l2Data } = await supabase
        .from('profiles')
        .select('id')
        .eq('referred_by_l2', profile.id);

      setStats({
        l1Count: l1Data?.length || 0,
        l2Count: l2Data?.length || 0,
        totalEarnings: (profile.referral_earnings_l1 || 0) + (profile.referral_earnings_l2 || 0)
      });

      // Fetch leaderboard
      const { data: topReferrers } = await supabase
        .from('profiles')
        .select('email, referral_earnings_l1, referral_earnings_l2')
        .order('referral_earnings_l1', { ascending: false })
        .limit(5);

      if (topReferrers) {
        setLeaderboard(topReferrers.map(r => ({
          email: r.email.split('@')[0] + '***@' + r.email.split('@')[1],
          earnings: (r.referral_earnings_l1 || 0) + (r.referral_earnings_l2 || 0)
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!profile?.referral_code) {
      toast.error("Referral link is not ready yet.");
      return;
    }
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      toast.success("Referral code copied!");
    } else {
      toast.error("Referral code is not ready yet.");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="relative mb-16 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand/20 via-brand/5 to-transparent border border-white/10 p-12 md:p-20">
          <div className="relative z-10 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] font-bold uppercase tracking-widest mb-8"
            >
              <Gift className="w-4 h-4" />
              Affiliate Program
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-display font-bold text-white mb-6 leading-[0.9] tracking-tight"
            >
              Earn While Your <br />
              <span className="text-brand">Network Trades.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-gray-400 mb-10 leading-relaxed"
            >
              Invite your community to the most secure P2P platform and earn up to 0.1% commission on every trade they complete. Two-tier rewards for maximum growth.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <div className="flex-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 flex items-center justify-between group">
                <span className="text-sm font-mono text-gray-500 truncate mr-4">{referralLink}</span>
                <button
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
                >
                  {copied ? <Check className="w-5 h-5 text-brand" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <button 
                onClick={copyToClipboard}
                className="btn-primary px-10 py-4 shadow-2xl shadow-brand/20"
              >
                Copy Invite Link
              </button>
              <button 
                onClick={copyCode}
                className="px-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white hover:bg-white/10 transition-all"
              >
                Copy Code
              </button>
            </motion.div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand rounded-full blur-[120px]" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Section */}
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Direct Referrals', value: stats.l1Count, sub: 'Level 1', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { label: 'Network Size', value: stats.l2Count, sub: 'Level 2', icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                { label: 'Total Earnings', value: `$${stats.totalEarnings.toFixed(2)}`, sub: 'USDT Rewards', icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' }
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  className="card p-8 group hover:border-white/20 transition-all"
                >
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <div className="text-3xl font-display font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stat.label}</div>
                  <div className="text-[10px] text-gray-600 mt-1">{stat.sub}</div>
                </motion.div>
              ))}
            </div>

            {/* How it works */}
            <div className="card p-10">
              <h3 className="text-2xl font-display font-bold text-white mb-10">Commission Structure</h3>
              <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="flex gap-6">
                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-brand font-display font-bold text-xl shrink-0">01</div>
                    <div>
                      <h4 className="text-lg font-bold text-white mb-2">Direct (L1) - 0.1%</h4>
                      <p className="text-sm text-gray-400 leading-relaxed">Earn 0.1% of the total trade volume from users who sign up directly using your link.</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-brand font-display font-bold text-xl shrink-0">02</div>
                    <div>
                      <h4 className="text-lg font-bold text-white mb-2">Indirect (L2) - 0.05%</h4>
                      <p className="text-sm text-gray-400 leading-relaxed">Earn an additional 0.05% from users invited by your direct referrals. Build a multi-tier network.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-brand/5 border border-brand/10 rounded-[2rem] p-8 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-brand uppercase tracking-widest">Real-time Settlements</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed italic">
                    "Commissions are calculated on the platform fee and settled instantly into your wallet the moment a trade is completed."
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard Section */}
          <div className="space-y-8">
            <div className="card p-8">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-xl font-display font-bold text-white flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  Top Affiliates
                </h3>
              </div>
              
              <div className="space-y-6">
                {leaderboard.map((user, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + (i * 0.1) }}
                    className="flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all group-hover:scale-110",
                        i === 0 ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" :
                        i === 1 ? "bg-gray-300 text-black" :
                        i === 2 ? "bg-orange-600 text-white" :
                        "bg-white/5 text-gray-500 border border-white/5"
                      )}>
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">{user.email}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Verified Partner</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-500 font-mono font-bold">${user.earnings.toFixed(2)}</div>
                      <div className="text-[8px] text-gray-600 uppercase tracking-widest">Earned</div>
                    </div>
                  </motion.div>
                ))}
                
                {leaderboard.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-700">
                      <Users className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-gray-600 font-bold uppercase tracking-widest">No data available</p>
                  </div>
                )}
              </div>

              <button className="w-full mt-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2 group">
                Full Leaderboard
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Support Card */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2rem] p-8 text-white relative overflow-hidden group">
              <div className="relative z-10">
                <h4 className="text-xl font-bold mb-2">Need Help?</h4>
                <p className="text-sm text-blue-100 mb-6 opacity-80">Our affiliate managers are here to help you grow your network.</p>
                <button className="w-full py-3 bg-white text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-50 transition-all">
                  Contact Support
                </button>
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
