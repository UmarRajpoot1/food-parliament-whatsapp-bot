# Multi-tenant WhatsApp Business AI Assistant

A Node.js + Express service for serving multiple salons and restaurants from one codebase. Each inbound WhatsApp message is routed by Meta's `phone_number_id`, so every client gets its own data and conversation history.

## Local setup

1. Create a Supabase project and run [`schema.sql`](schema.sql) in the SQL Editor.
2. Install Node.js 18 or newer.
3. Run `npm install`.
4. Copy `.env.example` to `.env` and paste in the values described there. `SUPABASE_KEY` must be a server-side service-role key; never expose it in a browser.
5. Start the server with `npm start`. Check `http://localhost:3000/health`.

The AI uses Groq and `llama-3.1-70b-versatile` by default. Set `OPENAI_API_KEY` as an additional environment variable to use OpenAI `gpt-4o-mini` instead.

## Meta webhook setup

1. In Meta for Developers, configure WhatsApp and copy the phone number ID into a business row using `POST /admin/business`.
2. Run ngrok locally: `ngrok http 3000`.
3. In Meta's WhatsApp webhook configuration, use `https://YOUR-NGROK-DOMAIN/webhook` and enter the same value as `WHATSAPP_VERIFY_TOKEN` for the Verify token. Subscribe to the `messages` field.
4. Meta first sends a GET request containing `hub.verify_token` and `hub.challenge`; the app returns the challenge only when the token matches.
5. For production, use a permanent Meta system-user access token. Temporary tokens commonly expire after 24 hours, which causes sends to fail even though the webhook still receives events.

The app acknowledges POST webhook deliveries immediately because Meta retries a webhook that takes too long. It currently processes text messages and ignores media/status notifications.

## Admin API

Send the static key in `x-admin-api-key`.

Create or update a tenant (updates by `id` when supplied, otherwise by unique WhatsApp phone number ID):

```bash
curl -X POST http://localhost:3000/admin/business \
  -H "content-type: application/json" -H "x-admin-api-key: YOUR_ADMIN_API_KEY" \
  -d '{"name":"Bright Salon","type":"salon","whatsapp_phone_number_id":"META_PHONE_NUMBER_ID","business_data":{"services":[{"name":"Cut","price":30}],"hours":"Mon-Fri 9-5"}}'
```

List leads with `GET /admin/leads?business_id=BUSINESS_UUID` and the same header. Add `&status=new` to filter new leads.

Food Parliament seed data is included in [`food-parliament.json`](food-parliament.json). Replace `REPLACE_WITH_META_PHONE_NUMBER_ID` in that file with the Phone Number ID from Meta, then post it to the running server. In PowerShell:

```powershell
$profile = Get-Content .\food-parliament.json -Raw | ConvertFrom-Json
$body = $profile | ConvertTo-Json -Depth 10
Invoke-RestMethod http://localhost:3000/admin/business -Method Post -Headers @{ 'x-admin-api-key' = 'YOUR_ADMIN_API_KEY' } -ContentType 'application/json' -Body $body
```

The `+1 555-195-8936` display number is not the Phone Number ID. Meta sends the ID in webhook metadata and requires that ID in the onboarding payload.

## Deploy to Railway

1. Push this folder to a Git repository and create a Railway project from it (the included `railway.json` supplies the start command).
2. Add every variable from `.env.example` in Railway's Variables panel, including `PORT` only if Railway does not provide it automatically.
3. Copy the deployed URL into Meta as `https://YOUR-RAILWAY-DOMAIN/webhook` and complete the Verify token handshake.

Render is also supported with the included `render.yaml`: create a new Blueprint from the repository and add the secret environment variables in the Render dashboard.

## Project layout

- `server.js` - Express application entrypoint
- `src/routes/webhook.js` - Meta verification and inbound message flow
- `src/routes/admin.js` - tenant onboarding and lead export endpoints
- `src/services/ai.js` - tenant prompt and Groq/OpenAI completion
- `src/services/whatsapp.js` - WhatsApp Cloud API client
- `src/db/supabase.js` - database queries
