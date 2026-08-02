import express from "express";
import { handleIncomingMessage } from "./bot.js";
import { extractIncomingMessages, sendWhatsAppText, verifyMetaSignature } from "./meta.js";

const required = [
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_VERIFY_TOKEN",
  "META_APP_SECRET"
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) console.warn("missing_environment_variables", { missing });

const config = {
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
  appSecret: process.env.META_APP_SECRET ?? "",
  apiVersion: process.env.WHATSAPP_API_VERSION ?? "v23.0",
  websiteUrl: (process.env.SABKA_DELIVERY_WEBSITE_URL ?? "https://sabkadelivery.in").replace(/\/$/, ""),
  supportNumber: process.env.SUPPORT_WHATSAPP_NUMBER ?? "8011767897",
  orderApiUrl: process.env.ORDER_TRACKING_API_URL ?? "",
  orderApiKey: process.env.ORDER_TRACKING_API_KEY ?? ""
};

const processedMessages = new Map();
const app = express();

app.get("/", (_req, res) => {
  res.status(200).json({ service: "Sabka Delivery WhatsApp Bot", status: "running" });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, timestamp: new Date().toISOString() });
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === config.verifyToken && challenge) {
    return res.status(200).send(String(challenge));
  }
  return res.sendStatus(403);
});

app.post("/webhook", express.raw({ type: "application/json", limit: "1mb" }), (req, res) => {
  const rawBody = req.body;
  const signature = req.get("x-hub-signature-256") ?? "";

  if (!Buffer.isBuffer(rawBody) || !verifyMetaSignature(rawBody, signature, config.appSecret)) {
    return res.sendStatus(401);
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.sendStatus(400);
  }

  res.sendStatus(200);
  void processPayload(payload);
});

async function processPayload(payload) {
  for (const message of extractIncomingMessages(payload)) {
    if (isDuplicate(message.id)) continue;
    try {
      const reply = await handleIncomingMessage({
        phone: message.from,
        text: message.text,
        config,
        trackOrder
      });
      await sendWhatsAppText(message.from, reply, config);
      console.log("message_processed", { messageId: message.id, from: maskPhone(message.from) });
    } catch (error) {
      console.error("message_processing_failed", {
        messageId: message.id,
        message: error.message,
        details: error.details ?? undefined
      });
    }
  }
}

function isDuplicate(messageId) {
  const now = Date.now();
  for (const [id, timestamp] of processedMessages) {
    if (now - timestamp > 24 * 60 * 60 * 1000) processedMessages.delete(id);
  }
  if (processedMessages.has(messageId)) return true;
  processedMessages.set(messageId, now);
  return false;
}

async function trackOrder(orderId, mobile, currentConfig) {
  const url = new URL(currentConfig.orderApiUrl);
  url.searchParams.set("orderCode", orderId);
  url.searchParams.set("mobile", mobile);

  const headers = { Accept: "application/json" };
  if (currentConfig.orderApiKey) headers.Authorization = `Bearer ${currentConfig.orderApiKey}`;

  const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  const data = await response.json().catch(() => ({}));
  if (response.status === 404) return "Order not found. Please check the Order ID and registered mobile number.";
  if (!response.ok) throw new Error(`Order API failed with ${response.status}`);

  const order = data.order ?? data;
  const code = order.orderCode ?? order.order_code ?? orderId;
  const status = order.status ?? "Status unavailable";
  const store = order.storeName ?? order.store_name ?? "Sabka Delivery";
  const total = order.total ?? order.grandTotal ?? order.grand_total;

  return [
    "📦 Order Status",
    "",
    `Order ID: ${code}`,
    `Status: ${status}`,
    `Store: ${store}`,
    total != null ? `Total: ₹${total}` : null
  ].filter(Boolean).join("\n");
}

function maskPhone(phone) {
  return phone.length > 4 ? `${"*".repeat(phone.length - 4)}${phone.slice(-4)}` : "****";
}

const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => {
  console.log("server_started", { port });
});
