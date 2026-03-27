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

/* =========================
   ✅ ENV VALIDATION
========================= */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables");
  console.error("SUPABASE_URL:", !!supabaseUrl);
  console.error("SUPABASE_SERVICE_ROLE_KEY:", !!supabaseServiceKey);
  process.exit(1);
}

// Remove accidental quotes
const cleanUrl = supabaseUrl.replace(/^"|"$/g, "");
const cleanKey = supabaseServiceKey.replace(/^"|"$/g, "");

console.log("✅ Supabase initialized");
console.log("URL:", cleanUrl);
console.log("Key length:", cleanKey.length);

/* =========================
   ✅ SUPABASE CLIENT
========================= */

const supabase = createClient(cleanUrl, cleanKey);

/* =========================
   STORAGE BUCKET SETUP
========================= */

async function ensureBucketsExist() {
  const buckets = [
    { id: "p2p_chat_images", public: true },
    { id: "kyc-documents", public: false },
    { id: "screenshots", public: true },
    { id: "avatars", public: true },
  ];

  for (const bucket of buckets) {
    try {
      const { error } = await supabase.storage.getBucket(bucket.id);

      if (error && error.message.includes("not found")) {
        console.log(`Creating bucket: ${bucket.id}`);
        await supabase.storage.createBucket(bucket.id, {
          public: bucket.public,
          allowedMimeTypes: [
            "image/png",
            "image/jpeg",
            "image/webp",
            "application/pdf",
          ],
          fileSizeLimit: 5242880,
        });
      }
    } catch (err) {
      console.error(`Bucket error (${bucket.id}):`, err);
    }
  }
}

/* =========================
   SERVER START
========================= */

async function startServer() {
  await ensureBucketsExist();

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  /* =========================
     NOTIFICATIONS
  ========================= */

  const createNotification = async (
    userId: string,
    title: string,
    message: string,
    type: string = "info",
    link?: string
  ) => {
    try {
      await supabase.from("notifications").insert({
        user_id: userId,
        title,
        message,
        type,
        link,
        is_read: false,
      });
    } catch (err) {
      console.error("Notification error:", err);
    }
  };

  /* =========================
     TRADE EXPIRATION
  ========================= */

  const checkExpiredTrades = async () => {
    console.log("⏳ Checking expired trades...");
    try {
      const now = new Date().toISOString();

      const { data: expiredOrders, error } = await supabase
        .from("orders")
        .select("*, ad:ads(*)")
        .eq("status", "pending")
        .lt("expires_at", now);

      if (error) throw error;

      for (const order of expiredOrders || []) {
        const { error: cancelError } = await supabase.rpc(
          "cancel_expired_order",
          { p_order_id: order.id }
        );

        if (!cancelError) {
          await createNotification(
            order.user_id,
            "Order Expired",
            `Order #${order.id.slice(0, 8)} expired.`,
            "warning"
          );

          await createNotification(
            order.ad.user_id,
            "Order Expired",
            `Buyer order #${order.id.slice(0, 8)} expired.`,
            "info"
          );
        }
      }
    } catch (err: any) {
      console.error("❌ Expiration error:", err.message);
    }
  };

  setInterval(checkExpiredTrades, 60000);

  /* =========================
     HEALTH CHECK
  ========================= */

  app.get("/api/health", (_, res) => {
    res.json({ status: "ok" });
  });

  /* =========================
     PRICE API
  ========================= */

  let priceCache: any = {};
  let lastFetch = 0;

  app.get("/api/prices", async (_, res) => {
    try {
      const now = Date.now();

      if (now - lastFetch < 60000) {
        return res.json(priceCache);
      }

      const { data } = await axios.get(
        "https://api.coingecko.com/api/v3/simple/price?ids=tether,bitcoin,ethereum,binancecoin,usd-coin&vs_currencies=inr,usd"
      );

      priceCache = data;
      lastFetch = now;

      res.json(data);
    } catch {
      res.json(priceCache);
    }
  });

  /* =========================
     2FA
  ========================= */

  app.post("/api/auth/2fa/setup", async (req, res) => {
    const { email } = req.body;

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(email, "Ypay", secret);
    const qr = await QRCode.toDataURL(otpauth);

    res.json({ secret, qr });
  });

  app.post("/api/auth/2fa/verify", async (req, res) => {
    const { userId, secret, code } = req.body;

    const valid = authenticator.check(code, secret);

    if (!valid) return res.status(400).json({ error: "Invalid code" });

    await supabase
      .from("profiles")
      .update({ two_factor_secret: secret, two_factor_enabled: true })
      .eq("id", userId);

    res.json({ success: true });
  });

  /* =========================
     NOWPAYMENTS
  ========================= */

  app.post("/api/wallet/deposit", async (req, res) => {
    try {
      const { amount, userId } = req.body;

      const response = await axios.post(
        "https://api.nowpayments.io/v1/payment",
        {
          price_amount: amount,
          price_currency: "usd",
          pay_currency: "usdttrc20",
          order_id: `DEP-${Date.now()}`,
          ipn_callback_url: `${process.env.APP_URL}/api/wallet/webhook`,
        },
        {
          headers: {
            "x-api-key": process.env.NOWPAYMENTS_API_KEY!,
          },
        }
      );

      await supabase.from("transactions").insert({
        user_id: userId,
        type: "deposit",
        amount,
        status: "pending",
        tx_hash: response.data.payment_id,
      });

      res.json(response.data);
    } catch (err: any) {
      console.error(err.response?.data || err.message);
      res.status(500).json({ error: "Deposit failed" });
    }
  });

  /* =========================
     STATIC / VITE
  ========================= */

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_, res) =>
      res.sendFile(path.join(distPath, "index.html"))
    );
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on ${PORT}`);
  });
}

startServer();
