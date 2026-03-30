import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Clock, 
  ShieldCheck, 
  MessageSquare, 
  Send, 
  Image as ImageIcon, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Copy,
  ExternalLink,
  Loader2,
  ArrowLeft,
  User,
  Star,
  Lock
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { supabase } from '../lib/supabase';
import { cn, formatCurrency, formatUSDT } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import ConfirmationModal from '../components/ConfirmationModal';

interface P2POrder {
  id: string;
  user_id: string;
  ad_id: string;
  type: 'buy' | 'sell';
  amount_inr: number;
  amount_usdt: number;
  asset: string;
  rate: number;
  platform_fee_amount?: number;
  status: 'pending' | 'paid' | 'completed' | 'cancelled' | 'disputed';
  payment_window?: number;
  created_at: string;
  payment_screenshot_url?: string;
  user_profile?: { 
    id: string; 
    full_name: string; 
    email: string;
    avatar_url?: string;
    total_trades?: number;
    completion_rate?: number;
  };
  ad?: { 
    user_id: string;
    payment_methods: string[];
    ad_profile?: { 
      id: string; 
      full_name: string; 
      email: string;
      avatar_url?: string;
      total_trades?: number;
      completion_rate?: number;
    };
  };
}

interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  message: string;
  image_url?: string;
  attachment_url?: string;
  attachment_type?: 'text' | 'image' | 'file';
  created_at: string;
}

export default function P2POrder() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<P2POrder | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [videoProofUrl, setVideoProofUrl] = useState('');
  const [raisingDispute, setRaisingDispute] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const availableTags = ['Fast Payer', 'Reliable', 'Good Communication', 'Professional', 'Patient'];
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [showConfirmPaid, setShowConfirmPaid] = useState(false);
  const [showConfirmRelease, setShowConfirmRelease] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [sellerPaymentMethods, setSellerPaymentMethods] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchOrder();
      fetchMessages();
      subscribeToMessages();
      subscribeToOrder();
    }
  }, [id]);

  useEffect(() => {
    if (order) {
      fetchSellerPaymentMethods();
    }
  }, [order]);

  const fetchSellerPaymentMethods = async () => {
    if (!order) return;
    const sellerId = order.type === 'sell' ? order.user_id : order.ad?.user_id;
    if (!sellerId) return;

    const { data, error } = await supabase
      .from('user_payment_methods')
      .select('*')
      .eq('user_id', sellerId)
      .eq('is_active', true);
    
    if (data) {
      // Filter by methods accepted in the ad
      const adMethods = order.ad?.payment_methods || [];
      const filtered = data.filter(pm => adMethods.includes(pm.type));
      setSellerPaymentMethods(filtered);
    }
  };

  useEffect(() => {
    if (order && order.status === 'pending' && order.expires_at) {
      const end = new Date(order.expires_at).getTime();
      
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const diff = Math.max(0, Math.floor((end - now) / 1000));
        setTimeLeft(diff);
        if (diff === 0) {
          handleAutoCancel();
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [order]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          user_profile:profiles(id, full_name, email, avatar_url, total_trades, completion_rate),
          ad:ads(
            *,
            ad_profile:profiles(id, full_name, email, avatar_url, total_trades, completion_rate)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`chat_messages:${id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `order_id=eq.${id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToOrder = () => {
    const channel = supabase
      .channel(`order:${id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders',
        filter: `id=eq.${id}`
      }, (payload) => {
        setOrder(prev => prev ? { ...prev, ...payload.new } : null);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    try {
      setSending(true);
      const { error } = await supabase.from('chat_messages').insert({
        order_id: id,
        sender_id: user.id,
        message: newMessage,
        attachment_type: 'text'
      });

      if (error) throw error;
      setNewMessage('');

      // Notify other party about new message
      const otherPartyId = user?.id === buyerId ? sellerId : buyerId;
      await supabase.from('notifications').insert({
        user_id: otherPartyId,
        title: 'New Message',
        message: `You have a new message in order #${id?.slice(0, 8)}`,
        type: 'order_update',
        is_read: false
      });
      
      // Play notification sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
      audio.play().catch(() => {});
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setSending(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('p2p_chat_images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('p2p_chat_images')
        .getPublicUrl(fileName);

      await supabase.from('chat_messages').insert({
        order_id: id,
        sender_id: user.id,
        message: 'Sent an image',
        image_url: publicUrl,
        attachment_url: publicUrl,
        attachment_type: 'image'
      });

      // Notify other party about new image
      const otherPartyId = user?.id === buyerId ? sellerId : buyerId;
      await supabase.from('notifications').insert({
        user_id: otherPartyId,
        title: 'New Image Message',
        message: `You have a new image in order #${id?.slice(0, 8)}`,
        type: 'order_update',
        is_read: false
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handlePaymentProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setProcessingAction(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `proofs/${id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('p2p_chat_images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('p2p_chat_images')
        .getPublicUrl(fileName);

      setPaymentProofUrl(publicUrl);
      
      // Also send it to chat automatically
      await supabase.from('chat_messages').insert({
        order_id: id,
        sender_id: user.id,
        message: 'Sent payment proof',
        image_url: publicUrl,
        attachment_url: publicUrl,
        attachment_type: 'image'
      });

      toast.success('Payment proof uploaded successfully!');
    } catch (error) {
      console.error('Error uploading proof:', error);
      toast.error('Failed to upload proof');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!order) return;
    if (!paymentProofUrl) {
      toast.error('Please upload a payment proof first');
      return;
    }

    try {
      setProcessingAction(true);
      const { error } = await supabase.rpc('mark_p2p_order_as_paid', {
        p_order_id: id,
        p_screenshot_url: paymentProofUrl
      });

      if (error) throw error;

      // Notify seller
      await supabase.from('notifications').insert({
        user_id: sellerId,
        title: 'Payment Received',
        message: `Buyer has marked order #${id?.slice(0, 8)} as paid. Please verify and release funds.`,
        type: 'order_update',
        is_read: false
      });

      toast.success('Order marked as paid. Waiting for seller to release funds.');
      setShowConfirmPaid(false);
    } catch (error: any) {
      console.error('Error marking as paid:', error);
      toast.error(error.message || 'Failed to mark as paid');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReleaseFunds = async () => {
    try {
      setProcessingAction(true);
      const { error } = await supabase.rpc('release_p2p_order', {
        p_order_id: id
      });

      if (error) throw error;
      
      // Notify buyer
      await supabase.from('notifications').insert({
        user_id: buyerId,
        title: 'Funds Released',
        message: `Seller has released the funds for order #${id?.slice(0, 8)}. The assets are now in your wallet.`,
        type: 'order_update',
        is_read: false
      });

      toast.success('Funds released successfully! Trade completed.');
      setShowConfirmRelease(false);
      setShowReviewModal(true);
    } catch (error: any) {
      console.error('Error releasing funds:', error);
      toast.error(error.message || 'Failed to release funds');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !order) return;
    
    try {
      setSubmittingReview(true);
      const revieweeId = user.id === order.user_id ? order.ad?.user_id : order.user_id;
      
      const { error } = await supabase.from('trade_reviews').insert({
        order_id: id,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        rating,
        comment,
        tags: selectedTags
      });

      if (error) throw error;
      
      toast.success('Thank you for your feedback!');
      setShowReviewModal(false);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCancelOrder = async () => {
    try {
      setProcessingAction(true);
      const { error } = await supabase.rpc('cancel_p2p_order', {
        p_order_id: id
      });

      if (error) throw error;

      // Notify other party
      const otherPartyId = user?.id === buyerId ? sellerId : buyerId;
      await supabase.from('notifications').insert({
        user_id: otherPartyId,
        title: 'Order Cancelled',
        message: `Order #${id?.slice(0, 8)} has been cancelled.`,
        type: 'order_update',
        is_read: false
      });

      toast.success('Order cancelled and funds returned to balance.');
      setShowConfirmCancel(false);
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast.error(error.message || 'Failed to cancel order');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleAutoCancel = async () => {
    if (!order || order.status !== 'pending') return;

    try {
      await supabase.rpc('cancel_p2p_order', {
        p_order_id: id
      });
    } catch (error) {
      console.error('Error in auto-cancel:', error);
    }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      toast.error('Please provide a reason for the dispute');
      return;
    }

    try {
      setRaisingDispute(true);
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'disputed' })
        .eq('id', id);

      if (orderError) throw orderError;

      const { error: disputeError } = await supabase.from('p2p_disputes').insert({
        order_id: id,
        raised_by: user?.id,
        reason: disputeReason,
        video_proof_url: videoProofUrl || null
      });

      if (disputeError) throw disputeError;

      // Notify other party
      const otherPartyId = user?.id === buyerId ? sellerId : buyerId;
      await supabase.from('notifications').insert({
        user_id: otherPartyId,
        title: 'Dispute Raised',
        message: `A dispute has been raised for order #${id?.slice(0, 8)}. An admin will review it.`,
        type: 'dispute',
        is_read: false
      });

      toast.success('Dispute raised. An admin will review the trade shortly.');
      setShowDisputeModal(false);
    } catch (error) {
      console.error('Error raising dispute:', error);
      toast.error('Failed to raise dispute');
    } finally {
      setRaisingDispute(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white">Order Not Found</h2>
        <button onClick={() => navigate('/p2p')} className="mt-4 text-brand hover:underline">Back to Marketplace</button>
      </div>
    );
  }

  const buyerId = order.type === 'buy' ? order.user_id : order.ad?.user_id;
  const sellerId = order.type === 'sell' ? order.user_id : order.ad?.user_id;
  const isBuyer = user?.id === buyerId;
  const isSeller = user?.id === sellerId;
  const otherParty = user?.id === order.user_id ? order.ad?.ad_profile : order.user_profile;

  const quickReplies = isBuyer 
    ? ['I have made the payment', 'Please release the funds', 'Checking the details', 'Thank you!']
    : ['Checking the payment', 'Funds released', 'Please provide a screenshot', 'Thank you!'];

  const handleTyping = async () => {
    if (!order || !user) return;
    
    if (!isTyping) {
      setIsTyping(true);
      const updateField = isBuyer ? { buyer_typing: true } : { seller_typing: true };
      await supabase.from('orders').update(updateField).eq('id', id);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false);
      const updateField = isBuyer ? { buyer_typing: false } : { seller_typing: false };
      await supabase.from('orders').update(updateField).eq('id', id);
    }, 3000);
  };

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const EscrowProgress = () => {
    const steps = [
      { id: 'pending', label: 'Order Created', icon: Clock },
      { id: 'paid', label: 'Payment Sent', icon: Send },
      { id: 'completed', label: 'Funds Released', icon: ShieldCheck },
    ];

    const currentStepIndex = steps.findIndex(s => {
      if (order?.status === 'completed') return s.id === 'completed';
      if (order?.status === 'paid') return s.id === 'paid';
      if (order?.status === 'pending') return s.id === 'pending';
      return false;
    });

    return (
      <div className="mb-12">
        <div className="relative flex justify-between">
          {/* Progress Line */}
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 z-0" />
          <motion.div 
            className="absolute top-1/2 left-0 h-0.5 bg-brand -translate-y-1/2 z-0"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />

          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: isActive ? 'var(--brand)' : 'rgba(255, 255, 255, 0.05)',
                    scale: isCurrent ? 1.2 : 1,
                    boxShadow: isCurrent ? '0 0 20px rgba(var(--brand-rgb), 0.4)' : 'none'
                  }}
                  className={cn(
                    "w-10 h-10 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-colors border border-white/10",
                    isActive ? "text-[#050505]" : "text-gray-500"
                  )}
                >
                  <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
                </motion.div>
                <p className={cn(
                  "mt-4 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-center",
                  isActive ? "text-brand" : "text-gray-500"
                )}>
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] pt-20 sm:pt-24 pb-8 sm:pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-10 sm:mb-12">
          <div className="flex items-center gap-4 sm:gap-6">
            <button 
              onClick={() => navigate('/p2p')}
              className="p-2.5 sm:p-3.5 hover:bg-white/5 rounded-xl sm:rounded-2xl transition-colors text-gray-400 hover:text-white border border-white/5"
            >
              <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-white truncate">Order #{order.id.slice(0, 8)}</h1>
                <button 
                  onClick={() => { navigator.clipboard.writeText(order.id); toast.success('Order ID copied!'); }}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-white"
                >
                  <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              <div className="flex items-center gap-3 sm:gap-4 mt-2 sm:mt-3">
                <span className={cn(
                  "px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-widest",
                  order.status === 'pending' ? "bg-yellow-500/10 text-yellow-500" :
                  order.status === 'paid' ? "bg-blue-500/10 text-blue-500" :
                  order.status === 'completed' ? "bg-green-500/10 text-green-500" :
                  order.status === 'disputed' ? "bg-red-500/10 text-red-500" :
                  "bg-gray-500/10 text-gray-500"
                )}>
                  {order.status}
                </span>
                <span className="text-[11px] sm:text-xs text-gray-500 uppercase font-bold tracking-widest truncate">
                  • {isBuyer ? 'Buying' : 'Selling'} {order.asset}
                </span>
              </div>
            </div>
          </div>
        </div>

        <EscrowProgress />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-8 sm:space-y-10">
            <div className="card p-8 sm:p-10 md:p-12">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-10 md:gap-12">
                <div className="space-y-2">
                  <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">Amount to {isBuyer ? 'Pay' : 'Receive'}</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-white">₹{order.amount_inr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">{order.asset} to {isBuyer ? 'Receive' : 'Send'}</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-brand">
                    {order.status === 'completed' && isBuyer 
                      ? (order.amount_usdt - (order.platform_fee_amount || 0)).toFixed(8)
                      : order.amount_usdt.toFixed(8)
                    } {order.asset}
                  </p>
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1 border-t sm:border-none border-white/5 pt-6 sm:pt-0">
                  <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">Price</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-white">₹{order.rate.toFixed(2)}</p>
                </div>
              </div>

              <div className="mt-10 md:mt-12 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                <div className="flex items-center gap-3 px-5 sm:px-6 py-3 sm:py-3.5 bg-green-500/10 border border-green-500/20 rounded-2xl sm:rounded-3xl">
                  <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                  <span className="text-[11px] sm:text-xs font-bold text-green-500 uppercase tracking-widest">Escrow Protected</span>
                </div>
                {order.status === 'completed' && order.platform_fee_amount !== undefined && order.platform_fee_amount > 0 && (
                  <div className="flex items-center justify-between px-5 sm:px-6 py-3 sm:py-3.5 bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl">
                    <span className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">Platform Fee</span>
                    <span className="text-[11px] sm:text-xs font-bold text-white">{order.platform_fee_amount.toFixed(8)} {order.asset}</span>
                  </div>
                )}
              </div>

              {order.status === 'pending' && (
                <div className="mt-10 md:mt-12 p-6 md:p-10 bg-brand/5 border border-brand/10 rounded-3xl sm:rounded-[2.5rem] flex flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-5 sm:gap-8">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-brand/10 rounded-2xl sm:rounded-3xl flex items-center justify-center text-brand shrink-0">
                      <Clock className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div>
                      <p className="text-sm sm:text-lg font-bold text-white">Payment Window</p>
                      <p className="hidden sm:block text-base text-gray-400 mt-1">Please complete the trade within the time limit.</p>
                      <p className="sm:hidden text-xs text-gray-400 mt-1">Complete trade within limit.</p>
                    </div>
                  </div>
                  <div className="text-2xl sm:text-4xl font-mono font-bold text-brand">
                    {formatTime(timeLeft)}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Info */}
            <div className="card p-8 sm:p-10 md:p-12">
              <h3 className="text-lg sm:text-2xl font-display font-bold text-white mb-8 sm:mb-10 uppercase tracking-tight">Payment Information</h3>
              
              {isBuyer ? (
                <div className="space-y-8 sm:space-y-10">
                  <div className="p-5 sm:p-6 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl sm:rounded-3xl flex items-start gap-4 sm:gap-5">
                    <AlertCircle className="w-5 h-5 sm:w-7 sm:h-7 text-yellow-500 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-base text-gray-400 leading-relaxed">
                      Please transfer the exact amount using one of the merchant's supported payment methods. 
                      Do not include any crypto-related terms in the payment remarks.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                    {sellerPaymentMethods.length > 0 ? (
                      sellerPaymentMethods.map((pm) => (
                        <div key={pm.id} className="p-6 sm:p-10 bg-white/5 rounded-3xl sm:rounded-[2.5rem] border border-white/10 space-y-6 sm:space-y-8">
                          <div className="flex items-center justify-between">
                            <span className="text-sm sm:text-lg font-bold text-brand uppercase tracking-widest">{pm.type}</span>
                            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-brand" />
                          </div>
                          
                          <div className="space-y-4 sm:space-y-6">
                            <div>
                              <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Account Name</p>
                              <div className="flex items-center justify-between">
                                <p className="text-sm sm:text-lg font-bold text-white truncate mr-4">{pm.account_name}</p>
                                <button onClick={() => { navigator.clipboard.writeText(pm.account_name); toast.success('Copied!'); }} className="text-gray-500 hover:text-white transition-colors shrink-0">
                                  <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                              </div>
                            </div>

                            {pm.upi_id && (
                              <div>
                                <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">UPI ID</p>
                                <div className="flex items-center justify-between">
                                  <p className="text-sm sm:text-lg font-bold text-white select-all truncate mr-4">{pm.upi_id}</p>
                                  <button onClick={() => { navigator.clipboard.writeText(pm.upi_id); toast.success('Copied!'); }} className="text-gray-500 hover:text-white transition-colors shrink-0">
                                    <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {pm.account_number && (
                              <>
                                <div>
                                  <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Account Number</p>
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm sm:text-lg font-bold text-white select-all truncate mr-4">{pm.account_number}</p>
                                    <button onClick={() => { navigator.clipboard.writeText(pm.account_number); toast.success('Copied!'); }} className="text-gray-500 hover:text-white transition-colors shrink-0">
                                      <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">IFSC Code</p>
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm sm:text-lg font-bold text-white select-all truncate mr-4">{pm.ifsc}</p>
                                    <button onClick={() => { navigator.clipboard.writeText(pm.ifsc); toast.success('Copied!'); }} className="text-gray-500 hover:text-white transition-colors shrink-0">
                                      <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-1 sm:col-span-2 p-10 sm:p-16 bg-white/5 border border-dashed border-white/10 rounded-3xl sm:rounded-[2.5rem] text-center">
                        <p className="text-sm sm:text-lg text-gray-500">No payment details provided by merchant. Please contact them in chat.</p>
                      </div>
                    )}
                  </div>

                  {/* Payment Proof Section */}
                  <div className="mt-10 pt-10 border-t border-white/5">
                    <h4 className="text-sm sm:text-lg font-bold text-white uppercase tracking-widest mb-6">Payment Proof</h4>
                    
                    {order.status === 'pending' ? (
                      <div className="space-y-6">
                        {!paymentProofUrl ? (
                          <label className="flex flex-col items-center justify-center w-full h-40 sm:h-48 border-2 border-dashed border-white/10 rounded-3xl cursor-pointer hover:bg-white/5 transition-all group">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-gray-500 group-hover:text-brand transition-colors mb-4" />
                              <p className="text-xs sm:text-sm text-gray-500 group-hover:text-white transition-colors font-bold uppercase tracking-widest">Upload Payment Screenshot</p>
                              <p className="text-[10px] sm:text-xs text-gray-600 mt-2">PNG, JPG up to 5MB</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={handlePaymentProofUpload} disabled={processingAction} />
                          </label>
                        ) : (
                          <div className="relative group rounded-3xl overflow-hidden border border-white/10 aspect-video sm:aspect-auto sm:h-64">
                            <img src={paymentProofUrl} alt="Payment Proof" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                              <button 
                                onClick={() => setPaymentProofUrl(null)}
                                className="p-3 bg-red-500/20 text-red-500 rounded-xl hover:bg-red-500/30 transition-colors"
                              >
                                <XCircle className="w-6 h-6" />
                              </button>
                              <a 
                                href={paymentProofUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-3 bg-brand/20 text-brand rounded-xl hover:bg-brand/30 transition-colors"
                              >
                                <ExternalLink className="w-6 h-6" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      (order.payment_screenshot_url || paymentProofUrl) ? (
                        <div className="relative group rounded-3xl overflow-hidden border border-white/10 aspect-video sm:aspect-auto sm:h-64">
                          <img src={order.payment_screenshot_url || paymentProofUrl || ''} alt="Payment Proof" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a 
                              href={order.payment_screenshot_url || paymentProofUrl || ''} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 px-6 py-3 bg-brand text-[#050505] rounded-2xl font-bold uppercase tracking-widest text-xs"
                            >
                              <ExternalLink className="w-5 h-5" />
                              View Full Size
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="p-10 bg-white/5 border border-dashed border-white/10 rounded-3xl text-center">
                          <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-widest font-bold">No proof uploaded yet</p>
                        </div>
                      )
                    )}
                  </div>

                  {order.status === 'pending' && (
                    <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 pt-6 sm:pt-8">
                      <button 
                        onClick={() => setShowConfirmCancel(true)}
                        className="w-full sm:flex-1 py-5 sm:py-6 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl sm:rounded-3xl text-base sm:text-xl font-bold transition-all border border-white/5"
                      >
                        Cancel Order
                      </button>
                      <button 
                        onClick={() => {
                          if (!paymentProofUrl) {
                            toast.error('Please upload a payment proof first');
                            return;
                          }
                          setShowConfirmPaid(true);
                        }}
                        className="w-full sm:flex-1 py-5 sm:py-6 btn-primary rounded-2xl sm:rounded-3xl text-base sm:text-xl font-bold shadow-lg shadow-brand/20"
                      >
                        I Have Paid
                      </button>
                    </div>
                  )}

                  {order.status === 'paid' && (
                    <div className="pt-6 sm:pt-8">
                      <button 
                        onClick={() => setShowDisputeModal(true)}
                        className="w-full py-4 sm:py-5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl sm:rounded-3xl text-base sm:text-lg font-bold transition-all border border-red-500/20"
                      >
                        Raise Dispute
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8 sm:space-y-10">
                  <div className="p-5 sm:p-6 bg-brand/5 border border-brand/10 rounded-2xl sm:rounded-3xl flex items-start gap-4 sm:gap-5">
                    <ShieldCheck className="w-5 h-5 sm:w-7 sm:h-7 text-brand shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-base text-gray-400 leading-relaxed">
                      {order.status === 'paid' 
                        ? "The buyer has marked the order as paid and uploaded proof. Please verify the payment in your account and check the proof below before releasing the funds."
                        : "Wait for the buyer to mark the order as paid. Once they do, verify the payment in your account before releasing the USDT."
                      }
                    </p>
                  </div>

                  {order.status === 'paid' && (
                    <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 pt-6 sm:pt-8">
                      <button 
                        onClick={() => setShowDisputeModal(true)}
                        className="w-full sm:flex-1 py-5 sm:py-6 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl sm:rounded-3xl text-base sm:text-xl font-bold transition-all border border-red-500/20"
                      >
                        Dispute
                      </button>
                      <button 
                        onClick={() => setShowConfirmRelease(true)}
                        className="w-full sm:flex-1 py-5 sm:py-6 bg-green-600 hover:bg-green-700 text-white rounded-2xl sm:rounded-3xl text-base sm:text-xl font-bold transition-all shadow-lg shadow-green-600/20"
                      >
                        Release {order.asset}
                      </button>
                    </div>
                  )}
                  {order.status === 'pending' && (
                    <div className="pt-6 sm:pt-8">
                      <button 
                        onClick={() => setShowDisputeModal(true)}
                        className="w-full py-4 sm:py-5 text-xs sm:text-base font-bold text-gray-500 hover:text-red-500 transition-colors uppercase tracking-widest"
                      >
                        Need help? Raise a dispute
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chat Section */}
          <div className="card flex flex-col h-[600px] sm:h-[700px] md:h-[800px] overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-white/5 rounded-2xl sm:rounded-3xl flex items-center justify-center text-gray-500 border border-white/5 overflow-hidden">
                  {otherParty?.avatar_url ? (
                    <img src={otherParty.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-6 h-6 md:w-7 md:h-7" />
                  )}
                </div>
                <div>
                  <p className="text-sm sm:text-base md:text-lg font-bold text-white">{otherParty?.full_name || 'User'}</p>
                  <div className="flex items-center gap-3 sm:gap-4 mt-1">
                    <span className="text-[10px] sm:text-xs md:text-sm text-gray-500 font-bold uppercase tracking-widest">{otherParty?.total_trades || 0} Trades</span>
                    <span className="text-gray-700 text-[10px] sm:text-xs md:text-sm">•</span>
                    <span className="text-[10px] sm:text-xs md:text-sm text-green-500 font-bold uppercase tracking-widest">{otherParty?.completion_rate || 100}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 sm:space-y-8">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[90%] sm:max-w-[80%]",
                    msg.sender_id === user?.id ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "p-4 sm:p-5 rounded-2xl sm:rounded-3xl text-sm sm:text-lg leading-relaxed backdrop-blur-md border",
                    msg.sender_id === user?.id 
                      ? "bg-brand/80 text-white rounded-tr-none shadow-lg shadow-brand/20 border-brand/30" 
                      : "bg-white/10 text-white rounded-tl-none border-white/20 shadow-xl"
                  )}>
                    {msg.attachment_type === 'image' && msg.attachment_url && (
                      <img src={msg.attachment_url} className="max-w-full rounded-2xl mb-4 cursor-pointer" onClick={() => window.open(msg.attachment_url, '_blank')} />
                    )}
                    {msg.attachment_type === 'file' && msg.attachment_url && (
                      <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-black/20 rounded-xl mb-4 hover:bg-black/30 transition-all">
                        <div className="w-10 h-10 bg-brand/20 rounded-lg flex items-center justify-center text-brand">
                          <AlertCircle className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">Attachment</p>
                          <p className="text-xs text-gray-400">Click to view</p>
                        </div>
                      </a>
                    )}
                    {msg.message}
                  </div>
                  <span className="text-[10px] sm:text-xs text-gray-500 mt-2 px-2">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              <div ref={chatEndRef} />
              
              {(isBuyer ? order.seller_typing : order.buyer_typing) && (
                <div className="flex items-center gap-2 text-gray-500 text-xs sm:text-sm animate-pulse">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  {otherParty?.full_name || 'Other party'} is typing...
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-white/5 bg-white/5 overflow-x-auto flex items-center gap-3 no-scrollbar">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  onClick={() => {
                    setNewMessage(reply);
                  }}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs sm:text-sm text-gray-400 hover:text-white transition-all whitespace-nowrap"
                >
                  {reply}
                </button>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 sm:p-8 border-t border-white/5 bg-white/5 flex items-end gap-3 sm:gap-6">
              <label className="p-4 sm:p-6 text-gray-400 hover:text-brand cursor-pointer transition-colors bg-white/5 rounded-2xl sm:rounded-[2rem] border border-white/5 shrink-0">
                <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
              <div className="flex-1 relative">
                <textarea
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e as any);
                    }
                  }}
                  placeholder="Type a message..."
                  className="w-full bg-[#050505] border border-white/10 rounded-2xl sm:rounded-[2rem] px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-xl text-white focus:outline-none focus:border-brand min-h-[60px] sm:min-h-[80px] max-h-[160px] resize-none"
                  rows={1}
                />
              </div>
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="p-4 sm:p-6 bg-brand text-[#050505] rounded-2xl sm:rounded-[2rem] hover:bg-brand/90 disabled:opacity-50 transition-all shadow-lg shadow-brand/20 shrink-0"
              >
                <Send className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Dispute Modal */}
      <AnimatePresence>
        {showDisputeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowDisputeModal(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 sm:p-12 shadow-2xl"
            >
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">Raise a Dispute</h2>
              <p className="text-gray-400 text-base sm:text-lg mb-10 sm:mb-12">Please provide details about the issue. An admin will review it.</p>

              <div className="space-y-8 sm:space-y-10">
                <div>
                  <label className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 block">Reason for Dispute</label>
                  <textarea
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="Describe the issue in detail..."
                    className="w-full bg-white/5 border border-white/10 rounded-3xl sm:rounded-[2rem] px-6 py-5 text-white text-base sm:text-lg focus:outline-none focus:border-brand min-h-[160px] resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 block">Video Proof URL (Optional)</label>
                  <input
                    type="url"
                    value={videoProofUrl}
                    onChange={(e) => setVideoProofUrl(e.target.value)}
                    placeholder="Link to video proof (Google Drive, Mega, etc.)"
                    className="w-full bg-white/5 border border-white/10 rounded-3xl sm:rounded-[2rem] px-6 py-5 text-white text-base sm:text-lg focus:outline-none focus:border-brand"
                  />
                  <p className="text-xs sm:text-sm text-gray-500 mt-4">Uploading a video of the payment/issue helps resolve disputes faster.</p>
                </div>
              </div>

              <div className="flex gap-5 sm:gap-6 mt-12 sm:mt-16">
                <button
                  onClick={() => setShowDisputeModal(false)}
                  className="flex-1 py-5 sm:py-6 bg-white/5 hover:bg-white/10 text-gray-400 rounded-3xl sm:rounded-[2rem] font-bold text-base sm:text-lg transition-all border border-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDispute}
                  disabled={raisingDispute || !disputeReason.trim()}
                  className="flex-1 py-5 sm:py-6 bg-red-600 hover:bg-red-700 text-white rounded-3xl sm:rounded-[2rem] font-bold text-base sm:text-lg transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
                >
                  {raisingDispute ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Raise Dispute'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowReviewModal(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 sm:p-12 shadow-2xl"
            >
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">Rate your experience</h2>
              <p className="text-gray-400 text-base sm:text-lg mb-10 sm:mb-12">How was your trade with {otherParty?.full_name}?</p>

              <div className="flex justify-center gap-4 sm:gap-6 mb-10 sm:mb-12">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setRating(s)}
                    className={cn(
                      "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all",
                      rating >= s ? "bg-brand text-white" : "bg-white/5 text-gray-500 hover:bg-white/10"
                    )}
                  >
                    <Star className={cn("w-7 h-7 sm:w-8 sm:h-8", rating >= s && "fill-current")} />
                  </button>
                ))}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a short review (optional)..."
                className="w-full bg-white/5 border border-white/10 rounded-3xl sm:rounded-[2rem] px-6 py-5 text-white text-base sm:text-lg focus:outline-none focus:border-brand mb-6 min-h-[140px] resize-none"
              />

              <div className="mb-10 sm:mb-12">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Select Tags</p>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTags(prev => 
                        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                      )}
                      className={cn(
                        "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                        selectedTags.includes(tag) 
                          ? "bg-brand text-white border-brand shadow-lg shadow-brand/20" 
                          : "bg-white/5 text-gray-500 border-white/5 hover:border-white/10"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-5 sm:gap-6">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 py-5 sm:py-6 bg-white/5 hover:bg-white/10 text-gray-400 rounded-3xl sm:rounded-[2rem] font-bold text-base sm:text-lg transition-all border border-white/5"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="flex-1 py-5 sm:py-6 btn-primary rounded-3xl sm:rounded-[2rem] font-bold text-base sm:text-lg shadow-lg shadow-brand/20 disabled:opacity-50"
                >
                  {submittingReview ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Submit Review'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={showConfirmPaid}
        onClose={() => setShowConfirmPaid(false)}
        onConfirm={handleMarkAsPaid}
        loading={processingAction}
        title="Confirm Payment"
        message="Have you completed the payment? Providing false information may lead to account suspension."
        confirmText="Yes, I have paid"
        variant="primary"
      />

      <ConfirmationModal
        isOpen={showConfirmRelease}
        onClose={() => setShowConfirmRelease(false)}
        onConfirm={handleReleaseFunds}
        loading={processingAction}
        title="Release Funds"
        message="Have you received the correct amount in your bank/wallet? Once released, this action cannot be undone."
        confirmText="Release USDT"
        variant="success"
      />

      <ConfirmationModal
        isOpen={showConfirmCancel}
        onClose={() => setShowConfirmCancel(false)}
        onConfirm={handleCancelOrder}
        loading={processingAction}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? Frequent cancellations may lead to account restrictions."
        confirmText="Cancel Order"
        variant="danger"
      />
    </div>
  );
}
