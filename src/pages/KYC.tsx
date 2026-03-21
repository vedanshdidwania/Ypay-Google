import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';
import { ShieldCheck, Upload, CheckCircle2, AlertCircle, Loader2, FileText, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import type { KYCSubmission } from '../types';

export default function KYC() {
  const { profile } = useAuth();
  const [submission, setSubmission] = useState<KYCSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [docType, setDocType] = useState('passport');
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      fetchSubmission();
    }
  }, [profile]);

  const fetchSubmission = async () => {
    const { data, error } = await supabase
      .from('kyc_submissions')
      .select('*')
      .eq('user_id', profile?.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) setSubmission(data);
    setLoading(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (side === 'front') {
        setFrontImage(file);
        const reader = new FileReader();
        reader.onloadend = () => setFrontPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setBackImage(file);
        const reader = new FileReader();
        reader.onloadend = () => setBackPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !frontImage) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Upload images to Supabase Storage
      const uploadImage = async (file: File, prefix: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${profile.id}-${prefix}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('kyc-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('kyc-documents').getPublicUrl(fileName);
        return publicUrl;
      };

      const frontUrl = await uploadImage(frontImage, 'front');
      let backUrl = '';
      if (backImage) {
        backUrl = await uploadImage(backImage, 'back');
      }

      const { error: submitError } = await supabase.from('kyc_submissions').insert({
        user_id: profile.id,
        document_type: docType,
        document_front_url: frontUrl,
        document_back_url: backUrl,
        status: 'pending'
      });

      if (submitError) throw submitError;

      // Update profile status
      await supabase.from('profiles').update({ kyc_status: 'pending' }).eq('id', profile.id);

      fetchSubmission();
    } catch (err: any) {
      setError(err.message || 'Failed to submit KYC');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-10 h-10 text-blue-500" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Identity Verification</h1>
        <p className="text-gray-400 max-w-lg mx-auto">
          Complete your KYC verification to unlock higher limits and P2P trading features.
        </p>
      </div>

      {submission ? (
        <div className="bg-white/5 border border-white/10 p-12 rounded-3xl shadow-2xl text-center">
          {submission.status === 'pending' ? (
            <>
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Verification Pending</h2>
              <p className="text-gray-400 mb-8">
                Your documents have been submitted and are currently under review. This usually takes 24-48 hours.
              </p>
            </>
          ) : submission.status === 'approved' ? (
            <>
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Verification Approved</h2>
              <p className="text-gray-400 mb-8">
                Congratulations! Your identity has been verified. You now have full access to all platform features.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Verification Rejected</h2>
              <p className="text-gray-400 mb-4">
                Unfortunately, your verification was rejected.
              </p>
              {submission.admin_feedback && (
                <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl text-red-400 text-sm mb-8">
                  Reason: {submission.admin_feedback}
                </div>
              )}
              <button
                onClick={() => setSubmission(null)}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 p-8 rounded-3xl shadow-2xl"
        >
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider">Document Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['passport', 'id_card', 'drivers_license'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDocType(type)}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                      docType === type ? "bg-blue-600/10 border-blue-600 text-blue-400" : "bg-white/5 border-white/5 text-gray-500 hover:border-white/10"
                    )}
                  >
                    <FileText className="w-6 h-6" />
                    <span className="text-xs font-bold uppercase tracking-wider">{type.replace('_', ' ')}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider">Front Side</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'front')}
                    className="hidden"
                    id="front-upload"
                  />
                  <label
                    htmlFor="front-upload"
                    className="w-full h-48 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-all overflow-hidden"
                  >
                    {frontPreview ? (
                      <img src={frontPreview} alt="Front Preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-500 mb-2" />
                        <span className="text-xs text-gray-500">Upload Front Side</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider">Back Side (Optional)</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'back')}
                    className="hidden"
                    id="back-upload"
                  />
                  <label
                    htmlFor="back-upload"
                    className="w-full h-48 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-all overflow-hidden"
                  >
                    {backPreview ? (
                      <img src={backPreview} alt="Back Preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-500 mb-2" />
                        <span className="text-xs text-gray-500">Upload Back Side</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 mt-0.5" />
              <p className="text-xs text-blue-400/80 leading-relaxed">
                Make sure the document is clearly visible, all four corners are in the frame, and the information is legible. Blurred or cropped images will be rejected.
              </p>
            </div>

            <button
              disabled={isSubmitting || !frontImage}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit for Verification'}
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
