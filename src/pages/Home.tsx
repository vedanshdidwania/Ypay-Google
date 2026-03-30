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
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import HeroBackground from '../components/HeroBackground';
import NeuralNetwork from '../components/NeuralNetwork';
import { TiltCard } from '../components/TiltCard';
import FloatingUSDT from '../components/FloatingUSDT';

import { supabase } from '../lib/supabase';

gsap.registerPlugin(ScrollTrigger);

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

  useEffect(() => {
    // GSAP animations for sections
    const sections = gsap.utils.toArray('.gsap-reveal');
    sections.forEach((section: any) => {
      gsap.fromTo(section, 
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        }
      );
    });

    // Staggered reveal for feature cards
    gsap.fromTo('.gsap-feature-card',
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.gsap-feature-grid',
          start: 'top 80%'
        }
      }
    );

    // Parallax effect for hero text
    gsap.to('.hero-parallax', {
      y: -100,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero-section',
        start: 'top top',
        end: 'bottom top',
        scrub: true
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

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
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden hero-section">
        <HeroBackground />
        <NeuralNetwork />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-brand/5 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative hero-parallax">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                </span>
                Live Market Active
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold text-white tracking-tight leading-[1.1] mb-6 sm:mb-8">
                The Future of <span className="text-brand">P2P Settlements</span> is Here.
              </h1>
              
              <p className="text-lg sm:text-xl lg:text-2xl text-gray-400 leading-relaxed mb-8 sm:mb-10 max-w-xl mx-auto lg:mx-0">
                Experience the most secure, automated, and lightning-fast P2P protocol for fiat-to-crypto settlements. No middlemen, just pure efficiency.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link to="/p2p" className="btn-primary w-full sm:w-auto px-10 sm:px-12 py-4 sm:py-5 text-lg sm:text-xl shadow-lg shadow-brand/20">
                  Start Trading
                  <ArrowRight className="w-6 h-6" />
                </Link>
                <Link to="/dashboard" className="btn-secondary w-full sm:w-auto px-10 sm:px-12 py-4 sm:py-5 text-lg sm:text-xl">
                  View Dashboard
                </Link>
              </div>

              <div className="mt-12 sm:mt-14 flex flex-wrap items-center justify-center lg:justify-start gap-6 sm:gap-10 border-t border-white/5 pt-10">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-white">$2.4M+</p>
                  <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">24h Volume</p>
                </div>
                <div className="hidden sm:block w-px h-12 bg-white/5" />
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-white">12k+</p>
                  <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">Active Traders</p>
                </div>
                <div className="hidden sm:block w-px h-12 bg-white/5" />
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-white">99.9%</p>
                  <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">Success Rate</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative flex items-center justify-center"
            >
              <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
                <div className="w-[500px] h-[500px] opacity-60">
                  <FloatingUSDT />
                </div>
              </div>
              
              <TiltCard className="relative z-20 lg:w-[450px]">
                <div className="card p-6 sm:p-10 shadow-2xl shadow-brand/10">
                  <div className="flex items-center justify-between mb-8 sm:mb-10">
                    <h3 className="text-lg sm:text-xl font-bold text-white">Settlement Calculator</h3>
                    <div className="flex items-center gap-1.5 text-green-500 bg-green-500/10 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest border border-green-500/20">
                      <TrendingUp className="w-4 h-4" />
                      Live Rate
                    </div>
                  </div>

                  <div className="space-y-6 sm:space-y-8">
                    <div>
                      <label className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 sm:mb-3 block">You Pay (INR)</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="input-field text-2xl sm:text-3xl font-bold pr-16 sm:pr-20 py-3.5 sm:py-4"
                        />
                        <span className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-gray-500 text-base sm:text-lg">INR</span>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-gray-500">
                        <ArrowLeftRight className="w-5 h-5 sm:w-6 sm:h-6 rotate-90" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 sm:mb-3 block">You Receive (USDT)</label>
                      <div className="relative">
                        <div className="input-field bg-white/5 text-2xl sm:text-3xl font-bold pr-16 sm:pr-20 py-3.5 sm:py-4 text-brand">
                          {usdt}
                        </div>
                        <span className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-brand text-base sm:text-lg">USDT</span>
                      </div>
                    </div>

                    <div className="p-4 sm:p-6 bg-white/5 rounded-2xl space-y-3 border border-white/5">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-500">Exchange Rate</span>
                        <span className="font-medium text-white">1 USDT = ₹{rate}</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-500">Network Fee</span>
                        <span className="font-medium text-green-500">Zero Fee</span>
                      </div>
                    </div>

                    <Link to="/p2p" className="btn-primary w-full py-4 sm:py-5 shadow-lg shadow-brand/20 text-base sm:text-lg">
                      Execute Settlement
                    </Link>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 border-y border-white/5 gsap-reveal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-24">
            <h2 className="text-xs sm:text-sm font-bold text-brand uppercase tracking-[0.3em] mb-6">The Process</h2>
            <h3 className="text-5xl sm:text-6xl font-display font-bold text-white mb-8">Simple. Secure. Seamless.</h3>
            <p className="text-lg sm:text-xl text-gray-400">Three steps to settle your digital assets with absolute confidence.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-16">
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
                <div className="text-7xl sm:text-8xl font-display font-bold text-white/5 absolute -top-10 -left-6 -z-10">{item.step}</div>
                <h4 className="text-2xl sm:text-3xl font-bold text-white mb-6">{item.title}</h4>
                <p className="text-lg sm:text-xl text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Bento Grid */}
      <section className="py-24 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-24 gsap-reveal">
            <h2 className="text-xs sm:text-sm font-bold text-brand uppercase tracking-[0.3em] mb-6">Core Protocol</h2>
            <h3 className="text-5xl sm:text-6xl font-display font-bold text-white mb-8">Built for the next generation of digital finance.</h3>
            <p className="text-lg sm:text-xl text-gray-400">Our protocol combines decentralized trust with centralized efficiency to provide the ultimate settlement experience.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 gsap-feature-grid">
            {/* Large Card */}
            <TiltCard className="md:col-span-2 gsap-feature-card">
              <div className="card p-12 hover:shadow-xl hover:shadow-brand/5 transition-all group relative overflow-hidden h-full">
                <div className="relative z-10">
                  <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-10 transition-transform group-hover:scale-110", "bg-brand/10", "text-brand")}>
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h4 className="text-3xl sm:text-4xl font-bold text-white mb-6">Bank-Grade Escrow</h4>
                  <p className="text-xl text-gray-400 leading-relaxed max-w-md">Our automated escrow protocol ensures that your assets are only released when payment is verified. Zero trust required, absolute security guaranteed.</p>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -mr-32 -mt-32 transition-all group-hover:bg-brand/10" />
              </div>
            </TiltCard>

            {/* Small Card */}
            <TiltCard className="gsap-feature-card">
              <div className="card p-12 hover:shadow-xl hover:shadow-brand/5 transition-all group h-full">
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-10 transition-transform group-hover:scale-110", "bg-brand/10", "text-brand")}>
                  <Zap className="w-8 h-8" />
                </div>
                <h4 className="text-2xl sm:text-3xl font-bold text-white mb-6">Instant Matching</h4>
                <p className="text-lg text-gray-400 leading-relaxed">Proprietary engine matches you with the best rates in milliseconds.</p>
              </div>
            </TiltCard>

            {/* Small Card */}
            <TiltCard className="gsap-feature-card">
              <div className="card p-12 hover:shadow-xl hover:shadow-brand/5 transition-all group h-full">
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-10 transition-transform group-hover:scale-110", "bg-brand/10", "text-brand")}>
                  <Globe className="w-8 h-8" />
                </div>
                <h4 className="text-2xl sm:text-3xl font-bold text-white mb-6">Global Reach</h4>
                <p className="text-lg text-gray-400 leading-relaxed">Access 50+ fiat currencies and 190+ countries seamlessly.</p>
              </div>
            </TiltCard>

            {/* Large Card */}
            <TiltCard className="md:col-span-2 gsap-feature-card">
              <div className="card p-12 hover:shadow-xl hover:shadow-brand/5 transition-all group relative overflow-hidden h-full">
                <div className="relative z-10">
                  <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-10 transition-transform group-hover:scale-110", "bg-brand/10", "text-brand")}>
                    <TrendingUp className="w-8 h-8" />
                  </div>
                  <h4 className="text-3xl sm:text-4xl font-bold text-white mb-6">Real-time Analytics</h4>
                  <p className="text-xl text-gray-400 leading-relaxed max-w-md">Track your trading performance, market trends, and settlement history with our advanced analytics suite.</p>
                </div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -mr-32 -mb-32 transition-all group-hover:bg-brand/10" />
              </div>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 gsap-reveal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-brand uppercase tracking-[0.3em] mb-6">Security First</h2>
              <h3 className="text-4xl md:text-5xl font-display font-bold text-white mb-10">Uncompromising safety for every transaction.</h3>
              
              <div className="space-y-8">
                {[
                  "Automated Escrow Protection",
                  "Verified Merchant Network",
                  "Real-time Fraud Detection",
                  "24/7 Dispute Resolution"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-5">
                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <span className="text-lg md:text-xl font-medium text-gray-300">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-14">
                <Link to="/p2p" className="inline-flex items-center gap-3 text-brand font-bold uppercase tracking-widest text-xs md:text-sm hover:gap-5 transition-all">
                  Learn more about our security
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="space-y-4 sm:pt-12">
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

      {/* Global Reach Section */}
      <section className="py-24 bg-brand/5 relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/10 rounded-full blur-[120px]" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="aspect-square max-w-[500px] mx-auto relative">
                <div className="absolute inset-0 bg-brand/5 rounded-full blur-3xl animate-pulse" />
                <div className="relative z-10 w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-8xl font-display font-bold text-brand mb-4">190+</div>
                    <div className="text-xl font-bold text-gray-400 uppercase tracking-widest">Countries</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-xs sm:text-sm font-bold text-brand uppercase tracking-[0.3em] mb-6">Global Reach</h2>
              <h3 className="text-5xl sm:text-6xl font-display font-bold text-white mb-8">Settling transactions across borders.</h3>
              <p className="text-xl text-gray-400 mb-10 leading-relaxed">
                Ypay's protocol is designed for the global economy. We connect local fiat markets with the global crypto liquidity pool, ensuring seamless settlements in over 190 countries.
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-4xl font-bold text-white mb-2">190+</p>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Countries Supported</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-white mb-2">50+</p>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Fiat Currencies</p>
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
          <h2 className="text-5xl md:text-6xl font-display font-bold mb-10">Ready to experience the future?</h2>
          <p className="text-white/80 text-xl sm:text-2xl mb-14 max-w-3xl mx-auto">Join thousands of traders who have already switched to the most efficient P2P protocol in the market.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/p2p" className="w-full sm:w-auto px-14 py-6 bg-white text-brand font-bold rounded-2xl hover:bg-gray-50 transition-all shadow-xl text-lg">
              Create Account
            </Link>
            <Link to="/dashboard" className="w-full sm:w-auto px-14 py-6 bg-brand-dark text-white font-bold rounded-2xl hover:bg-black transition-all border border-white/20 text-lg">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
