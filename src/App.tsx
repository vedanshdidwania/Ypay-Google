/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/useAuth';
import { isSupabaseConfigured } from './lib/supabase';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Buy from './pages/Buy';
import Sell from './pages/Sell';
import P2P from './pages/P2P';
import P2POrder from './pages/P2POrder';
import P2PCreateOrder from './pages/P2PCreateOrder';
import MyAds from './pages/MyAds';
import Wallet from './pages/Wallet';
import KYC from './pages/KYC';
import Info from './pages/Info';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Support from './components/Support';
import { AlertTriangle } from 'lucide-react';

import ErrorBoundary from './components/ErrorBoundary';

const ConfigWarning = () => (
  <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-yellow-500/10 border border-yellow-500/20 p-8 rounded-3xl text-center">
      <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-white mb-4">Configuration Required</h2>
      <p className="text-gray-400 mb-6">
        Please configure your Supabase environment variables to start using Ypay.
      </p>
      <div className="space-y-2 text-left bg-black/40 p-4 rounded-xl font-mono text-xs text-gray-500">
        <p>VITE_SUPABASE_URL</p>
        <p>VITE_SUPABASE_ANON_KEY</p>
      </div>
      <p className="mt-6 text-sm text-gray-500">
        Add these to the <strong>Secrets</strong> panel in AI Studio.
      </p>
    </div>
  </div>
);

const PrivateRoute = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/auth" />;
  if (adminOnly && !profile?.is_admin) return <Navigate to="/dashboard" />;
  if (profile?.is_disabled) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">Your account has been disabled.</div>;

  return <>{children}</>;
};

export default function App() {
  if (!isSupabaseConfigured) {
    return <ConfigWarning />;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 relative">
            <div className="cyber-noise" />
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/p2p" element={<P2P />} />
              <Route path="/p2p/create/:adId" element={<PrivateRoute><P2PCreateOrder /></PrivateRoute>} />
              <Route path="/p2p/order/:id" element={<PrivateRoute><P2POrder /></PrivateRoute>} />
              <Route path="/p2p/my-ads" element={<PrivateRoute><MyAds /></PrivateRoute>} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/wallet" element={<PrivateRoute><Wallet /></PrivateRoute>} />
              <Route path="/kyc" element={<PrivateRoute><KYC /></PrivateRoute>} />
              <Route path="/buy" element={<PrivateRoute><Buy /></PrivateRoute>} />
              <Route path="/sell" element={<PrivateRoute><Sell /></PrivateRoute>} />
              <Route path="/admin/*" element={<PrivateRoute adminOnly><Admin /></PrivateRoute>} />
              <Route path="/info/:slug" element={<Info />} />
              {/* Redirect old paths to new info route */}
              <Route path="/about" element={<Navigate to="/info/about" replace />} />
              <Route path="/careers" element={<Navigate to="/info/careers" replace />} />
              <Route path="/contact" element={<Navigate to="/info/contact" replace />} />
              <Route path="/blog" element={<Navigate to="/info/blog" replace />} />
              <Route path="/terms" element={<Navigate to="/info/terms" replace />} />
              <Route path="/privacy" element={<Navigate to="/info/privacy" replace />} />
              <Route path="/cookie-policy" element={<Navigate to="/info/cookie-policy" replace />} />
              <Route path="/security" element={<Navigate to="/info/security" replace />} />
              <Route path="/support" element={<Navigate to="/info/support" replace />} />
              <Route path="/api-docs" element={<Navigate to="/info/api-docs" replace />} />
              <Route path="/status" element={<Navigate to="/info/status" replace />} />
              <Route path="/community" element={<Navigate to="/info/community" replace />} />
            </Routes>
            <Footer />
            <Support />
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
