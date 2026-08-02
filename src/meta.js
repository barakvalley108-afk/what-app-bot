import crypto from "node:crypto";

export function verifyMetaSignature(rawBody, signatureHeader, appSecret) {
  if (!appSecret || !signatureHeader?.startsWith("sha256=")) return false;
  const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function extractIncomingMessages(payload) {
  const results = [];
  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value;
      const contacts = value?.contacts ?? [];
      for (const message of value?.messages ?? []) {
        if (message?.type !== "text" || !message?.from || !message?.id) continue;
        const contact = contacts.find((item) => item?.wa_id === message.from);
        results.push({
          id: message.id,
          from: message.from,
          text: message.text?.body ?? "",
          profileName: contact?.profile?.name ?? ""
        });
      }
    }
  }
  return results;
}

export async function sendWhatsAppText(to, body, config) {
  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body }
    })
  });

  const responseText = await response.text();
  let data;
  try { data = JSON.parse(responseText); } catch { data = { raw: responseText }; }

  if (!response.ok) {
    const error = new Error(`Meta API request failed with ${response.status}`);
    error.details = data;
    throw error;
  }
  return data;
}
