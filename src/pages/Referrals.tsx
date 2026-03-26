import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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

  const referralLink = `${window.location.origin}/auth?ref=${profile?.referral_code}`;

  useEffect(() => {
    if (profile) {
      fetchReferralData();
    }
  }, [profile]);

  const fetchReferralData = async () => {
    try {
      // Fetch stats
      const { data: l1Data } = await supabase
        .from('profiles')
        .select('id')
        .eq('referred_by', profile?.id);
      
      const { data: l2Data } = await supabase
        .from('profiles')
        .select('id')
        .eq('referred_by_l2', profile?.id);

      setStats({
        l1Count: l1Data?.length || 0,
        l2Count: l2Data?.length || 0,
        totalEarnings: (profile?.referral_earnings_l1 || 0) + (profile?.referral_earnings_l2 || 0)
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
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4">Referral Program</h1>
        <p className="text-gray-400 max-w-2xl">
          Invite your friends and earn commissions on every trade they complete. 
          Get 0.1% from direct referrals and 0.05% from their referrals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stats & Link */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-3xl">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-6">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-3xl font-bold mb-1">{stats.l1Count}</div>
              <div className="text-sm text-gray-500">Direct Referrals (L1)</div>
            </div>
            <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-3xl">
              <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 mb-6">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="text-3xl font-bold mb-1">{stats.l2Count}</div>
              <div className="text-sm text-gray-500">Indirect Referrals (L2)</div>
            </div>
            <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-3xl">
              <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 mb-6">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="text-3xl font-bold mb-1">${stats.totalEarnings.toFixed(2)}</div>
              <div className="text-sm text-gray-500">Total Earnings</div>
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-3xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Gift className="w-5 h-5 text-yellow-500" />
              Your Referral Link
            </h3>
            <div className="flex gap-4">
              <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm text-gray-400 truncate">
                {referralLink}
              </div>
              <button
                onClick={copyToClipboard}
                className="bg-white text-black px-8 rounded-2xl font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 p-8 rounded-3xl">
            <h3 className="text-xl font-bold mb-4">How it works</h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">1</div>
                <div>
                  <h4 className="font-bold mb-1">Share your link</h4>
                  <p className="text-sm text-gray-400">Send your unique referral link to friends, family, or your community.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">2</div>
                <div>
                  <h4 className="font-bold mb-1">They start trading</h4>
                  <p className="text-sm text-gray-400">When they sign up and complete P2P trades, you earn commissions instantly.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">3</div>
                <div>
                  <h4 className="font-bold mb-1">Earn from their network</h4>
                  <p className="text-sm text-gray-400">If your referrals invite others, you also earn a 0.05% commission from those trades!</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="space-y-8">
          <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-3xl">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Top Earners
            </h3>
            <div className="space-y-6">
              {leaderboard.map((user, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                      i === 0 ? "bg-yellow-500 text-black" :
                      i === 1 ? "bg-gray-300 text-black" :
                      i === 2 ? "bg-orange-600 text-white" :
                      "bg-white/5 text-gray-500"
                    )}>
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{user.email}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">Affiliate</div>
                    </div>
                  </div>
                  <div className="text-green-500 font-bold">${user.earnings.toFixed(2)}</div>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No data available yet
                </div>
              )}
            </div>
            <button className="w-full mt-8 py-4 border border-white/10 rounded-2xl text-sm font-bold hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
              View Full Leaderboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
