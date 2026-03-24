-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_disabled BOOLEAN DEFAULT FALSE,
  is_verified_merchant BOOLEAN DEFAULT FALSE,
  trades_completed INTEGER DEFAULT 0,
  completion_rate NUMERIC DEFAULT 100.0,
  kyc_status TEXT DEFAULT 'none', -- none, pending, approved, rejected
  balance_usdt NUMERIC DEFAULT 0.00,
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
CREATE TABLE ads (
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
  terms TEXT,
  status TEXT DEFAULT 'active', -- active, inactive
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create orders table
CREATE TABLE orders (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create app_settings table
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buy_rate NUMERIC DEFAULT 92.50,
  sell_rate NUMERIC DEFAULT 89.00,
  platform_fee NUMERIC DEFAULT 1.0,
  admin_wallet_address TEXT,
  support_contact TEXT,
  homepage_headline TEXT DEFAULT 'Trade USDT with Zero Friction',
  homepage_subheadline TEXT DEFAULT 'The most secure P2P platform for USDT transactions in India.',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create payment_methods table (Admin-defined for Buy orders)
CREATE TABLE payment_methods (
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
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create notifications table
CREATE TABLE notifications (
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
CREATE TABLE kyc_submissions (
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
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- deposit, withdrawal, trade_escrow, trade_release
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, completed, failed
  tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create user_payment_methods table
CREATE TABLE user_payment_methods (
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
CREATE TABLE merchant_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  merchant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, merchant_id)
);

-- Create support_chats table
CREATE TABLE support_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- open, closed
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create support_messages table
CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES support_chats(id) ON DELETE CASCADE NOT NULL,
  sender_id TEXT NOT NULL, -- can be user_id or 'admin'
  content TEXT NOT NULL,
  image_url TEXT,
  is_admin_reply BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 1. Update Profiles for Ratings and Security Deposit
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='rating_sum') THEN
        ALTER TABLE profiles ADD COLUMN rating_sum NUMERIC DEFAULT 0.0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='rating_count') THEN
        ALTER TABLE profiles ADD COLUMN rating_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='security_deposit_amount') THEN
        ALTER TABLE profiles ADD COLUMN security_deposit_amount NUMERIC DEFAULT 0.0;
    END IF;
END $$;

-- 2. Update Orders for Escrow Tracking
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='escrow_locked_at') THEN
        ALTER TABLE orders ADD COLUMN escrow_locked_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='escrow_released_at') THEN
        ALTER TABLE orders ADD COLUMN escrow_released_at TIMESTAMP WITH TIME ZONE;
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

-- 4. Function to Update Profile Stats on Review
CREATE OR REPLACE FUNCTION public.update_profile_rating()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles
  SET 
    rating_sum = rating_sum + NEW.rating,
    rating_count = rating_count + 1,
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
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (public.is_admin());

-- Ads
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read active ads" ON ads FOR SELECT USING (status = 'active');
CREATE POLICY "Users can manage own ads" ON ads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all ads" ON ads FOR ALL USING (public.is_admin());

-- Orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own orders" ON orders FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM ads WHERE id = ad_id AND user_id = auth.uid()) OR 
  public.is_admin()
);
CREATE POLICY "Users can create orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own orders" ON orders FOR UPDATE USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM ads WHERE id = ad_id AND user_id = auth.uid()) OR 
  public.is_admin()
);
CREATE POLICY "Admins can manage all orders" ON orders FOR ALL USING (public.is_admin());

-- App Settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read app settings" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage app settings" ON app_settings FOR ALL USING (public.is_admin());

-- Payment Methods (Admin)
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read active payment methods" ON payment_methods FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage payment methods" ON payment_methods FOR ALL USING (public.is_admin());

-- Chat Messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read messages for their orders" ON chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (user_id = auth.uid() OR EXISTS (SELECT 1 FROM ads WHERE id = ad_id AND user_id = auth.uid()))) OR public.is_admin()
);
CREATE POLICY "Users can send messages for their orders" ON chat_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (user_id = auth.uid() OR EXISTS (SELECT 1 FROM ads WHERE id = ad_id AND user_id = auth.uid()))) OR public.is_admin()
);

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Admins can create notifications" ON notifications FOR INSERT WITH CHECK (public.is_admin());

-- KYC Submissions
ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read/create own kyc" ON kyc_submissions FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users can create own kyc" ON kyc_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all kyc" ON kyc_submissions FOR ALL USING (public.is_admin());

-- Transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users can create own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all transactions" ON transactions FOR ALL USING (public.is_admin());

-- User Payment Methods
ALTER TABLE user_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own payment methods" ON user_payment_methods FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- Merchant Favorites
ALTER TABLE merchant_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own favorites" ON merchant_favorites FOR ALL USING (auth.uid() = user_id);

-- Support Chats
ALTER TABLE support_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read/create own support chats" ON support_chats FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users can create own support chats" ON support_chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all support chats" ON support_chats FOR ALL USING (public.is_admin());

-- Support Messages
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read messages for their chats" ON support_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM support_chats WHERE id = chat_id AND user_id = auth.uid()) OR public.is_admin()
);
CREATE POLICY "Users can send messages for their chats" ON support_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM support_chats WHERE id = chat_id AND user_id = auth.uid()) OR public.is_admin()
);

-- Create p2p_disputes table
CREATE TABLE p2p_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  raised_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- open, resolved
  admin_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE p2p_disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own disputes" ON p2p_disputes FOR SELECT USING (
  raised_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (user_id = auth.uid() OR EXISTS (SELECT 1 FROM ads WHERE id = ad_id AND user_id = auth.uid()))) OR 
  public.is_admin()
);
CREATE POLICY "Users can create disputes" ON p2p_disputes FOR INSERT WITH CHECK (raised_by = auth.uid());
CREATE POLICY "Admins can manage all disputes" ON p2p_disputes FOR ALL USING (public.is_admin());

-- Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('p2p_chat_images', 'p2p_chat_images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('screenshots', 'screenshots', true) ON CONFLICT (id) DO NOTHING;

-- Storage Policies for p2p_chat_images
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'p2p_chat_images');
CREATE POLICY "Authenticated users can upload chat images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'p2p_chat_images' AND auth.role() = 'authenticated');

-- Storage Policies for kyc-documents
CREATE POLICY "Admins can read KYC documents" ON storage.objects FOR SELECT USING (bucket_id = 'kyc-documents' AND public.is_admin());
CREATE POLICY "Users can upload own KYC documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'kyc-documents' AND auth.role() = 'authenticated');

-- Storage Policies for screenshots
CREATE POLICY "Public Access Screenshots" ON storage.objects FOR SELECT USING (bucket_id = 'screenshots');
CREATE POLICY "Authenticated users can upload screenshots" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'screenshots' AND auth.role() = 'authenticated');

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE support_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Trigger for profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
