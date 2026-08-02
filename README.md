# Sabka Delivery WhatsApp Support Bot

Standalone official Meta WhatsApp Cloud API bot for Render. It does not modify or deploy the Sabka Delivery website.

## Features

- Official Meta WhatsApp Cloud API webhook
- Webhook verification and `x-hub-signature-256` validation
- Greeting detection including `Hello Sabka Delivery`
- Food, Grocery, Electronics, Track Order, Offers, Website and Support menus
- Customer support issue collection
- Optional secure order-tracking API connection
- Duplicate message protection during the running process
- Render health endpoint

## Local setup

```bash
npm install
cp .env.example .env
npm start
```

The server listens on `0.0.0.0` and uses `PORT` supplied by Render.

## Render setup

1. Create a Render Web Service from this repository.
2. Select branch `agent/whatsapp-support-bot` while testing.
3. Build command: `npm install`
4. Start command: `npm start`
5. Health check path: `/health`
6. Add every variable from `.env.example` in Render Environment settings.

## Meta webhook

Callback URL:

```text
https://YOUR-RENDER-SERVICE.onrender.com/webhook
```

Use the same value for Meta's Verify Token and Render's `WHATSAPP_VERIFY_TOKEN`.
Subscribe the WhatsApp webhook to the `messages` field.

## Required environment variables

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `META_APP_SECRET`
- `WHATSAPP_API_VERSION`
- `SABKA_DELIVERY_WEBSITE_URL`
- `SUPPORT_WHATSAPP_NUMBER`

Optional order tracking:

- `ORDER_TRACKING_API_URL`
- `ORDER_TRACKING_API_KEY`

The tracking API must accept `orderCode` and `mobile` query parameters and must verify both before returning order information.

## Test

```bash
npm test
```

## Security

Never commit real Meta tokens or app secrets. Store them only in Render environment variables.
