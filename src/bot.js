const MENU_TEXT = `👋 Welcome to Sabka Delivery

Please choose an option:

1️⃣ Food
2️⃣ Grocery
3️⃣ Electronics
4️⃣ Track Order
5️⃣ Offers
6️⃣ Customer Support
7️⃣ Visit Website

Reply with a number or option name.`;

const SUPPORT_TEXT = `🛟 Customer Support

1️⃣ Order Problem
2️⃣ Payment Issue
3️⃣ Delivery Issue
4️⃣ Cancel Order
5️⃣ Talk to Human

Reply with a number.`;

const sessions = new Map();

export function normalizeText(value = "") {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isGreetingOrActivation(text) {
  const value = normalizeText(text);
  if (!value) return false;

  const exact = new Set([
    "hi", "hii", "hiii", "hello", "helo", "hey", "help", "support", "menu",
    "customer support", "sabka delivery", "hello sabka delivery", "hi sabka delivery",
    "mujhe support chahiye", "order problem", "payment issue", "delivery issue",
    "delivery late hai", "cancel order"
  ]);

  return exact.has(value)
    || value.includes("hello sabka delivery")
    || value.includes("hi sabka delivery")
    || value.includes("support chahiye");
}

function getSession(phone) {
  if (!sessions.has(phone)) sessions.set(phone, { state: "MAIN", data: {} });
  return sessions.get(phone);
}

function resetSession(phone) {
  sessions.set(phone, { state: "MAIN", data: {} });
}

function mainChoice(value) {
  const text = normalizeText(value);
  if (["1", "food"].includes(text)) return "FOOD";
  if (["2", "grocery"].includes(text)) return "GROCERY";
  if (["3", "electronics", "electronic"].includes(text)) return "ELECTRONICS";
  if (["4", "track", "track order", "order tracking"].includes(text)) return "TRACK";
  if (["5", "offer", "offers"].includes(text)) return "OFFERS";
  if (["6", "support", "customer support"].includes(text)) return "SUPPORT";
  if (["7", "website", "visit website"].includes(text)) return "WEBSITE";
  return null;
}

export async function handleIncomingMessage({ phone, text, config, trackOrder }) {
  const normalized = normalizeText(text);
  const session = getSession(phone);

  if (["menu", "main menu", "restart", "start"].includes(normalized) || isGreetingOrActivation(text)) {
    resetSession(phone);
    return MENU_TEXT;
  }

  if (["back", "cancel"].includes(normalized)) {
    resetSession(phone);
    return MENU_TEXT;
  }

  if (session.state === "WAIT_ORDER_ID") {
    session.data.orderId = text.trim();
    session.state = "WAIT_ORDER_PHONE";
    return "Please send the registered 10-digit mobile number.";
  }

  if (session.state === "WAIT_ORDER_PHONE") {
    const mobile = normalized.replace(/\D/g, "").slice(-10);
    if (!/^\d{10}$/.test(mobile)) return "Please send a valid 10-digit mobile number.";

    const orderId = session.data.orderId;
    resetSession(phone);

    if (!config.orderApiUrl) {
      return `Order tracking is not connected yet.\n\nOrder ID: ${orderId}\nMobile: ${mobile}\n\nPlease visit ${config.websiteUrl}/ or choose Customer Support.`;
    }

    try {
      return await trackOrder(orderId, mobile, config);
    } catch (error) {
      console.error("track_order_failed", { message: error.message });
      return "Sorry, order tracking is temporarily unavailable. Please try again later or choose Customer Support.";
    }
  }

  if (session.state === "SUPPORT_MENU") {
    if (["1", "2", "3", "4"].includes(normalized)) {
      session.state = "WAIT_SUPPORT_MESSAGE";
      session.data.supportType = {
        "1": "Order Problem",
        "2": "Payment Issue",
        "3": "Delivery Issue",
        "4": "Cancel Order"
      }[normalized];
      return `Please describe your ${session.data.supportType.toLowerCase()} and include your Order ID if available.`;
    }
    if (normalized === "5" || normalized === "talk to human") {
      session.state = "WAIT_SUPPORT_MESSAGE";
      session.data.supportType = "Talk to Human";
      return "Please type your problem. Our support team will review it.";
    }
    return SUPPORT_TEXT;
  }

  if (session.state === "WAIT_SUPPORT_MESSAGE") {
    const type = session.data.supportType || "Customer Support";
    resetSession(phone);
    console.log("support_request", { phone, type, message: text });
    return `✅ Your ${type} request has been recorded.\n\nOur support team will contact you soon.\n\nFor urgent help: ${config.supportNumber}`;
  }

  const choice = mainChoice(text);
  switch (choice) {
    case "FOOD":
      return `🍔 Order food from Sabka Delivery:\n${config.websiteUrl}`;
    case "GROCERY":
      return `🛒 Order grocery from Sabka Delivery:\n${config.websiteUrl}`;
    case "ELECTRONICS":
      return `📱 Browse electronics on Sabka Delivery:\n${config.websiteUrl}`;
    case "TRACK":
      session.state = "WAIT_ORDER_ID";
      return "Please send your Order ID.";
    case "OFFERS":
      return `🎁 Check current Sabka Delivery offers here:\n${config.websiteUrl}`;
    case "SUPPORT":
      session.state = "SUPPORT_MENU";
      return SUPPORT_TEXT;
    case "WEBSITE":
      return `🌐 Visit Sabka Delivery:\n${config.websiteUrl}`;
    default:
      return `Sorry, I didn't understand that.\n\n${MENU_TEXT}`;
  }
}

export { MENU_TEXT, SUPPORT_TEXT };
