import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';
import { cn } from '../lib/utils';
import type { SupportChat, SupportMessage } from '../types';

export default function Support() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [chat, setChat] = useState<SupportChat | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && isOpen) {
      fetchOrCreateChat();
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (chat) {
      fetchMessages(chat.id);
      
      const subscription = supabase
        .channel(`chat:${chat.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${chat.id}` }, (payload) => {
          setMessages(prev => [...prev, payload.new as SupportMessage]);
        })
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [chat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchOrCreateChat = async () => {
    if (!user) return;
    setLoading(true);

    // Try to find existing open chat
    const { data: existingChat } = await supabase
      .from('support_chats')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .single();

    if (existingChat) {
      setChat(existingChat);
    } else {
      // Create new chat
      const { data: newChat, error } = await supabase
        .from('support_chats')
        .insert({
          user_id: user.id,
          user_email: user.email,
          status: 'open',
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (newChat) setChat(newChat);
    }
    setLoading(false);
  };

  const fetchMessages = async (chatId: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chat || !newMessage.trim() || !user) return;

    setSending(true);
    const { error } = await supabase.from('support_messages').insert({
      chat_id: chat.id,
      sender_id: user.id,
      content: newMessage,
      is_admin_reply: false
    });

    if (!error) {
      setNewMessage('');
      await supabase.from('support_chats').update({
        last_message: newMessage,
        last_message_at: new Date().toISOString()
      }).eq('id', chat.id);
    }
    setSending(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chat || !user) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const { error } = await supabase.from('support_messages').insert({
        chat_id: chat.id,
        sender_id: user.id,
        content: 'Sent an image',
        image_url: base64String,
        is_admin_reply: false
      });
      if (!error) {
        await supabase.from('support_chats').update({
          last_message: 'Sent an image',
          last_message_at: new Date().toISOString()
        }).eq('id', chat.id);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!user) return null;

  return (
    <>
      {/* Support Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-brand text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group"
      >
        <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse hidden" />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-[380px] h-[500px] bg-surface rounded-3xl shadow-2xl border border-white/5 flex flex-col overflow-hidden z-50"
          >
            {/* Header */}
            <div className="p-6 bg-brand text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-widest">Protocol Support</h3>
                  <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-medium">Online & Ready</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#050505]/50">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-brand" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl shadow-sm flex items-center justify-center text-gray-700 mb-4">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Start a conversation with our support team.</p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[85%]",
                        msg.is_admin_reply ? "mr-auto items-start" : "ml-auto items-end"
                      )}
                    >
                      <div className={cn(
                        "p-3 rounded-2xl text-sm shadow-sm",
                        msg.is_admin_reply 
                          ? "bg-white/5 text-white rounded-tl-none border border-white/10" 
                          : "bg-brand text-white rounded-tr-none"
                      )}>
                        {msg.image_url && (
                          <img src={msg.image_url} className="max-w-full rounded-lg mb-2" />
                        )}
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-gray-400 mt-1 font-bold uppercase tracking-widest">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-surface border-t border-white/5 flex gap-2">
              <label className="p-3 text-gray-400 hover:text-brand cursor-pointer transition-all hover:bg-white/5 rounded-xl">
                <ImageIcon className="w-5 h-5" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand transition-all"
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="p-3 bg-brand text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-brand/20"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
