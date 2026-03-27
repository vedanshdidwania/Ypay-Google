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
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showConfirmPaid, setShowConfirmPaid] = useState(false);
  const [showConfirmRelease, setShowConfirmRelease] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
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
        message: newMessage
      });

      if (error) throw error;
      setNewMessage('');
      
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
        image_url: publicUrl
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!order) return;

    try {
      setProcessingAction(true);
      const { error } = await supabase.rpc('mark_p2p_order_as_paid', {
        p_order_id: id
      });

      if (error) throw error;
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
        comment
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#050505] pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate('/p2p')}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Order #{order.id.slice(0, 8)}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
                order.status === 'pending' ? "bg-yellow-500/10 text-yellow-500" :
                order.status === 'paid' ? "bg-blue-500/10 text-blue-500" :
                order.status === 'completed' ? "bg-green-500/10 text-green-500" :
                order.status === 'disputed' ? "bg-red-500/10 text-red-500" :
                "bg-gray-500/10 text-gray-500"
              )}>
                {order.status}
              </span>
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                • {isBuyer ? 'Buying' : 'Selling'} USDT
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Amount to {isBuyer ? 'Pay' : 'Receive'}</p>
                  <p className="text-2xl font-display font-bold text-white">₹{order.amount_inr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{order.asset} to {isBuyer ? 'Receive' : 'Send'}</p>
                  <p className="text-2xl font-display font-bold text-brand">
                    {order.status === 'completed' && isBuyer 
                      ? (order.amount_usdt - (order.platform_fee_amount || 0)).toFixed(8)
                      : order.amount_usdt.toFixed(8)
                    } {order.asset}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Price</p>
                  <p className="text-2xl font-display font-bold text-white">₹{order.rate.toFixed(2)}</p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <Lock className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-bold text-green-500 uppercase tracking-widest">Escrow Protected</span>
                </div>
                {order.status === 'completed' && order.platform_fee_amount !== undefined && order.platform_fee_amount > 0 && (
                  <div className="flex items-center justify-between px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Platform Fee</span>
                    <span className="text-xs font-bold text-white">{order.platform_fee_amount.toFixed(8)} {order.asset}</span>
                  </div>
                )}
              </div>

              {order.status === 'pending' && (
                <div className="mt-8 p-6 bg-brand/5 border border-brand/10 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Payment Window</p>
                      <p className="text-xs text-gray-400">Please complete the trade within the time limit.</p>
                    </div>
                  </div>
                  <div className="text-2xl font-mono font-bold text-brand">
                    {formatTime(timeLeft)}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Info */}
            <div className="card p-8">
              <h3 className="text-lg font-display font-bold text-white mb-6">Payment Information</h3>
              
              {isBuyer ? (
                <div className="space-y-6">
                  <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Please transfer the exact amount using one of the merchant's supported payment methods. 
                      Do not include any crypto-related terms in the payment remarks.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sellerPaymentMethods.length > 0 ? (
                      sellerPaymentMethods.map((pm) => (
                        <div key={pm.id} className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-brand uppercase tracking-widest">{pm.type}</span>
                            <CheckCircle2 className="w-4 h-4 text-brand" />
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Account Name</p>
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-bold text-white">{pm.account_name}</p>
                                <button onClick={() => { navigator.clipboard.writeText(pm.account_name); toast.success('Copied!'); }} className="text-gray-500 hover:text-white transition-colors">
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {pm.upi_id && (
                              <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">UPI ID</p>
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-bold text-white select-all">{pm.upi_id}</p>
                                  <button onClick={() => { navigator.clipboard.writeText(pm.upi_id); toast.success('Copied!'); }} className="text-gray-500 hover:text-white transition-colors">
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {pm.account_number && (
                              <>
                                <div>
                                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Account Number</p>
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold text-white select-all">{pm.account_number}</p>
                                    <button onClick={() => { navigator.clipboard.writeText(pm.account_number); toast.success('Copied!'); }} className="text-gray-500 hover:text-white transition-colors">
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">IFSC Code</p>
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold text-white select-all">{pm.ifsc}</p>
                                    <button onClick={() => { navigator.clipboard.writeText(pm.ifsc); toast.success('Copied!'); }} className="text-gray-500 hover:text-white transition-colors">
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 p-8 bg-white/5 border border-dashed border-white/10 rounded-2xl text-center">
                        <p className="text-sm text-gray-500">No payment details provided by merchant. Please contact them in chat.</p>
                      </div>
                    )}
                  </div>

                  {order.status === 'pending' && (
                    <div className="flex gap-4 pt-4">
                      <button 
                        onClick={() => setShowConfirmCancel(true)}
                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl font-bold transition-all"
                      >
                        Cancel Order
                      </button>
                      <button 
                        onClick={() => setShowConfirmPaid(true)}
                        className="flex-1 py-4 btn-primary rounded-2xl font-bold shadow-lg shadow-brand/20"
                      >
                        I Have Paid
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-brand/5 border border-brand/10 rounded-2xl flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Wait for the buyer to mark the order as paid. Once they do, verify the payment in your account 
                      before releasing the USDT.
                    </p>
                  </div>

                  {order.status === 'paid' && (
                    <div className="flex gap-4 pt-4">
                      <button 
                        onClick={() => setShowDisputeModal(true)}
                        className="flex-1 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl font-bold transition-all border border-red-500/20"
                      >
                        Dispute
                      </button>
                      <button 
                        onClick={() => setShowConfirmRelease(true)}
                        className="flex-1 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-green-600/20"
                      >
                        Release {order.asset}
                      </button>
                    </div>
                  )}
                  {order.status === 'pending' && (
                    <div className="pt-4">
                      <button 
                        onClick={() => setShowDisputeModal(true)}
                        className="w-full py-3 text-xs font-bold text-gray-500 hover:text-red-500 transition-colors uppercase tracking-widest"
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
          <div className="card flex flex-col h-[600px] overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-500 border border-white/5 overflow-hidden">
                  {otherParty?.avatar_url ? (
                    <img src={otherParty.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{otherParty?.full_name || 'User'}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{otherParty?.total_trades || 0} Trades</span>
                    <span className="text-gray-700">•</span>
                    <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">{otherParty?.completion_rate || 100}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.sender_id === user?.id ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-2xl text-sm",
                    msg.sender_id === user?.id 
                      ? "bg-brand text-white rounded-tr-none" 
                      : "bg-white/5 text-white rounded-tl-none border border-white/10"
                  )}>
                    {msg.image_url && (
                      <img src={msg.image_url} className="max-w-full rounded-lg mb-2" />
                    )}
                    {msg.message}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-white/5 flex gap-2">
              <label className="p-2 text-gray-400 hover:text-brand cursor-pointer transition-colors">
                <ImageIcon className="w-5 h-5" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-[#050505] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand"
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="p-2 bg-brand text-white rounded-xl hover:bg-brand/90 disabled:opacity-50 transition-all"
              >
                <Send className="w-5 h-5" />
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
              className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-display font-bold text-white mb-2">Raise a Dispute</h2>
              <p className="text-gray-400 text-sm mb-8">Please provide details about the issue. An admin will review it.</p>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Reason for Dispute</label>
                  <textarea
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="Describe the issue in detail..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand min-h-[120px] resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Video Proof URL (Optional)</label>
                  <input
                    type="url"
                    value={videoProofUrl}
                    onChange={(e) => setVideoProofUrl(e.target.value)}
                    placeholder="Link to video proof (Google Drive, Mega, etc.)"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand"
                  />
                  <p className="text-[10px] text-gray-500 mt-2">Uploading a video of the payment/issue helps resolve disputes faster.</p>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setShowDisputeModal(false)}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDispute}
                  disabled={raisingDispute || !disputeReason.trim()}
                  className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
                >
                  {raisingDispute ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Raise Dispute'}
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
              className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-display font-bold text-white mb-2">Rate your experience</h2>
              <p className="text-gray-400 text-sm mb-8">How was your trade with {otherParty?.full_name}?</p>

              <div className="flex justify-center gap-2 mb-8">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setRating(s)}
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                      rating >= s ? "bg-brand text-white" : "bg-white/5 text-gray-500 hover:bg-white/10"
                    )}
                  >
                    <Star className={cn("w-6 h-6", rating >= s && "fill-current")} />
                  </button>
                ))}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a short review (optional)..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand mb-6 min-h-[100px] resize-none"
              />

              <div className="flex gap-4">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl font-bold transition-all"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="flex-1 py-4 btn-primary rounded-2xl font-bold shadow-lg shadow-brand/20 disabled:opacity-50"
                >
                  {submittingReview ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Submit Review'}
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
