import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'success';
  loading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  loading = false
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand/50 to-transparent" />
            
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border",
                variant === 'danger' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                variant === 'success' ? "bg-green-500/10 border-green-500/20 text-green-500" :
                "bg-brand/10 border-brand/20 text-brand"
              )}>
                <AlertCircle className="w-8 h-8" />
              </div>

              <h3 className="text-2xl font-display font-bold text-white mb-2">{title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-10">
                {message}
              </p>

              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold transition-all shadow-lg",
                    variant === 'danger' ? "bg-red-600 hover:bg-red-700 shadow-red-600/20 text-white" :
                    variant === 'success' ? "bg-green-600 hover:bg-green-700 shadow-green-600/20 text-white" :
                    "bg-brand hover:bg-brand/90 shadow-brand/20 text-[#050505]"
                  )}
                >
                  {loading ? 'Processing...' : confirmText}
                </button>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="w-full py-4 rounded-2xl font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                >
                  {cancelText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
