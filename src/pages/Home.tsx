import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Globe, 
  Lock, 
  ArrowLeftRight,
  TrendingUp,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

import { supabase } from '../lib/supabase';

export default function Home() {
  const [amount, setAmount] = useState('10000');
  const [usdt, setUsdt] = useState('112.36');
  const [rate, setRate] = useState(89.00);

  useEffect(() => {
    fetchRate();
  }, []);

  const fetchRate = async () => {
    try {
      const { data } = await supabase.from('app_settings').select('buy_rate').limit(1);
      if (data && data.length > 0) setRate(data[0].buy_rate);
    } catch (error) {
      console.error('Error fetching rate:', error);
    }
  };

  useEffect(() => {
    const val = parseFloat(amount);
    if (!isNaN(val)) {
      setUsdt((val / rate).toFixed(2));
    }
  }, [amount, rate]);

  const features = [
    {
      title: "Secure Settlement",
      desc: "Bank-grade security with automated escrow protection for every trade.",
      icon: ShieldCheck,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "Instant Execution",
      desc: "Proprietary matching engine ensures your trades settle in seconds.",
      icon: Zap,
      color: "text-amber-600",
      bg: "bg-amber-50"
    },
    {
      title: "Global Liquidity",
      desc: "Access deep liquidity pools across multiple fiat-to-crypto pairs.",
      icon: Globe,
      color: "text-indigo-600",
      bg: "bg-indigo-50"
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-brand/5 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-bold uppercase tracking-widest mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                </span>
                Live Market Active
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-display font-bold text-white tracking-tight leading-[1.1] mb-8">
                The Future of <span className="text-brand">P2P Settlements</span> is Here.
              </h1>
              
              <p className="text-xl text-gray-400 leading-relaxed mb-10 max-w-xl">
                Experience the most secure, automated, and lightning-fast P2P protocol for fiat-to-crypto settlements. No middlemen, just pure efficiency.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Link to="/p2p" className="btn-primary w-full sm:w-auto px-10 py-4 text-lg shadow-lg shadow-brand/20">
                  Start Trading
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link to="/dashboard" className="btn-secondary w-full sm:w-auto px-10 py-4 text-lg">
                  View Dashboard
                </Link>
              </div>

              <div className="mt-12 flex items-center gap-8 border-t border-white/5 pt-8">
                <div>
                  <p className="text-2xl font-bold text-white">$2.4M+</p>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">24h Volume</p>
                </div>
                <div className="w-px h-10 bg-white/5" />
                <div>
                  <p className="text-2xl font-bold text-white">12k+</p>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Active Traders</p>
                </div>
                <div className="w-px h-10 bg-white/5" />
                <div>
                  <p className="text-2xl font-bold text-white">99.9%</p>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Success Rate</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="card p-8 shadow-2xl shadow-brand/10 relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold text-white">Settlement Calculator</h3>
                  <div className="flex items-center gap-1 text-green-500 bg-green-500/10 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-green-500/20">
                    <TrendingUp className="w-3 h-3" />
                    Live Rate
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">You Pay (INR)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="input-field text-2xl font-bold pr-16"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">INR</span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-gray-500">
                      <ArrowLeftRight className="w-5 h-5 rotate-90" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">You Receive (USDT)</label>
                    <div className="relative">
                      <div className="input-field bg-white/5 text-2xl font-bold pr-16 text-brand">
                        {usdt}
                      </div>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-brand">USDT</span>
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 rounded-xl space-y-2 border border-white/5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Exchange Rate</span>
                      <span className="font-medium text-white">1 USDT = ₹{rate}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Network Fee</span>
                      <span className="font-medium text-green-500">Zero Fee</span>
                    </div>
                  </div>

                  <Link to="/p2p" className="btn-primary w-full py-4 shadow-lg shadow-brand/20">
                    Execute Settlement
                  </Link>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-brand/5 rounded-full blur-3xl" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-[10px] font-bold text-brand uppercase tracking-[0.3em] mb-4">The Process</h2>
            <h3 className="text-4xl font-display font-bold text-white mb-6">Simple. Secure. Seamless.</h3>
            <p className="text-gray-400">Three steps to settle your digital assets with absolute confidence.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                title: "Choose an Offer",
                desc: "Browse our P2P marketplace and select a verified merchant that matches your requirements."
              },
              {
                step: "02",
                title: "Make Payment",
                desc: "Send fiat currency directly to the merchant using your preferred payment method."
              },
              {
                step: "03",
                title: "Receive Assets",
                desc: "Once payment is confirmed, assets are automatically released from escrow to your wallet."
              }
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-display font-bold text-white/5 absolute -top-8 -left-4 -z-10">{item.step}</div>
                <h4 className="text-xl font-bold text-white mb-4">{item.title}</h4>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-[10px] font-bold text-brand uppercase tracking-[0.3em] mb-4">Core Protocol</h2>
            <h3 className="text-4xl font-display font-bold text-white mb-6">Built for the next generation of digital finance.</h3>
            <p className="text-gray-400">Our protocol combines decentralized trust with centralized efficiency to provide the ultimate settlement experience.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="card p-10 hover:shadow-xl hover:shadow-brand/5 transition-all group">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110", "bg-brand/10", "text-brand")}>
                  <f.icon className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-white mb-4">{f.title}</h4>
                <p className="text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-[10px] font-bold text-brand uppercase tracking-[0.3em] mb-4">Security First</h2>
              <h3 className="text-4xl font-display font-bold text-white mb-8">Uncompromising safety for every transaction.</h3>
              
              <div className="space-y-6">
                {[
                  "Automated Escrow Protection",
                  "Verified Merchant Network",
                  "Real-time Fraud Detection",
                  "24/7 Dispute Resolution"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-lg font-medium text-gray-300">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-12">
                <Link to="/p2p" className="inline-flex items-center gap-2 text-brand font-bold uppercase tracking-widest text-xs hover:gap-4 transition-all">
                  Learn more about our security
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="card p-6 bg-brand text-white border-none shadow-lg shadow-brand/20">
                  <Lock className="w-8 h-8 mb-4 opacity-50" />
                  <p className="text-2xl font-bold mb-1">AES-256</p>
                  <p className="text-xs font-medium opacity-70 uppercase tracking-widest">Encryption</p>
                </div>
                <div className="card p-6">
                  <Globe className="w-8 h-8 mb-4 text-brand opacity-50" />
                  <p className="text-2xl font-bold text-white mb-1">190+</p>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Countries</p>
                </div>
              </div>
              <div className="space-y-4 pt-12">
                <div className="card p-6">
                  <ShieldCheck className="w-8 h-8 mb-4 text-brand opacity-50" />
                  <p className="text-2xl font-bold text-white mb-1">SOC2</p>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Compliant</p>
                </div>
                <div className="card p-6 bg-white/5 text-white border-white/10">
                  <TrendingUp className="w-8 h-8 mb-4 text-brand" />
                  <p className="text-2xl font-bold mb-1">24/7</p>
                  <p className="text-xs font-medium opacity-70 uppercase tracking-widest">Monitoring</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-brand relative overflow-hidden text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-8">Ready to experience the future?</h2>
          <p className="text-white/80 text-xl mb-12 max-w-2xl mx-auto">Join thousands of traders who have already switched to the most efficient P2P protocol in the market.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/p2p" className="w-full sm:w-auto px-12 py-5 bg-white text-brand font-bold rounded-2xl hover:bg-gray-50 transition-all shadow-xl">
              Create Account
            </Link>
            <Link to="/dashboard" className="w-full sm:w-auto px-12 py-5 bg-brand-dark text-white font-bold rounded-2xl hover:bg-black transition-all border border-white/20">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
