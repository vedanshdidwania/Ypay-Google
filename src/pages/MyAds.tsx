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
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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
  pricing_type: 'fixed' | 'dynamic';
  margin: number;
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
  const adToDeleteRef = React.useRef<string | null>(null);
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
    const targetId = adToDeleteRef.current;
    console.log('handleDeleteAd triggered. targetId from ref:', targetId, 'adToDelete from state:', adToDelete);

    if (!isSupabaseConfigured) {
      toast.error('Supabase is not configured. Please check your environment variables.');
      setShowDeleteConfirm(false);
      return;
    }

    if (!targetId || !user) {
      console.warn('Cannot delete ad: targetId or user is missing', { 
        targetId, 
        stateId: adToDelete,
        userId: user?.id 
      });
      setShowDeleteConfirm(false);
      return;
    }

    try {
      setIsDeleting(true);
      console.log('Attempting to delete ad ID:', targetId, 'for user:', user.id);
      
      const { error, count } = await supabase
        .from('ads')
        .delete({ count: 'exact' })
        .eq('id', targetId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Supabase error during deletion:', error);
        throw error;
      }

      console.log('Delete operation completed. Rows affected:', count);

      if (count === 0) {
        console.warn('No rows were deleted. This could mean the ad was already deleted or the user does not have permission.');
        toast.error('Could not delete the advertisement. It may have been already removed.');
      } else {
        setAds(prev => prev.filter(ad => ad.id !== targetId));
        toast.success('Advertisement deleted successfully');
      }
    } catch (error: any) {
      console.error('Catch block error in handleDeleteAd:', error);
      toast.error(error.message || 'Failed to delete advertisement');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setAdToDelete(null);
      adToDeleteRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] pt-20 sm:pt-24 pb-8 sm:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 mb-10 sm:mb-14">
          <div className="flex items-center gap-4 sm:gap-6">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 sm:p-3 hover:bg-white/5 rounded-lg sm:rounded-xl transition-colors text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-4xl font-display font-bold text-white">My Advertisements</h1>
              <p className="text-xs sm:text-base text-gray-400 mt-1 sm:mt-2">Manage your active P2P listings and trade terms.</p>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/p2p')}
            className="btn-primary w-full sm:w-auto justify-center py-3.5 sm:py-4 px-8"
          >
            <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-sm sm:text-base">Create New Ad</span>
          </button>
        </div>

        {loading ? (
          <div className="card p-12 sm:p-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-brand mb-3 sm:mb-4" />
            <p className="text-[10px] sm:text-sm text-gray-500">Loading your ads...</p>
          </div>
        ) : ads.length === 0 ? (
          <div className="card p-12 sm:p-20 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5 sm:mb-2">No Ads Found</h3>
            <p className="text-[10px] sm:text-sm text-gray-500 mb-6 sm:mb-8">You haven't posted any advertisements yet.</p>
            <button 
              onClick={() => navigate('/p2p')}
              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-brand text-white font-bold rounded-lg sm:rounded-xl hover:bg-brand/90 transition-all text-xs sm:text-sm"
            >
              Post Your First Ad
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {ads.map((ad) => (
              <motion.div
                key={ad.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6 sm:p-8 hover:border-white/20 transition-all group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8">
                  <div className="flex items-center gap-6 sm:gap-8">
                    <div className={cn(
                      "w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-xs sm:text-sm",
                      ad.type === 'buy' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {ad.type === 'buy' ? 'BUY' : 'SELL'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 sm:gap-4 mb-1.5 sm:mb-2">
                        <span className="text-xl sm:text-2xl font-bold text-white">₹{ad.price.toFixed(2)}</span>
                        <span className={cn(
                          "px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest",
                          ad.status === 'active' ? "bg-green-500/10 text-green-500" : "bg-gray-500/10 text-gray-500"
                        )}>
                          {ad.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <span>Limit: {formatCurrency(ad.min_limit)} - {formatCurrency(ad.max_limit)}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="truncate max-w-[200px] sm:max-w-none">{ad.payment_methods.join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 sm:pt-0 border-t sm:border-none border-white/5">
                    <button 
                      onClick={() => toggleAdStatus(ad.id, ad.status)}
                      className={cn(
                        "flex-1 sm:flex-none p-3.5 sm:p-4 rounded-lg sm:rounded-xl transition-all border flex items-center justify-center",
                        ad.status === 'active' 
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20" 
                          : "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
                      )}
                      title={ad.status === 'active' ? 'Pause Ad' : 'Resume Ad'}
                    >
                      {ad.status === 'active' ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6" />}
                      <span className="sm:hidden ml-2 text-xs font-bold uppercase tracking-widest">
                        {ad.status === 'active' ? 'Pause' : 'Resume'}
                      </span>
                    </button>
                    <button 
                      onClick={() => {
                        console.log('Setting ad to delete:', ad.id);
                        adToDeleteRef.current = ad.id;
                        setAdToDelete(ad.id);
                        setShowDeleteConfirm(true);
                      }}
                      className="flex-1 sm:flex-none p-3.5 sm:p-4 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg sm:rounded-xl transition-all border border-red-500/20 flex items-center justify-center"
                      title="Delete Ad"
                    >
                      <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span className="sm:hidden ml-2 text-xs font-bold uppercase tracking-widest">Delete</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-brand/5 border border-brand/10 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/5 rounded-lg sm:rounded-xl flex items-center justify-center text-brand shadow-sm border border-white/5 shrink-0">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-white">Important Note</p>
            <p className="text-[10px] sm:text-xs text-gray-400">Ensure your payment methods are up to date. Inactive ads will not be visible in the marketplace.</p>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          console.log('Closing delete modal');
          setShowDeleteConfirm(false);
          setAdToDelete(null);
          adToDeleteRef.current = null;
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
