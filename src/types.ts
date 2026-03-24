export type OrderStatus = 'pending' | 'paid' | 'completed' | 'disputed' | 'cancelled';
export type OrderType = 'buy' | 'sell';
export type KYCStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type TransactionType = 'deposit' | 'withdrawal' | 'trade_escrow' | 'trade_release';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  is_admin: boolean;
  is_disabled: boolean;
  kyc_status: KYCStatus;
  balance_usdt: number;
  escrow_balance_usdt: number;
  is_verified_merchant: boolean;
  trades_completed: number;
  completion_rate: number;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  type: string;
  account_name: string;
  account_number?: string;
  ifsc?: string;
  upi_id?: string;
  is_active: boolean;
}

export interface Ad {
  id: string;
  user_id: string;
  type: OrderType;
  asset: string;
  pricing_type: 'fixed' | 'dynamic';
  price: number;
  margin?: number;
  min_limit: number;
  max_limit: number;
  payment_methods: string[];
  terms: string;
  status: 'active' | 'inactive';
  created_at: string;
  user_email?: string; // Joined
  is_verified_merchant?: boolean; // Joined
  trades_completed?: number; // Joined
  completion_rate?: number; // Joined
}

export interface Order {
  id: string;
  user_id: string;
  ad_id: string;
  type: OrderType;
  amount_usdt: number;
  amount_inr: number;
  rate: number;
  status: OrderStatus;
  payment_method_id?: string;
  payment_screenshot_url?: string;
  transaction_hash?: string;
  admin_feedback?: string;
  created_at: string;
  updated_at: string;
  user_profile?: UserProfile;
  ad?: Ad & { ad_profile?: UserProfile };
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  tx_hash?: string;
  created_at: string;
}

export interface KYCSubmission {
  id: string;
  user_id: string;
  document_type: string;
  document_front_url: string;
  document_back_url?: string;
  status: KYCStatus;
  admin_feedback?: string;
  created_at: string;
  user_email?: string; // Joined
}

export interface AppSettings {
  id: string;
  buy_rate: number;
  sell_rate: number;
  platform_fee: number;
  admin_wallet_address: string;
  support_contact: string;
  homepage_headline: string;
  homepage_subheadline: string;
}

export interface SupportChat {
  id: string;
  user_id: string;
  user_email: string;
  last_message?: string;
  last_message_at: string;
  unread_count: number;
  status: 'open' | 'closed';
  created_at: string;
}

export interface SupportMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  image_url?: string;
  is_admin_reply: boolean;
  created_at: string;
}

export interface MerchantFavorite {
  id: string;
  user_id: string;
  merchant_id: string;
  created_at: string;
}
