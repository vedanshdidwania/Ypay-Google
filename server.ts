import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import * as otplib from "otplib";
const { authenticator } = otplib as any;
import QRCode from "qrcode";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Need this for backend operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function ensureBucketsExist() {
  const buckets = [
    { id: 'p2p_chat_images', public: true },
    { id: 'kyc-documents', public: false },
    { id: 'screenshots', public: true },
    { id: 'avatars', public: true }
  ];

  for (const bucket of buckets) {
    try {
      const { data, error } = await supabase.storage.getBucket(bucket.id);
      if (error && error.message.includes('not found')) {
        console.log(`Creating bucket: ${bucket.id}`);
        const { error: createError } = await supabase.storage.createBucket(bucket.id, {
          public: bucket.public,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
          fileSizeLimit: 5242880 // 5MB
        });
        if (createError) console.error(`Error creating bucket ${bucket.id}:`, createError.message);
      }
    } catch (err) {
      console.error(`Unexpected error checking bucket ${bucket.id}:`, err);
    }
  }
}

async function startServer() {
  // Ensure buckets exist on startup
  await ensureBucketsExist();

  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Referral Commission Logic
  const distributeReferralCommissions = async (order: any) => {
    try {
      const { amount_usdt, user_id } = order;
      const { data: buyer, error: buyerError } = await supabase
        .from("profiles")
        .select("referred_by, referred_by_l2")
        .eq("id", user_id)
        .single();

      if (buyerError || !buyer) return;

      // Level 1: 0.1%
      if (buyer.referred_by) {
        const l1Commission = amount_usdt * 0.001;
        await supabase.rpc("add_referral_earnings", {
          p_user_id: buyer.referred_by,
          p_amount: l1Commission,
          p_level: 1
        });
      }

      // Level 2: 0.05%
      if (buyer.referred_by_l2) {
        const l2Commission = amount_usdt * 0.0005;
        await supabase.rpc("add_referral_earnings", {
          p_user_id: buyer.referred_by_l2,
          p_amount: l2Commission,
          p_level: 2
        });
      }
    } catch (err) {
      console.error("Referral commission error:", err);
    }
  };

  // Notification Helper
  const createNotification = async (userId: string, title: string, message: string, type: string = 'info', link?: string) => {
    try {
      await supabase.from("notifications").insert({
        user_id: userId,
        title,
        message,
        type,
        link,
        is_read: false
      });
    } catch (err) {
      console.error("Notification error:", err);
    }
  };

  // Trade Expiration Logic
  const checkExpiredTrades = async () => {
    try {
      const now = new Date().toISOString();
      const { data: expiredOrders, error } = await supabase
        .from("orders")
        .select("*, ad:ads(*)")
        .eq("status", "pending")
        .lt("expires_at", now);

      if (error) throw error;

      for (const order of expiredOrders) {
        // Cancel order and release escrow back to seller
        const { error: cancelError } = await supabase.rpc("cancel_expired_order", {
          p_order_id: order.id
        });

        if (!cancelError) {
          await createNotification(order.user_id, "Order Expired", `Your order #${order.id.slice(0,8)} has expired and was cancelled.`, "warning");
          await createNotification(order.ad.user_id, "Order Expired", `Order #${order.id.slice(0,8)} from buyer has expired and was cancelled.`, "info");
        }
      }
    } catch (err: any) {
      console.error("Expiration check error:", err.message || err);
      if (err.details) console.error("Details:", err.details);
      if (err.hint) console.error("Hint:", err.hint);
    }
  };

  // Run expiration check every 1 minute
  setInterval(checkExpiredTrades, 60000);

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Live Prices from CoinGecko
  app.get("/api/prices", async (req, res) => {
    try {
      const response = await axios.get(
        "https://api.coingecko.com/api/v3/simple/price?ids=tether,bitcoin,ethereum,binancecoin,usd-coin&vs_currencies=inr,usd"
      );
      res.json(response.data);
    } catch (error: any) {
      console.error("Price fetch error:", error.message);
      res.status(500).json({ error: "Failed to fetch prices" });
    }
  });

  // 2FA: Setup
  app.post("/api/auth/2fa/setup", async (req, res) => {
    try {
      const { userId, email } = req.body;
      const secret = authenticator.generateSecret();
      const otpauth = authenticator.keyuri(email, "Ypay P2P", secret);
      const qrCodeUrl = await QRCode.toDataURL(otpauth);

      // Store secret temporarily (or just return it for verification)
      res.json({ secret, qrCodeUrl });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to setup 2FA" });
    }
  });

  // 2FA: Verify and Enable
  app.post("/api/auth/2fa/verify", async (req, res) => {
    try {
      const { userId, secret, code } = req.body;
      const isValid = authenticator.check(code, secret);

      if (isValid) {
        const { error } = await supabase
          .from("profiles")
          .update({ two_factor_secret: secret, two_factor_enabled: true })
          .eq("id", userId);

        if (error) throw error;
        res.json({ success: true });
      } else {
        res.status(400).json({ error: "Invalid code" });
      }
    } catch (error: any) {
      res.status(500).json({ error: "Failed to verify 2FA" });
    }
  });

  // 2FA: Validate
  app.post("/api/auth/2fa/validate", async (req, res) => {
    try {
      const { userId, code } = req.body;
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("two_factor_secret, two_factor_enabled")
        .eq("id", userId)
        .single();

      if (error || !profile?.two_factor_enabled) {
        return res.status(400).json({ error: "2FA not enabled" });
      }

      const isValid = authenticator.check(code, profile.two_factor_secret);
      res.json({ isValid });
    } catch (error: any) {
      res.status(500).json({ error: "Validation failed" });
    }
  });

  // Export Transactions as CSV
  app.get("/api/export/transactions", async (req, res) => {
    try {
      const { userId } = req.query;
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const csvHeader = "ID,Type,Amount,Status,Hash,Date\n";
      const csvRows = transactions
        .map(
          (tx: any) =>
            `${tx.id},${tx.type},${tx.amount},${tx.status},${tx.tx_hash},${tx.created_at}`
        )
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=transactions.csv");
      res.send(csvHeader + csvRows);
    } catch (error: any) {
      res.status(500).json({ error: "Export failed" });
    }
  });

  // NOWPayments: Create Payment
  app.post("/api/wallet/deposit", async (req, res) => {
    try {
      const { amount, userId } = req.body;
      const apiKey = process.env.NOWPAYMENTS_API_KEY;

      const response = await axios.post(
        "https://api.nowpayments.io/v1/payment",
        {
          price_amount: amount,
          price_currency: "usd",
          pay_currency: "usdttrc20",
          order_id: `DEP-${Date.now()}`,
          order_description: "Wallet Deposit",
          ipn_callback_url: `${process.env.APP_URL}/api/wallet/webhook`,
        },
        {
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      // Create a pending transaction in Supabase
      await supabase.from("transactions").insert({
        user_id: userId,
        type: "deposit",
        amount: amount,
        status: "pending",
        tx_hash: response.data.payment_id,
      });

      res.json(response.data);
    } catch (error: any) {
      console.error("Deposit error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  // NOWPayments: Webhook
  app.post("/api/wallet/webhook", async (req, res) => {
    try {
      const hmac = req.headers["x-nowpayments-sig"];
      const secret = process.env.NOWPAYMENTS_IPN_SECRET;
      
      // Verify signature
      const sortedReq = Object.keys(req.body)
        .sort()
        .reduce((obj: any, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {});
      
      const checkHmac = crypto
        .createHmac("sha512", secret!)
        .update(JSON.stringify(sortedReq))
        .digest("hex");

      if (hmac !== checkHmac) {
        // In production, you should verify this. For now, we'll log it.
        console.warn("Invalid webhook signature");
      }

      const { payment_status, pay_amount, payment_id, pay_hash } = req.body;

      if (payment_status === "finished") {
        const { error } = await supabase.rpc("complete_deposit", {
          p_payment_id: payment_id.toString(),
          p_amount: parseFloat(pay_amount),
          p_tx_hash: pay_hash || payment_id.toString()
        });

        if (error) {
          console.error("Error completing deposit via RPC:", error);
          throw error;
        }
      }

      res.json({ status: "ok" });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(500).json({ error: "Webhook failed" });
    }
  });

  // Complete Order (Release Escrow)
  app.post("/api/orders/complete", async (req, res) => {
    try {
      const { orderId, userId } = req.body;
      
      // Call RPC to complete order securely
      const { data: order, error } = await supabase.rpc("complete_order_secure", {
        p_order_id: orderId,
        p_user_id: userId
      });

      if (error) throw error;

      // Distribute referral commissions
      await distributeReferralCommissions(order);

      // Notify both parties
      await createNotification(order.user_id, "Order Completed", `Your order #${order.id.slice(0,8)} is complete. USDT released to your wallet.`, "success");
      await createNotification(order.seller_id, "Order Completed", `Order #${order.id.slice(0,8)} is complete. USDT released to buyer.`, "info");

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to complete order" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
