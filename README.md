# CA Nexus Hub

CA Nexus Hub is a lead marketplace platform for CAs with:
- lead request + admin approval workflow
- payment-gated lead unlocking (Razorpay)
- email + WhatsApp notifications (Resend + Twilio via Supabase Edge Functions)
- AI Content Hub (real model-backed generation via Edge Function)

## Tech Stack
- React + TypeScript + Vite
- Supabase (Postgres, Auth, RLS, Edge Functions)
- Razorpay
- Resend
- Twilio

## Local Setup
1. Install dependencies:
```bash
npm install
```
2. Create `.env`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_RAZORPAY_KEY_ID=your_razorpay_public_key
```
3. Start app:
```bash
npm run dev
```

## Database Setup (Supabase)
Run migrations from `supabase/migrations` in timestamp order, or:
```bash
supabase db push
```

## Edge Functions
Deploy required functions:
```bash
supabase functions deploy create-payment
supabase functions deploy verify-payment
supabase functions deploy send-email
supabase functions deploy send-whatsapp
supabase functions deploy generate-content
```

Set function secrets in Supabase:
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional, default in function)

## Production Checklist
1. Use client-owned Supabase project and keys.
2. Keep all secrets server-side (Edge Function secrets only).
3. Set payment demo flags to live mode:
   - `src/lib/payment.ts` -> `DEMO_MODE = false`
   - `src/components/PaymentButton.tsx` -> `DEMO_MODE = false`
4. Configure Supabase Auth URLs (`Site URL`, reset-password redirect).
5. Create first admin in `profiles` table (`role='admin'`).

## Important Flows
- User requests lead -> Admin approves/rejects.
- Approved lead requires successful payment before full details unlock.
- Notifications appear in-app (topbar bell) for:
  - request approved
  - request rejected
  - payment success

## Build
```bash
npm run build
```
