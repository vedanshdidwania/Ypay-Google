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

-- Create p2p_orders table
CREATE TABLE p2p_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount_usdt NUMERIC NOT NULL,
  amount_fiat NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, paid, completed, disputed, cancelled
  dispute_status TEXT DEFAULT 'none', -- none, active, resolved
  dispute_reason TEXT,
  disputed_at TIMESTAMP WITH TIME ZONE,
  payment_proof_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES p2p_orders(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
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

-- RLS Policies

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update profiles" ON profiles FOR UPDATE USING (public.is_admin());

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read active ads" ON ads FOR SELECT USING (status = 'active');
CREATE POLICY "Users can manage own ads" ON ads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all ads" ON ads FOR ALL USING (public.is_admin());

ALTER TABLE p2p_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own p2p orders" ON p2p_orders FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Users can create p2p orders" ON p2p_orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Users can update own p2p orders" ON p2p_orders FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Admins can manage all p2p orders" ON p2p_orders FOR ALL USING (public.is_admin());

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read messages for their orders" ON chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM p2p_orders WHERE id = order_id AND (buyer_id = auth.uid() OR seller_id = auth.uid()))
);
CREATE POLICY "Users can send messages for their orders" ON chat_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM p2p_orders WHERE id = order_id AND (buyer_id = auth.uid() OR seller_id = auth.uid()))
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read/create own kyc" ON kyc_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own kyc" ON kyc_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all kyc" ON kyc_submissions FOR ALL USING (public.is_admin());

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all transactions" ON transactions FOR ALL USING (public.is_admin());

ALTER TABLE user_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own payment methods" ON user_payment_methods FOR ALL USING (auth.uid() = user_id);

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
