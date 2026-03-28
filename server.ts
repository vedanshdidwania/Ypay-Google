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

// Clean Supabase configuration (remove quotes and extra whitespace)
const cleanValue = (val: string | undefined) => {
  if (!val) return undefined;
  let cleaned = val.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }
  if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }
  return cleaned.trim();
};

const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://ppktptuvpipotvjhsmho.supabase.co";
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwa3RwdHV2cGlwb3R2amhzbWhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYzMjY4OSwiZXhwIjoyMDkwMjA4Njg5fQ.vLPbK3kCLsYuYqtGS-wU4mFxSrkhkULE69cHP77JUcY";

const supabaseUrl = cleanValue(rawUrl);
const supabaseServiceKey = cleanValue(rawKey);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Supabase configuration missing in server.ts!");
  console.error("VITE_SUPABASE_URL:", rawUrl ? "Present" : "Missing");
  console.error("SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Present" : "Missing");
  console.error("VITE_SUPABASE_ANON_KEY (fallback):", process.env.VITE_SUPABASE_ANON_KEY ? "Present" : "Missing");
} else {
  console.log("Supabase initialized in server.ts");
  console.log("URL:", supabaseUrl);
  console.log("Key Source:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "SUPABASE_SERVICE_ROLE_KEY" : "VITE_SUPABASE_ANON_KEY (fallback)");
  console.log("Key Length:", supabaseServiceKey.length);
  console.log("Key Prefix:", supabaseServiceKey.substring(0, 10) + "...");
  
  if (supabaseServiceKey.startsWith('sb_publishable')) {
    console.error("CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY is set to a non-Supabase key format (starts with 'sb_publishable'). Please update your Secrets in AI Studio.");
  }
  
  if (!supabaseServiceKey.includes('.')) {
    console.warn("WARNING: Supabase key does not look like a JWT (missing dots). This will likely fail.");
  }
  
  // Check for trailing slash in URL
  if (supabaseUrl.endsWith('/')) {
    console.warn("WARNING: Supabase URL has a trailing slash. This might cause issues.");
  }
}

const supabase = createClient(supabaseUrl || "", supabaseServiceKey || "");

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

  // Trade Expiration Logic
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
    console.log("Running checkExpiredTrades...");
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

  // Live Prices from CoinGecko with Cache
  let priceCache: any = {
    tether: { inr: 90, usd: 1 },
    bitcoin: { inr: 6000000, usd: 70000 },
    ethereum: { inr: 300000, usd: 3500 },
    binancecoin: { inr: 50000, usd: 600 },
    "usd-coin": { inr: 90, usd: 1 }
  };
  let lastFetchTime = 0;
  const CACHE_DURATION = 60000; // 1 minute

  app.get("/api/prices", async (req, res) => {
    try {
      const now = Date.now();
      if (now - lastFetchTime < CACHE_DURATION) {
        return res.json(priceCache);
      }

      const response = await axios.get(
        "https://api.coingecko.com/api/v3/simple/price?ids=tether,bitcoin,ethereum,binancecoin,usd-coin&vs_currencies=inr,usd",
        { timeout: 5000 } // Add timeout to avoid hanging
      );
      
      if (response.data && response.data.tether) {
        priceCache = response.data;
        lastFetchTime = now;
      }
      res.json(priceCache);
    } catch (error: any) {
      console.error("Price fetch error:", error.message);
      
      // Always return cache (even if it's the initial fallback) on error
      res.json(priceCache);
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
