import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowLeft, 
  Zap, 
  TrendingUp, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  MoreVertical,
  Pause,
  Play
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { supabase } from '../lib/supabase';
import { cn, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ConfirmationModal from '../components/ConfirmationModal';

interface Ad {
  id: string;
  user_id: string;
  type: 'buy' | 'sell';
  asset: string;
  fiat: string;
  price: number;
  min_limit: number;
  max_limit: number;
  payment_methods: string[];
  terms: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export default function MyAds() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [adToDelete, setAdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyAds();
    }
  }, [user]);

  const fetchMyAds = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Error fetching my ads:', error);
      toast.error('Failed to load your advertisements');
    } finally {
      setLoading(false);
    }
  };

  const toggleAdStatus = async (adId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('ads')
        .update({ status: newStatus })
        .eq('id', adId)
        .eq('user_id', user?.id);

      if (error) throw error;
      setAds(prev => prev.map(ad => ad.id === adId ? { ...ad, status: newStatus as any } : ad));
      toast.success(`Ad marked as ${newStatus}`);
    } catch (error) {
      console.error('Error toggling ad status:', error);
      toast.error('Failed to update ad status');
    }
  };

  const handleDeleteAd = async () => {
    if (!adToDelete || !user) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('ads')
        .delete()
        .eq('id', adToDelete)
        .eq('user_id', user?.id);

      if (error) throw error;
      setAds(prev => prev.filter(ad => ad.id !== adToDelete));
      toast.success('Advertisement deleted successfully');
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting ad:', error);
      toast.error('Failed to delete advertisement');
    } finally {
      setIsDeleting(false);
      setAdToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-display font-bold text-white">My Advertisements</h1>
              <p className="text-gray-400 mt-1">Manage your active P2P listings and trade terms.</p>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/p2p')}
            className="btn-primary"
          >
            <Plus className="w-5 h-5" />
            Create New Ad
          </button>
        </div>

        {loading ? (
          <div className="card p-20 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-brand mb-4" />
            <p className="text-sm text-gray-500">Loading your ads...</p>
          </div>
        ) : ads.length === 0 ? (
          <div className="card p-20 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Ads Found</h3>
            <p className="text-gray-500 mb-8">You haven't posted any advertisements yet.</p>
            <button 
              onClick={() => navigate('/p2p')}
              className="px-8 py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand/90 transition-all"
            >
              Post Your First Ad
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {ads.map((ad) => (
              <motion.div
                key={ad.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6 hover:border-white/20 transition-all group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center font-bold",
                      ad.type === 'buy' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {ad.type === 'buy' ? 'BUY' : 'SELL'}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-lg font-bold text-white">₹{ad.price.toFixed(2)}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest",
                          ad.status === 'active' ? "bg-green-500/10 text-green-500" : "bg-gray-500/10 text-gray-500"
                        )}>
                          {ad.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        <span>Limit: {formatCurrency(ad.min_limit)} - {formatCurrency(ad.max_limit)}</span>
                        <span>•</span>
                        <span>{ad.payment_methods.join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleAdStatus(ad.id, ad.status)}
                      className={cn(
                        "p-3 rounded-xl transition-all border",
                        ad.status === 'active' 
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20" 
                          : "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
                      )}
                      title={ad.status === 'active' ? 'Pause Ad' : 'Resume Ad'}
                    >
                      {ad.status === 'active' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <button 
                      onClick={() => {
                        setAdToDelete(ad.id);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all border border-red-500/20"
                      title="Delete Ad"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-12 p-6 bg-brand/5 border border-brand/10 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-brand shadow-sm border border-white/5">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Important Note</p>
            <p className="text-xs text-gray-400">Ensure your payment methods are up to date. Inactive ads will not be visible in the marketplace.</p>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setAdToDelete(null);
        }}
        onConfirm={handleDeleteAd}
        loading={isDeleting}
        title="Delete Advertisement"
        message="Are you sure you want to delete this advertisement? This action cannot be undone and will remove it from the marketplace."
        confirmText="Delete Ad"
        variant="danger"
      />
    </div>
  );
}
