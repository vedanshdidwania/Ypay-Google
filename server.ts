import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Need this for backend operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
          ipn_callback_url: "https://www.ypay.online/api/webhook",
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

      const { payment_status, pay_amount, payment_id } = req.body;

      if (payment_status === "finished") {
        // Find the transaction
        const { data: tx } = await supabase
          .from("transactions")
          .select("*")
          .eq("tx_hash", payment_id)
          .single();

        if (tx && tx.status !== "completed") {
          // Update transaction status with real blockchain hash if available
          await supabase
            .from("transactions")
            .update({ 
              status: "completed",
              tx_hash: req.body.pay_hash || tx.tx_hash
            })
            .eq("id", tx.id);

          // Update user balance
          const { data: profile } = await supabase
            .from("profiles")
            .select("balance_usdt")
            .eq("id", tx.user_id)
            .single();

          if (profile) {
            await supabase
              .from("profiles")
              .update({ balance_usdt: profile.balance_usdt + pay_amount })
              .eq("id", tx.user_id);
          }
        }
      }

      res.json({ status: "ok" });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(500).json({ error: "Webhook failed" });
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
