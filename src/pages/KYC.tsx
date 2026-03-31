import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';
import { ShieldCheck, Upload, CheckCircle2, AlertCircle, Loader2, FileText, Info, Video } from 'lucide-react';
import { cn } from '../lib/utils';
import type { KYCSubmission } from '../types';

export default function KYC() {
  const { profile } = useAuth();
  const [submission, setSubmission] = useState<KYCSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);

  const [docType, setDocType] = useState('passport');
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back' | 'video') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (side === 'front') {
        setFrontImage(file);
        const reader = new FileReader();
        reader.onloadend = () => setFrontPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else if (side === 'back') {
        setBackImage(file);
        const reader = new FileReader();
        reader.onloadend = () => setBackPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setVideoFile(file);
        setVideoPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !frontImage) return;
    if (selectedLevel === 3 && !videoFile) {
      setError('Please upload the verification video for Level 3');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      // Upload files to Supabase Storage
      const uploadFile = async (file: File, prefix: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${profile.id}-${prefix}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('kyc-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('kyc-documents').getPublicUrl(fileName);
        return publicUrl;
      };

      const frontUrl = await uploadFile(frontImage, 'front');
      let backUrl = '';
      if (backImage) {
        backUrl = await uploadFile(backImage, 'back');
      }

      let videoUrl = '';
      if (selectedLevel === 3 && videoFile) {
        videoUrl = await uploadFile(videoFile, 'video');
      }

      const { error: submitError } = await supabase.from('kyc_submissions').insert({
        user_id: profile.id,
        document_type: docType,
        document_front_url: frontUrl,
        document_back_url: backUrl,
        video_url: videoUrl,
        kyc_level: selectedLevel,
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
    <div className="min-h-screen bg-[#050505] pt-20 pb-10">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8 sm:mb-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-brand" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-3 text-white tracking-tight">Identity Verification</h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
            Complete your KYC verification to unlock higher limits and P2P trading features.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {[
            { level: 1, title: 'Level 1', limit: '$2,000', desc: 'Email Verification' },
            { level: 2, title: 'Level 2', limit: '$5,000', desc: 'ID Verification' },
            { level: 3, title: 'Level 3', limit: 'Unlimited', desc: 'Video/Address' }
          ].map((tier) => (
            <div 
              key={tier.level}
              className={cn(
                "p-4 rounded-xl border transition-all relative overflow-hidden",
                profile?.kyc_level >= tier.level 
                  ? "bg-green-500/10 border-green-500/20" 
                  : selectedLevel === tier.level
                    ? "bg-brand/10 border-brand"
                    : "bg-white/5 border-white/10"
              )}
              onClick={() => profile?.kyc_level < tier.level && setSelectedLevel(tier.level)}
            >
              {profile?.kyc_level >= tier.level && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                </div>
              )}
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">{tier.title}</p>
              <p className="text-base font-bold text-white mb-0.5">{tier.limit}</p>
              <p className="text-[10px] text-gray-400">{tier.desc}</p>
              
              {profile?.kyc_level === tier.level - 1 && submission?.status !== 'pending' && (
                <button className="mt-2 w-full py-1 bg-brand/20 hover:bg-brand/30 text-brand text-[9px] font-bold rounded-lg transition-all">
                  Upgrade Now
                </button>
              )}
            </div>
          ))}
        </div>

        {submission ? (
          <div className="card p-10 sm:p-16 text-center">
            {submission.status === 'pending' ? (
              <>
                <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
                  <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-5 text-white">Verification Pending</h2>
                <p className="text-base sm:text-lg text-gray-400 mb-10">
                  Your documents have been submitted and are currently under review. This usually takes 24-48 hours.
                </p>
              </>
            ) : submission.status === 'approved' ? (
              <>
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-5 text-white">Verification Approved</h2>
                <p className="text-base sm:text-lg text-gray-400 mb-10">
                  Congratulations! Your identity has been verified. You now have full access to all platform features.
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-5 text-white">Verification Rejected</h2>
                <p className="text-base sm:text-lg text-gray-400 mb-6">
                  Unfortunately, your verification was rejected.
                </p>
                {submission.admin_feedback && (
                  <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-xl text-red-400 text-sm sm:text-base mb-10">
                    Reason: {submission.admin_feedback}
                  </div>
                )}
                <button
                  onClick={() => setSubmission(null)}
                  className="w-full sm:w-auto px-10 py-5 bg-brand hover:bg-brand/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand/20 text-base sm:text-lg"
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
            className="card p-8 sm:p-12"
          >
            {error && (
              <div className="mb-8 p-5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-4 text-red-400 text-sm sm:text-base">
                <AlertCircle className="w-6 h-6" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="space-y-5">
                <label className="block text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider">Document Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {['passport', 'id_card', 'drivers_license'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setDocType(type)}
                      className={cn(
                        "p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3",
                        docType === type ? "bg-brand/10 border-brand text-brand" : "bg-white/5 border-white/5 text-gray-500 hover:border-white/10"
                      )}
                    >
                      <FileText className="w-8 h-8" />
                      <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">{type.replace('_', ' ')}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                <div className="space-y-5">
                  <label className="block text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider">Front Side</label>
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
                      className="w-full h-56 sm:h-64 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-brand/50 transition-all overflow-hidden bg-white/5"
                    >
                      {frontPreview ? (
                        <img src={frontPreview} alt="Front Preview" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-gray-500 mb-3" />
                          <span className="text-sm text-gray-500">Upload Front Side</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <div className="space-y-5">
                  <label className="block text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider">Back Side (Optional)</label>
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
                      className="w-full h-56 sm:h-64 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-brand/50 transition-all overflow-hidden bg-white/5"
                    >
                      {backPreview ? (
                        <img src={backPreview} alt="Back Preview" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-gray-500 mb-3" />
                          <span className="text-sm text-gray-500">Upload Back Side</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-brand/5 border border-brand/10 rounded-2xl flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <Info className="w-6 h-6 text-brand mt-0.5 shrink-0" />
                  <p className="text-sm text-brand/80 leading-relaxed">
                    Make sure the document is clearly visible, all four corners are in the frame, and the information is legible. Blurred or cropped images will be rejected.
                  </p>
                </div>
                {selectedLevel === 3 && (
                  <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Level 3 Video Script</p>
                    <p className="text-sm text-white italic leading-relaxed">
                      "My name is [Your Name], my document number is [Your ID Number], I want to complete my level 3 verification on Ypay."
                    </p>
                    <p className="text-[10px] text-gray-500 mt-2">Please record a short video of yourself holding your ID and saying the script above.</p>
                  </div>
                )}
              </div>

              {selectedLevel === 3 && (
                <div className="space-y-5">
                  <label className="block text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider">Verification Video</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleImageChange(e, 'video')}
                      className="hidden"
                      id="video-upload"
                    />
                    <label
                      htmlFor="video-upload"
                      className={cn(
                        "flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-2xl cursor-pointer transition-all",
                        videoPreview ? "bg-brand/5 border-brand/20" : "bg-white/5 border-white/10 hover:border-white/20"
                      )}
                    >
                      {videoPreview ? (
                        <div className="w-full aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center">
                          <video src={videoPreview} controls className="max-h-full" />
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mb-4">
                            <Video className="w-8 h-8 text-brand" />
                          </div>
                          <p className="text-sm font-bold text-white mb-2">Upload Verification Video</p>
                          <p className="text-xs text-gray-500 text-center max-w-xs">
                            Record a video saying the script above clearly while holding your ID.
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              )}

              <button
                disabled={isSubmitting || !frontImage}
                className="w-full py-5 bg-brand hover:bg-brand/90 disabled:bg-brand/50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-brand/20 text-base sm:text-lg"
              >
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Submit for Verification'}
              </button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
