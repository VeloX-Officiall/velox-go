## VeloX Final MVP — Implementation Plan

A large set of changes spanning UI, business logic, backend, and real-time features. I'll ship in focused phases.

### Phase 1 — UI/UX & Content (frontend only)
- Strip placeholder stats (2.4k, 380, 78k) from landing hero.
- Add **"Dəyərlərimiz"** section: 3 cards (Dürüstlük, Şəffaflıq, Yaxınlıq).
- New route `/about` ("Haqqımızda") with the full provided copy + per-role sections.
- Add About link to the header nav.

### Phase 2 — Pricing engine
- New helper `src/lib/pricing.ts` implementing the tier logic:
  - ≤1 km → 1.50 AZN
  - 1–10 km → 1.50 + `(Math.ceil(km) - 1) * 0.50`
  - >10 km → tier-2 price at 10 km + `(Math.ceil(km) - 10) * 0.40`
- "Get Anything" form: distance input/slider + live total fee preview + confirm step.
- Unit-style sanity examples shown in About page.

### Phase 3 — Lovable Cloud + Mandatory Auth
- Enable Lovable Cloud.
- Tables: `profiles` (id, full_name, phone, role enum: courier|store|customer), `user_roles` (separate, RLS-safe pattern), `orders`, `messages`, `courier_locations`.
- `/auth` route with Email/Password + Google sign-in, role selection on signup.
- Convert `/courier`, `/store`, `/customer` into protected routes via `_authenticated` layout. Role mismatch → redirect to correct dashboard.
- Landing role buttons → if signed-out, go to `/auth?role=...`; if signed-in, go to dashboard.

### Phase 4 — Orders, multi-order limit & independent billing
- Order creation writes to `orders` with computed fee (server-side recalculation for trust).
- Courier accept flow: DB check enforces max 3 active orders per courier.
- Each order stores its own fee independently.

### Phase 5 — Real-time maps & GPS
- Use Leaflet + OpenStreetMap (no API key needed) for map rendering and routing line.
- Courier dashboard publishes geolocation to `courier_locations` (Supabase Realtime).
- Customer order screen subscribes and renders live courier marker + pickup/dropoff pins + route line.

### Phase 6 — DM + AI Support
- `messages` table with `conversation_id` (order-scoped) supporting Courier↔Store↔Customer pairs. Realtime subscription.
- AI Support: edge/server function calling Lovable AI Gateway (`google/gemini-3-flash-preview`) with system prompt encoding VeloX rules + pricing formula. Chat UI in each dashboard.

### Technical notes
- Roles via separate `user_roles` table + `has_role()` SECURITY DEFINER function (per security policy — never store role on profiles for auth checks).
- Pricing recomputed on the server before insert to prevent client tampering.
- Map: `react-leaflet` + `leaflet`. Distance via Haversine in `pricing.ts`.
- AI chat via `createServerFn` calling `https://ai.gateway.lovable.dev/v1/chat/completions` with `LOVABLE_API_KEY`.

### Delivery order
Given the size, I'll ship in this order and confirm after each milestone:
1. Phase 1 + 2 (UI cleanup, About page, pricing engine wired into Get Anything) — ships immediately.
2. Phase 3 (Cloud + Auth + protected routes).
3. Phase 4 + 5 (Orders, multi-order rule, live map).
4. Phase 6 (DM + AI bot).

Reply **"go"** to start, or tell me to reorder/skip phases.
