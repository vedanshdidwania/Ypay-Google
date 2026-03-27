-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_disabled BOOLEAN DEFAULT FALSE,
  is_verified_merchant BOOLEAN DEFAULT FALSE,
  trades_completed INTEGER DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  completion_rate NUMERIC DEFAULT 100.0,
  kyc_status TEXT DEFAULT 'none', -- none, pending, approved, rejected
  balance_usdt NUMERIC DEFAULT 0.00,
  escrow_balance_usdt NUMERIC DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Helper function to check admin status safely (prevents recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create ads table (P2P Ads)
CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- buy, sell
  asset TEXT DEFAULT 'USDT',
  pricing_type TEXT DEFAULT 'fixed', -- fixed, dynamic
  margin NUMERIC DEFAULT 0.0, -- for dynamic pricing
  price NUMERIC NOT NULL, -- fixed price or base price
  min_limit NUMERIC NOT NULL,
  max_limit NUMERIC NOT NULL,
  payment_methods TEXT[] NOT NULL,
  payment_window INTEGER DEFAULT 15,
  terms TEXT,
  status TEXT DEFAULT 'active', -- active, inactive
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- buy, sell
  amount_usdt NUMERIC NOT NULL,
  amount_inr NUMERIC NOT NULL,
  rate NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, paid, approved, rejected, completed, disputed, cancelled
  payment_method_id UUID,
  payment_screenshot_url TEXT,
  transaction_hash TEXT,
  admin_feedback TEXT,
  payment_window INTEGER DEFAULT 15,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (TIMEZONE('utc'::text, NOW()) + INTERVAL '15 minutes'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  buy_rate NUMERIC DEFAULT 92.50,
  sell_rate NUMERIC DEFAULT 89.00,
  platform_fee NUMERIC DEFAULT 1.0, -- Default 1%
  referral_commission_l1 NUMERIC DEFAULT 10.0, -- 10% of the platform fee
  referral_commission_l2 NUMERIC DEFAULT 5.0, -- 5% of the platform fee
  admin_wallet_address TEXT,
  support_contact TEXT,
  homepage_headline TEXT DEFAULT 'Trade USDT with Zero Friction',
  homepage_subheadline TEXT DEFAULT 'The most secure P2P platform for USDT transactions in India.',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create payment_methods table (Admin-defined for Buy orders)
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- UPI, Bank Transfer
  account_name TEXT NOT NULL,
  account_number TEXT,
  ifsc TEXT,
  upi_id TEXT,
  qr_image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- order_update, payment_received, kyc_update, etc.
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create kyc_submissions table
CREATE TABLE IF NOT EXISTS kyc_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  document_front_url TEXT NOT NULL,
  document_back_url TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  admin_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create transactions table (Wallet)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- deposit, withdrawal, trade_escrow, trade_release
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, completed, failed
  tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  admin_feedback TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create platform_logs table
CREATE TABLE IF NOT EXISTS platform_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS for withdrawals
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawals;
CREATE POLICY "Users can view own withdrawals"
  ON public.withdrawals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all withdrawals" ON public.withdrawals;
CREATE POLICY "Admins can view all withdrawals"
  ON public.withdrawals FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

DROP POLICY IF EXISTS "Users can create withdrawals" ON public.withdrawals;
CREATE POLICY "Users can create withdrawals"
  ON public.withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update withdrawals" ON public.withdrawals;
CREATE POLICY "Admins can update withdrawals"
  ON public.withdrawals FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- RLS for platform_logs
ALTER TABLE public.platform_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view platform logs" ON public.platform_logs;
CREATE POLICY "Admins can view platform logs"
  ON public.platform_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

DROP POLICY IF EXISTS "Admins can insert platform logs" ON public.platform_logs;
CREATE POLICY "Admins can insert platform logs"
  ON public.platform_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Create user_payment_methods table
CREATE TABLE IF NOT EXISTS user_payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT,
  ifsc TEXT,
  upi_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create merchant_favorites table
CREATE TABLE IF NOT EXISTS merchant_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  merchant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, merchant_id)
);

-- Create support_chats table
CREATE TABLE IF NOT EXISTS support_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- open, closed
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES support_chats(id) ON DELETE CASCADE NOT NULL,
  sender_id TEXT NOT NULL, -- can be user_id or 'admin'
  content TEXT NOT NULL,
  image_url TEXT,
  is_admin_reply BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 1. Update Profiles for Ratings, Security Deposit, 2FA, and Referrals
DO $$ 
BEGIN 
    -- Profile Fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='total_trades') THEN
        ALTER TABLE profiles ADD COLUMN total_trades INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='rating_sum') THEN
        ALTER TABLE profiles ADD COLUMN rating_sum NUMERIC DEFAULT 0.0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='rating_count') THEN
        ALTER TABLE profiles ADD COLUMN rating_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='security_deposit_amount') THEN
        ALTER TABLE profiles ADD COLUMN security_deposit_amount NUMERIC DEFAULT 0.0;
    END IF;
    -- 2FA
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='two_factor_secret') THEN
        ALTER TABLE profiles ADD COLUMN two_factor_secret TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_2fa_enabled') THEN
        ALTER TABLE profiles ADD COLUMN is_2fa_enabled BOOLEAN DEFAULT FALSE;
    END IF;
    -- Reputation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='speed_rating') THEN
        ALTER TABLE profiles ADD COLUMN speed_rating NUMERIC DEFAULT 5.0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='comm_rating') THEN
        ALTER TABLE profiles ADD COLUMN comm_rating NUMERIC DEFAULT 5.0;
    END IF;
    -- Referrals
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='referral_code') THEN
        ALTER TABLE profiles ADD COLUMN referral_code TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='referred_by') THEN
        ALTER TABLE profiles ADD COLUMN referred_by UUID REFERENCES profiles(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='referred_by_l2') THEN
        ALTER TABLE profiles ADD COLUMN referred_by_l2 UUID REFERENCES profiles(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='referral_earnings_l1') THEN
        ALTER TABLE profiles ADD COLUMN referral_earnings_l1 NUMERIC DEFAULT 0.0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='referral_earnings_l2') THEN
        ALTER TABLE profiles ADD COLUMN referral_earnings_l2 NUMERIC DEFAULT 0.0;
    END IF;
    -- Verification Badge
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='has_verification_badge') THEN
        ALTER TABLE profiles ADD COLUMN has_verification_badge BOOLEAN DEFAULT FALSE;
    END IF;
    -- Orders Expiration
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='expires_at') THEN
        ALTER TABLE orders ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT (TIMEZONE('utc'::text, NOW()) + INTERVAL '15 minutes');
    END IF;
    -- Ads Payment Window
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ads' AND column_name='payment_window') THEN
        ALTER TABLE ads ADD COLUMN payment_window INTEGER DEFAULT 15;
    END IF;
    -- Ads Pricing Type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ads' AND column_name='pricing_type') THEN
        ALTER TABLE ads ADD COLUMN pricing_type TEXT DEFAULT 'fixed';
    END IF;
    -- Ads Margin
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ads' AND column_name='margin') THEN
        ALTER TABLE ads ADD COLUMN margin NUMERIC DEFAULT 0.0;
    END IF;
    -- Ads Terms
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ads' AND column_name='terms') THEN
        ALTER TABLE ads ADD COLUMN terms TEXT;
    END IF;
END $$;

-- 2. Update Orders for Escrow Tracking and Fees
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='escrow_locked_at') THEN
        ALTER TABLE orders ADD COLUMN escrow_locked_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='escrow_released_at') THEN
        ALTER TABLE orders ADD COLUMN escrow_released_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='platform_fee_amount') THEN
        ALTER TABLE orders ADD COLUMN platform_fee_amount NUMERIC DEFAULT 0.0;
    END IF;
END $$;

-- 3. Create Trade Reviews Table
CREATE TABLE IF NOT EXISTS trade_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reviewee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(order_id, reviewer_id)
);

ALTER TABLE trade_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read reviews" ON trade_reviews;
CREATE POLICY "Anyone can read reviews" ON trade_reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can create reviews for their orders" ON trade_reviews;
CREATE POLICY "Users can create reviews for their orders" ON trade_reviews FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (user_id = auth.uid() OR EXISTS (SELECT 1 FROM ads WHERE id = ad_id AND user_id = auth.uid())))
);

-- Create referral_earnings table
CREATE TABLE IF NOT EXISTS referral_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own referral earnings" ON referral_earnings;
CREATE POLICY "Users can view own referral earnings" ON referral_earnings FOR SELECT USING (auth.uid() = referrer_id OR public.is_admin());

-- 4. Function to Update Profile Stats on Review
CREATE OR REPLACE FUNCTION public.update_profile_rating()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles
  SET 
    rating_sum = rating_sum + NEW.rating,
    rating_count = rating_count + 1,
    trades_completed = trades_completed + 1,
    total_trades = total_trades + 1,
    completion_rate = CASE 
      WHEN trades_completed > 0 THEN (trades_completed::numeric / (trades_completed + 1)::numeric) * 100 
      ELSE 100 
    END
  WHERE id = NEW.reviewee_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_trade_review_created ON trade_reviews;
CREATE TRIGGER on_trade_review_created
  AFTER INSERT ON trade_reviews
  FOR EACH ROW EXECUTE PROCEDURE public.update_profile_rating();

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id)
WITH CHECK (
  -- Prevent users from updating their own balance or escrow balance
  (CASE WHEN public.is_admin() THEN true ELSE 
    (balance_usdt = profiles.balance_usdt AND escrow_balance_usdt = profiles.escrow_balance_usdt)
  END)
);
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (public.is_admin());

-- Ads
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can read active ads" ON ads;
CREATE POLICY "Everyone can read active ads" ON ads FOR SELECT USING (status = 'active');
DROP POLICY IF EXISTS "Users can manage own ads" ON ads;
CREATE POLICY "Users can manage own ads" ON ads FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage all ads" ON ads;
CREATE POLICY "Admins can manage all ads" ON ads FOR ALL USING (public.is_admin());

-- Orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own orders" ON orders;
CREATE POLICY "Users can read own orders" ON orders FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM ads WHERE id = ad_id AND user_id = auth.uid()) OR 
  public.is_admin()
);
DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
CREATE POLICY "Users can update own orders" ON orders FOR UPDATE USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM ads WHERE id = ad_id AND user_id = auth.uid()) OR 
  public.is_admin()
);
DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
CREATE POLICY "Admins can manage all orders" ON orders FOR ALL USING (public.is_admin());

-- App Settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can read app settings" ON app_settings;
CREATE POLICY "Everyone can read app settings" ON app_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage app settings" ON app_settings;
CREATE POLICY "Admins can manage app settings" ON app_settings FOR ALL USING (public.is_admin());

-- Payment Methods (Admin)
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can read active payment methods" ON payment_methods;
CREATE POLICY "Everyone can read active payment methods" ON payment_methods FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage payment methods" ON payment_methods;
CREATE POLICY "Admins can manage payment methods" ON payment_methods FOR ALL USING (public.is_admin());

-- Chat Messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read messages for their orders" ON chat_messages;
CREATE POLICY "Users can read messages for their orders" ON chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (user_id = auth.uid() OR EXISTS (SELECT 1 FROM ads WHERE id = ad_id AND user_id = auth.uid()))) OR public.is_admin()
);
DROP POLICY IF EXISTS "Users can send messages for their orders" ON chat_messages;
CREATE POLICY "Users can send messages for their orders" ON chat_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (user_id = auth.uid() OR EXISTS (SELECT 1 FROM ads WHERE id = ad_id AND user_id = auth.uid()))) OR public.is_admin()
);

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
CREATE POLICY "Admins can create notifications" ON notifications FOR INSERT WITH CHECK (public.is_admin());

-- KYC Submissions
ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read/create own kyc" ON kyc_submissions;
CREATE POLICY "Users can read/create own kyc" ON kyc_submissions FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Users can create own kyc" ON kyc_submissions;
CREATE POLICY "Users can create own kyc" ON kyc_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage all kyc" ON kyc_submissions;
CREATE POLICY "Admins can manage all kyc" ON kyc_submissions FOR ALL USING (public.is_admin());

-- Transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own transactions" ON transactions;
CREATE POLICY "Users can read own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Users can create own transactions" ON transactions;
CREATE POLICY "Users can create own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage all transactions" ON transactions;
CREATE POLICY "Admins can manage all transactions" ON transactions FOR ALL USING (public.is_admin());

-- User Payment Methods
ALTER TABLE user_payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own payment methods" ON user_payment_methods;
CREATE POLICY "Users can manage own payment methods" ON user_payment_methods FOR ALL USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can view partner payment methods" ON user_payment_methods;
CREATE POLICY "Users can view partner payment methods" ON user_payment_methods FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.ads a ON o.ad_id = a.id
    WHERE (o.user_id = auth.uid() OR a.user_id = auth.uid())
    AND (user_payment_methods.user_id = o.user_id OR user_payment_methods.user_id = a.user_id)
  )
);

-- Merchant Favorites
ALTER TABLE merchant_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own favorites" ON merchant_favorites;
CREATE POLICY "Users can manage own favorites" ON merchant_favorites FOR ALL USING (auth.uid() = user_id);

-- Support Chats
ALTER TABLE support_chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read/create own support chats" ON support_chats;
CREATE POLICY "Users can read/create own support chats" ON support_chats FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Users can create own support chats" ON support_chats;
CREATE POLICY "Users can create own support chats" ON support_chats FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage all support chats" ON support_chats;
CREATE POLICY "Admins can manage all support chats" ON support_chats FOR ALL USING (public.is_admin());

-- Support Messages
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read messages for their chats" ON support_messages;
CREATE POLICY "Users can read messages for their chats" ON support_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM support_chats WHERE id = chat_id AND user_id = auth.uid()) OR public.is_admin()
);
DROP POLICY IF EXISTS "Users can send messages for their chats" ON support_messages;
CREATE POLICY "Users can send messages for their chats" ON support_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM support_chats WHERE id = chat_id AND user_id = auth.uid()) OR public.is_admin()
);

-- Create p2p_disputes table
CREATE TABLE IF NOT EXISTS p2p_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  raised_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- open, resolved
  admin_feedback TEXT,
  video_proof_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE p2p_disputes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own disputes" ON p2p_disputes;
CREATE POLICY "Users can read own disputes" ON p2p_disputes FOR SELECT USING (
  raised_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (user_id = auth.uid() OR EXISTS (SELECT 1 FROM ads WHERE id = ad_id AND user_id = auth.uid()))) OR 
  public.is_admin()
);
DROP POLICY IF EXISTS "Users can create disputes" ON p2p_disputes;
CREATE POLICY "Users can create disputes" ON p2p_disputes FOR INSERT WITH CHECK (raised_by = auth.uid());
DROP POLICY IF EXISTS "Admins can manage all disputes" ON p2p_disputes;
CREATE POLICY "Admins can manage all disputes" ON p2p_disputes FOR ALL USING (public.is_admin());

-- Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('p2p_chat_images', 'p2p_chat_images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('screenshots', 'screenshots', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- Storage Policies for p2p_chat_images
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'p2p_chat_images');
DROP POLICY IF EXISTS "Authenticated users can upload chat images" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'p2p_chat_images' AND auth.role() = 'authenticated');

-- Storage Policies for kyc-documents
DROP POLICY IF EXISTS "Admins can read KYC documents" ON storage.objects;
CREATE POLICY "Admins can read KYC documents" ON storage.objects FOR SELECT USING (bucket_id = 'kyc-documents' AND public.is_admin());
DROP POLICY IF EXISTS "Users can upload own KYC documents" ON storage.objects;
CREATE POLICY "Users can upload own KYC documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'kyc-documents' AND auth.role() = 'authenticated');

-- Storage Policies for screenshots
DROP POLICY IF EXISTS "Public Access Screenshots" ON storage.objects;
CREATE POLICY "Public Access Screenshots" ON storage.objects FOR SELECT USING (bucket_id = 'screenshots');
DROP POLICY IF EXISTS "Authenticated users can upload screenshots" ON storage.objects;
CREATE POLICY "Authenticated users can upload screenshots" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'screenshots' AND auth.role() = 'authenticated');

-- Storage Policies for avatars
DROP POLICY IF EXISTS "Public Access Avatars" ON storage.objects;
CREATE POLICY "Public Access Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE support_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Trigger for profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_referral_code TEXT;
  v_referrer_id UUID;
  v_referrer_l2_id UUID;
  v_ref_code_input TEXT;
BEGIN
  -- Generate a unique referral code for the new user
  v_referral_code := upper(substring(md5(random()::text) from 1 for 8));
  
  -- Get referral code from metadata
  v_ref_code_input := new.raw_user_meta_data->>'referred_by';
  
  IF v_ref_code_input IS NOT NULL THEN
    -- Find the referrer by their referral_code or ID (fallback)
    SELECT id, referred_by INTO v_referrer_id, v_referrer_l2_id 
    FROM public.profiles 
    WHERE referral_code = v_ref_code_input OR id::text = v_ref_code_input
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    avatar_url,
    referral_code, 
    referred_by, 
    referred_by_l2
  )
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    v_referral_code, 
    v_referrer_id, 
    v_referrer_l2_id
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RPC Functions for P2P
CREATE OR REPLACE FUNCTION public.create_p2p_ad(
  p_type TEXT,
  p_price NUMERIC,
  p_min_limit NUMERIC,
  p_max_limit NUMERIC,
  p_payment_methods TEXT[],
  p_payment_window INTEGER DEFAULT 15
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.ads (
    user_id,
    type,
    price,
    min_limit,
    max_limit,
    payment_methods,
    payment_window,
    status
  )
  VALUES (
    auth.uid(),
    p_type,
    p_price,
    p_min_limit,
    p_max_limit,
    p_payment_methods,
    p_payment_window,
    'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.release_p2p_order(p_order_id UUID)
RETURNS void AS $$
DECLARE
  v_order RECORD;
  v_buyer_id UUID;
  v_seller_id UUID;
  v_platform_fee_pct NUMERIC;
  v_referral_pct NUMERIC;
  v_referral_l2_pct NUMERIC;
  v_platform_fee_amount NUMERIC;
  v_referral_amount NUMERIC;
  v_net_amount NUMERIC;
  v_referrer_id UUID;
  v_referrer_l2_id UUID;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status != 'paid' THEN
    RAISE EXCEPTION 'Order must be in paid status to release funds';
  END IF;

  -- Get platform settings
  SELECT platform_fee, referral_commission_l1, referral_commission_l2 
  INTO v_platform_fee_pct, v_referral_pct, v_referral_l2_pct 
  FROM public.app_settings LIMIT 1;

  -- Calculate fees
  v_platform_fee_amount := (v_order.amount_usdt * v_platform_fee_pct) / 100.0;
  v_net_amount := v_order.amount_usdt - v_platform_fee_amount;

  -- Determine buyer and seller
  IF v_order.type = 'buy' THEN
    -- Order creator is buying, ad creator is selling
    v_buyer_id := v_order.user_id;
    v_seller_id := (SELECT user_id FROM public.ads WHERE id = v_order.ad_id);
  ELSE
    -- Order creator is selling, ad creator is buying
    v_buyer_id := (SELECT user_id FROM public.ads WHERE id = v_order.ad_id);
    v_seller_id := v_order.user_id;
  END IF;

  -- Update order status and record fee
  UPDATE public.orders 
  SET status = 'completed', 
      escrow_released_at = NOW(),
      platform_fee_amount = v_platform_fee_amount
  WHERE id = p_order_id;

  -- Update buyer balance (deduct platform fee)
  UPDATE public.profiles 
  SET balance_usdt = balance_usdt + v_net_amount 
  WHERE id = v_buyer_id;

  -- Deduct from seller escrow
  UPDATE public.profiles 
  SET escrow_balance_usdt = escrow_balance_usdt - v_order.amount_usdt 
  WHERE id = v_seller_id;

  -- Handle Referral Commission (L1)
  SELECT referred_by, referred_by_l2 INTO v_referrer_id, v_referrer_l2_id 
  FROM public.profiles WHERE id = v_buyer_id;
  
  IF v_referrer_id IS NOT NULL THEN
    v_referral_amount := (v_platform_fee_amount * v_referral_pct) / 100.0;
    
    IF v_referral_amount > 0 THEN
      UPDATE public.profiles 
      SET balance_usdt = balance_usdt + v_referral_amount,
          referral_earnings_l1 = referral_earnings_l1 + v_referral_amount
      WHERE id = v_referrer_id;
      
      INSERT INTO public.referral_earnings (referrer_id, referee_id, order_id, amount)
      VALUES (v_referrer_id, v_buyer_id, p_order_id, v_referral_amount);
      
      -- Notify Referrer
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (v_referrer_id, 'Referral Commission', 'You earned $' || v_referral_amount || ' from a referral trade!', 'success');
    END IF;
  END IF;

  -- Handle Referral Commission (L2)
  IF v_referrer_l2_id IS NOT NULL THEN
    v_referral_amount := (v_platform_fee_amount * v_referral_l2_pct) / 100.0;
    
    IF v_referral_amount > 0 THEN
      UPDATE public.profiles 
      SET balance_usdt = balance_usdt + v_referral_amount,
          referral_earnings_l2 = referral_earnings_l2 + v_referral_amount
      WHERE id = v_referrer_l2_id;
      
      INSERT INTO public.referral_earnings (referrer_id, referee_id, order_id, amount)
      VALUES (v_referrer_l2_id, v_buyer_id, p_order_id, v_referral_amount);
      
      -- Notify L2 Referrer
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (v_referrer_l2_id, 'Indirect Referral Commission', 'You earned $' || v_referral_amount || ' from an indirect referral trade!', 'success');
    END IF;
  END IF;

  -- Update seller stats
  UPDATE public.profiles 
  SET trades_completed = trades_completed + 1,
      total_trades = total_trades + 1
  WHERE id = v_seller_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cancel_p2p_order(p_order_id UUID)
RETURNS void AS $$
DECLARE
  v_order RECORD;
  v_seller_id UUID;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status NOT IN ('pending', 'paid') THEN
    RAISE EXCEPTION 'Order cannot be cancelled in current status';
  END IF;

  -- Determine seller to return funds to
  IF v_order.type = 'sell' THEN
    -- Order creator was seller
    v_seller_id := v_order.user_id;
  ELSE
    -- Ad creator was seller
    v_seller_id := (SELECT user_id FROM public.ads WHERE id = v_order.ad_id);
  END IF;

  -- Update order status
  UPDATE public.orders 
  SET status = 'cancelled' 
  WHERE id = p_order_id;

  -- Return funds to seller
  UPDATE public.profiles 
  SET balance_usdt = balance_usdt + v_order.amount_usdt,
      escrow_balance_usdt = escrow_balance_usdt - v_order.amount_usdt
  WHERE id = v_seller_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.start_p2p_trade(
  p_ad_id UUID,
  p_amount_usdt NUMERIC,
  p_amount_inr NUMERIC,
  p_rate NUMERIC
)
RETURNS UUID AS $$
DECLARE
  v_ad RECORD;
  v_order_id UUID;
  v_seller_id UUID;
  v_order_type TEXT;
  v_platform_fee_percent NUMERIC;
  v_platform_fee_amount NUMERIC;
BEGIN
  -- Get ad details
  SELECT * INTO v_ad FROM public.ads WHERE id = p_ad_id;
  
  IF v_ad IS NULL THEN
    RAISE EXCEPTION 'Ad not found';
  END IF;

  IF v_ad.user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot trade with your own advertisement';
  END IF;

  IF v_ad.status != 'active' THEN
    RAISE EXCEPTION 'Ad is no longer active';
  END IF;

  IF p_amount_inr < v_ad.min_limit OR p_amount_inr > v_ad.max_limit THEN
    RAISE EXCEPTION 'Amount is outside of ad limits';
  END IF;

  -- Validate amount calculation with a small tolerance for floating point rounding
  IF ABS((p_amount_usdt * p_rate) - p_amount_inr) > 1.0 THEN
    RAISE EXCEPTION 'Amount mismatch: % * % != %', p_amount_usdt, p_rate, p_amount_inr;
  END IF;

  -- Determine seller and order type
  IF v_ad.type = 'buy' THEN
    -- Ad creator wants to buy, so order creator is selling
    v_seller_id := auth.uid();
    v_order_type := 'sell';
  ELSE
    -- Ad creator wants to sell, so order creator is buying
    v_seller_id := v_ad.user_id;
    v_order_type := 'buy';
  END IF;

  -- Check seller balance
  IF (SELECT balance_usdt FROM public.profiles WHERE id = v_seller_id) < p_amount_usdt THEN
    RAISE EXCEPTION 'Seller has insufficient balance';
  END IF;

  -- Get platform fee from settings
  SELECT platform_fee INTO v_platform_fee_percent FROM public.app_settings LIMIT 1;
  v_platform_fee_amount := (p_amount_usdt * COALESCE(v_platform_fee_percent, 0)) / 100;

  -- Create order
  INSERT INTO public.orders (
    user_id,
    ad_id,
    type,
    amount_usdt,
    amount_inr,
    rate,
    status,
    platform_fee_amount,
    expires_at
  )
  VALUES (
    auth.uid(),
    p_ad_id,
    v_order_type,
    p_amount_usdt,
    p_amount_inr,
    p_rate,
    'pending',
    v_platform_fee_amount,
    (TIMEZONE('utc'::text, NOW()) + (v_ad.payment_window * INTERVAL '1 minute'))
  )
  RETURNING id INTO v_order_id;

  -- Lock funds in escrow
  UPDATE public.profiles 
  SET balance_usdt = balance_usdt - p_amount_usdt,
      escrow_balance_usdt = escrow_balance_usdt + p_amount_usdt
  WHERE id = v_seller_id;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cancel_expired_order(p_order_id UUID)
RETURNS void AS $$
DECLARE
  v_order RECORD;
  v_seller_id UUID;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status != 'pending' THEN
    RETURN; -- Already processed or cancelled
  END IF;

  -- Update order status
  UPDATE public.orders 
  SET status = 'cancelled',
      admin_feedback = 'Order expired automatically'
  WHERE id = p_order_id;

  -- Release escrow back to seller
  IF v_order.type = 'sell' THEN
    -- Order creator was seller
    v_seller_id := v_order.user_id;
  ELSE
    -- Ad creator was seller
    v_seller_id := (SELECT user_id FROM public.ads WHERE id = v_order.ad_id);
  END IF;

  UPDATE public.profiles 
  SET balance_usdt = balance_usdt + v_order.amount_usdt,
      escrow_balance_usdt = escrow_balance_usdt - v_order.amount_usdt
  WHERE id = v_seller_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.mark_p2p_order_as_paid(p_order_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.orders 
  SET status = 'paid' 
  WHERE id = p_order_id 
  AND (
    -- Only the buyer can mark as paid
    -- Order creator is buyer
    (type = 'buy' AND user_id = auth.uid()) OR
    -- Ad creator is buyer
    (type = 'sell' AND ad_id IN (SELECT id FROM ads WHERE user_id = auth.uid()))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.withdraw_usdt(
  p_amount NUMERIC,
  p_address TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_total_amount NUMERIC;
  v_tx_hash TEXT;
BEGIN
  v_total_amount := p_amount + 1.00; -- Network fee
  
  IF (SELECT balance_usdt FROM public.profiles WHERE id = auth.uid()) < v_total_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Generate dummy hash
  v_tx_hash := 'T' || encode(gen_random_bytes(20), 'hex');

  -- Deduct balance
  UPDATE public.profiles 
  SET balance_usdt = balance_usdt - v_total_amount 
  WHERE id = auth.uid();

  -- Record transaction
  INSERT INTO public.transactions (
    user_id,
    type,
    amount,
    status,
    tx_hash
  )
  VALUES (
    auth.uid(),
    'withdrawal',
    p_amount,
    'completed',
    v_tx_hash
  );

  RETURN v_tx_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to resolve P2P disputes
CREATE OR REPLACE FUNCTION public.resolve_p2p_dispute(
  p_dispute_id UUID,
  p_order_id UUID,
  p_winner_id UUID,
  p_admin_feedback TEXT
)
RETURNS void AS $$
DECLARE
  v_order RECORD;
  v_buyer_id UUID;
  v_seller_id UUID;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Determine buyer and seller
  IF v_order.type = 'buy' THEN
    -- Order creator is buying, ad creator is selling
    v_buyer_id := v_order.user_id;
    v_seller_id := (SELECT user_id FROM public.ads WHERE id = v_order.ad_id);
  ELSE
    -- Order creator is selling, ad creator is buying
    v_buyer_id := (SELECT user_id FROM public.ads WHERE id = v_order.ad_id);
    v_seller_id := v_order.user_id;
  END IF;

  -- Update dispute status
  UPDATE public.p2p_disputes 
  SET status = 'resolved', admin_feedback = p_admin_feedback 
  WHERE id = p_dispute_id;

  -- Handle funds based on winner
  IF p_winner_id = v_buyer_id THEN
    -- Buyer wins: release escrow to buyer (deduct platform fee)
    DECLARE
      v_platform_fee_pct NUMERIC;
      v_platform_fee_amount NUMERIC;
      v_net_amount NUMERIC;
    BEGIN
      SELECT platform_fee INTO v_platform_fee_pct FROM public.app_settings LIMIT 1;
      v_platform_fee_amount := (v_order.amount_usdt * v_platform_fee_pct) / 100.0;
      v_net_amount := v_order.amount_usdt - v_platform_fee_amount;

      UPDATE public.orders 
      SET status = 'completed', 
          escrow_released_at = NOW(),
          platform_fee_amount = v_platform_fee_amount 
      WHERE id = p_order_id;

      UPDATE public.profiles SET balance_usdt = balance_usdt + v_net_amount WHERE id = v_buyer_id;
      UPDATE public.profiles SET escrow_balance_usdt = escrow_balance_usdt - v_order.amount_usdt WHERE id = v_seller_id;
      UPDATE public.profiles SET trades_completed = trades_completed + 1 WHERE id = v_seller_id;
    END;
  ELSE
    -- Seller wins: return escrow to seller balance
    UPDATE public.orders SET status = 'cancelled' WHERE id = p_order_id;
    UPDATE public.profiles SET balance_usdt = balance_usdt + v_order.amount_usdt WHERE id = v_seller_id;
    UPDATE public.profiles SET escrow_balance_usdt = escrow_balance_usdt - v_order.amount_usdt WHERE id = v_seller_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to process withdrawals
CREATE OR REPLACE FUNCTION public.process_withdrawal(
  p_withdrawal_id UUID,
  p_status TEXT,
  p_feedback TEXT
)
RETURNS void AS $$
DECLARE
  v_withdrawal RECORD;
BEGIN
  SELECT * INTO v_withdrawal FROM public.withdrawals WHERE id = p_withdrawal_id;
  
  IF v_withdrawal IS NULL THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;

  IF v_withdrawal.status != 'pending' THEN
    RAISE EXCEPTION 'Withdrawal already processed';
  END IF;

  UPDATE public.withdrawals 
  SET status = p_status, admin_feedback = p_feedback, processed_at = NOW() 
  WHERE id = p_withdrawal_id;

  IF p_status = 'rejected' THEN
    -- Refund balance
    UPDATE public.profiles 
    SET balance_usdt = balance_usdt + v_withdrawal.amount 
    WHERE id = v_withdrawal.user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to approve direct deposit (buy order)
CREATE OR REPLACE FUNCTION public.approve_direct_deposit(p_order_id UUID)
RETURNS void AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status != 'pending' AND v_order.status != 'paid' THEN
    RAISE EXCEPTION 'Order is not in a state that can be approved';
  END IF;

  IF v_order.ad_id IS NOT NULL THEN
    RAISE EXCEPTION 'This is a P2P order, use release_p2p_order instead';
  END IF;

  UPDATE public.orders SET status = 'completed', updated_at = NOW() WHERE id = p_order_id;
  UPDATE public.profiles SET balance_usdt = balance_usdt + v_order.amount_usdt WHERE id = v_order.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to refresh all user stats (admin only)
CREATE OR REPLACE FUNCTION public.refresh_all_user_stats()
RETURNS void AS $$
DECLARE
  v_user_record RECORD;
  v_completed INTEGER;
  v_total INTEGER;
  v_rating_sum NUMERIC;
  v_rating_count INTEGER;
BEGIN
  -- Only admins can run this
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can refresh user stats';
  END IF;

  FOR v_user_record IN SELECT id FROM public.profiles LOOP
    -- Calculate trades where user was seller
    -- Seller is:
    -- 1. Ad creator if ad.type = 'sell' AND order.type = 'buy' (order creator is buying)
    -- 2. Order creator if ad.type = 'buy' AND order.type = 'sell' (order creator is selling)
    
    -- Completed trades
    SELECT COUNT(*) INTO v_completed
    FROM public.orders o
    JOIN public.ads a ON o.ad_id = a.id
    WHERE o.status = 'completed'
    AND (
      (a.type = 'sell' AND a.user_id = v_user_record.id) OR
      (a.type = 'buy' AND o.user_id = v_user_record.id)
    );

    -- Total trades (completed + cancelled)
    SELECT COUNT(*) INTO v_total
    FROM public.orders o
    JOIN public.ads a ON o.ad_id = a.id
    WHERE o.status IN ('completed', 'cancelled')
    AND (
      (a.type = 'sell' AND a.user_id = v_user_record.id) OR
      (a.type = 'buy' AND o.user_id = v_user_record.id)
    );

    -- Ratings
    SELECT COALESCE(SUM(rating), 0), COUNT(*) INTO v_rating_sum, v_rating_count
    FROM public.trade_reviews
    WHERE reviewee_id = v_user_record.id;

    -- Update profile
    UPDATE public.profiles
    SET 
      trades_completed = v_completed,
      total_trades = v_total,
      rating_sum = v_rating_sum,
      rating_count = v_rating_count,
      completion_rate = CASE 
        WHEN v_total > 0 THEN (v_completed::numeric / v_total::numeric) * 100.0
        ELSE 100.0
      END
    WHERE id = v_user_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to complete deposit from NowPayments webhook
CREATE OR REPLACE FUNCTION public.complete_deposit(
  p_payment_id TEXT,
  p_amount NUMERIC,
  p_tx_hash TEXT
)
RETURNS void AS $$
DECLARE
  v_tx RECORD;
BEGIN
  -- Find the transaction by payment_id (stored in tx_hash initially)
  SELECT * INTO v_tx FROM public.transactions 
  WHERE tx_hash = p_payment_id AND status = 'pending' AND type = 'deposit';
  
  IF v_tx IS NULL THEN
    RETURN; -- Transaction not found or already processed
  END IF;

  -- Update transaction status
  UPDATE public.transactions 
  SET status = 'completed', tx_hash = p_tx_hash, amount = p_amount 
  WHERE id = v_tx.id;

  -- Update user balance
  UPDATE public.profiles 
  SET balance_usdt = balance_usdt + p_amount 
  WHERE id = v_tx.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add demo balance for testing
CREATE OR REPLACE FUNCTION public.add_demo_balance(p_amount NUMERIC)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET balance_usdt = balance_usdt + p_amount
  WHERE id = auth.uid();

  INSERT INTO public.transactions (user_id, type, amount, status, tx_hash)
  VALUES (auth.uid(), 'deposit', p_amount, 'completed', 'DEMO_' || encode(gen_random_bytes(16), 'hex'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize app_settings if empty
INSERT INTO public.app_settings (id, buy_rate, sell_rate, platform_fee, referral_commission_l1, referral_commission_l2)
SELECT 1, 92.50, 89.00, 1.0, 10.0, 5.0
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);
