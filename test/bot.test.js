import test from "node:test";
import assert from "node:assert/strict";
import { handleIncomingMessage, isGreetingOrActivation, normalizeText } from "../src/bot.js";

const config = {
  websiteUrl: "https://sabkadelivery.in",
  supportNumber: "8011767897",
  orderApiUrl: ""
};

const trackOrder = async () => "tracked";

test("normalizes punctuation and spaces", () => {
  assert.equal(normalizeText("  Hello,   Sabka Delivery!!! "), "hello sabka delivery");
});

test("recognizes Sabka Delivery greetings", () => {
  assert.equal(isGreetingOrActivation("Hello Sabka Delivery"), true);
  assert.equal(isGreetingOrActivation("HELLO, SABKA DELIVERY!!!"), true);
  assert.equal(isGreetingOrActivation("Hi Sabka Delivery, mujhe support chahiye"), true);
});

test("opens main menu for greeting", async () => {
  const reply = await handleIncomingMessage({ phone: "910000000001", text: "Hello Sabka Delivery", config, trackOrder });
  assert.match(reply, /Welcome to Sabka Delivery/);
  assert.match(reply, /Track Order/);
});

test("starts order tracking flow", async () => {
  const phone = "910000000002";
  const first = await handleIncomingMessage({ phone, text: "4", config, trackOrder });
  assert.match(first, /Order ID/);
  const second = await handleIncomingMessage({ phone, text: "SD123", config, trackOrder });
  assert.match(second, /10-digit mobile/);
  const third = await handleIncomingMessage({ phone, text: "8011767897", config, trackOrder });
  assert.match(third, /tracking is not connected yet/);
});

test("opens support flow", async () => {
  const phone = "910000000003";
  const first = await handleIncomingMessage({ phone, text: "6", config, trackOrder });
  assert.match(first, /Customer Support/);
  const second = await handleIncomingMessage({ phone, text: "5", config, trackOrder });
  assert.match(second, /type your problem/);
  const third = await handleIncomingMessage({ phone, text: "My delivery is late", config, trackOrder });
  assert.match(third, /request has been recorded/);
});
