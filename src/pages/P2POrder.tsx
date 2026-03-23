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
  User
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { supabase } from '../lib/supabase';
import { cn, formatCurrency, formatUSDT } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface P2POrder {
  id: string;
  ad_id: string;
  buyer_id: string;
  seller_id: string;
  amount_fiat: number;
  amount_usdt: number;
  price: number;
  status: 'pending' | 'paid' | 'completed' | 'cancelled' | 'disputed';
  payment_window: number;
  created_at: string;
  payment_screenshot?: string;
  buyer_profile?: { full_name: string; email: string };
  seller_profile?: { full_name: string; email: string };
  ad?: { payment_methods: string[] };
}

interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  content: string;
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
    if (order && order.status === 'pending') {
      const start = new Date(order.created_at).getTime();
      const end = start + (order.payment_window * 60 * 1000);
      
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
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('p2p_orders')
        .select(`
          *,
          buyer_profile:profiles!p2p_orders_buyer_id_fkey(full_name, email),
          seller_profile:profiles!p2p_orders_seller_id_fkey(full_name, email),
          ad:ads(payment_methods)
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
      .from('p2p_messages')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`p2p_messages:${id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'p2p_messages',
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
      .channel(`p2p_order:${id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'p2p_orders',
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
      const { error } = await supabase.from('p2p_messages').insert({
        order_id: id,
        sender_id: user.id,
        content: newMessage
      });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        await supabase.from('p2p_messages').insert({
          order_id: id,
          sender_id: user.id,
          content: 'Sent an image',
          image_url: base64String
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!confirm('Have you completed the payment? Providing false information may lead to account suspension.')) return;

    try {
      const { error } = await supabase
        .from('p2p_orders')
        .update({ status: 'paid' })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking as paid:', error);
    }
  };

  const handleReleaseFunds = async () => {
    if (!confirm('Have you received the correct amount in your bank/wallet? Once released, this action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('p2p_orders')
        .update({ status: 'completed' })
        .eq('id', id);

      if (error) throw error;
      
      // In a real app, this would trigger a database function or edge function 
      // to handle the actual USDT transfer between user balances.
      alert('Funds released successfully! Trade completed.');
    } catch (error) {
      console.error('Error releasing funds:', error);
    }
  };

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
      const { error } = await supabase
        .from('p2p_orders')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error cancelling order:', error);
    }
  };

  const handleAutoCancel = async () => {
    await supabase
      .from('p2p_orders')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('status', 'pending');
  };

  const handleDispute = async () => {
    const reason = prompt('Please describe the reason for the dispute:');
    if (!reason) return;

    try {
      const { error } = await supabase
        .from('p2p_orders')
        .update({ status: 'disputed' })
        .eq('id', id);

      if (error) throw error;

      await supabase.from('p2p_disputes').insert({
        order_id: id,
        raised_by: user?.id,
        reason
      });

      alert('Dispute raised. An admin will review the trade shortly.');
    } catch (error) {
      console.error('Error raising dispute:', error);
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

  const isBuyer = user?.id === order.buyer_id;
  const isSeller = user?.id === order.seller_id;
  const otherParty = isBuyer ? order.seller_profile : order.buyer_profile;

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
                  <p className="text-2xl font-display font-bold text-white">₹{order.amount_fiat.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">USDT to {isBuyer ? 'Receive' : 'Send'}</p>
                  <p className="text-2xl font-display font-bold text-brand">{formatUSDT(order.amount_usdt)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Price</p>
                  <p className="text-2xl font-display font-bold text-white">₹{order.price.toFixed(2)}</p>
                </div>
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
                    {order.ad?.payment_methods.map((pm) => (
                      <div key={pm} className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{pm}</span>
                        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-brand">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {order.status === 'pending' && (
                    <div className="flex gap-4 pt-4">
                      <button 
                        onClick={handleCancelOrder}
                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl font-bold transition-all"
                      >
                        Cancel Order
                      </button>
                      <button 
                        onClick={handleMarkAsPaid}
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
                        onClick={handleDispute}
                        className="flex-1 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl font-bold transition-all border border-red-500/20"
                      >
                        Dispute
                      </button>
                      <button 
                        onClick={handleReleaseFunds}
                        className="flex-1 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-green-600/20"
                      >
                        Release USDT
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
                <div className="w-8 h-8 bg-brand/10 rounded-full flex items-center justify-center text-brand">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{otherParty?.full_name || 'Merchant'}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Online</p>
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
                    {msg.content}
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
    </div>
  );
}
