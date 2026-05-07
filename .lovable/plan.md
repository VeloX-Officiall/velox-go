## VeloX – Backend Integration & Full Functionality

Large multi-phase build. Delivered in 4 phases with checkpoints.

### Phase 1 — Cleanup & Neutrality (frontend only)
- Strip "Baku / Khachmaz / Azerbaijan" mentions from landing, header, footer, about page.
- Remove any remaining placeholder stats / hardcoded city names in courier/store/customer mock data (replace with neutral labels like "Şəhər mərkəzi", "Mağaza ünvanı").
- Pricing copy stays in AZN (currency unit, not geography).

### Phase 2 — Lovable Cloud + Auth + Schema
Enable Lovable Cloud, then create schema:

```text
profiles(id uuid PK → auth.users, full_name, phone, avatar_url, created_at)
app_role enum: 'courier' | 'store' | 'customer'
user_roles(id, user_id, role)  + has_role() SECURITY DEFINER
posts(id, store_id, title, description, tags[], image_url, location, created_at)
post_likes(id, post_id, user_id, UNIQUE(post_id,user_id))
post_comments(id, post_id, user_id, body, created_at)
orders(id, customer_id, courier_id, store_id, pickup_lat/lng, drop_lat/lng,
       distance_km, fee_azn, status, note, created_at)
conversations(id, user_a, user_b, UNIQUE pair)
messages(id, conversation_id, sender_id, body, created_at)
courier_wallet(user_id PK, balance_azn, day_pass_until)
```

RLS on all tables. `_authenticated` layout route guards `/courier`, `/store`, `/customer`. Landing role buttons → `/auth?role=…`. After login, redirect to that role's dashboard. `/auth` page: email+password + Google.

### Phase 3 — Real pricing + Social + DMs
- Pricing already lives in `src/lib/pricing.ts` (Haversine + tiers). Wire "Get Anything" to compute fee from real A/B coords (click-to-place pins on a Leaflet map; or two coord inputs as fallback). Server function recomputes fee before insert.
- Feed: posts loaded from `posts` table; like/comment buttons write to `post_likes`/`post_comments` with optimistic UI; counts update via Supabase Realtime.
- DM: `/messages` route lists conversations; thread view subscribes to Realtime on `messages`. "Mesaj" buttons on store cards / courier list / customer order open a DM with that user.

### Phase 4 — AI Support Bot + Audit dead buttons
- `src/components/SupportBot.tsx` — floating button bottom-right on every page (mounted in `__root.tsx`). Chat panel calls server fn `aiSupport` → Lovable AI Gateway (`google/gemini-3-flash-preview`) with system prompt encoding VeloX rules (1 AZN daily pass, 0% commission, tiered pricing).
- Sweep every existing button: every onClick must navigate, mutate, or open a modal — no dead buttons.

### Technical notes
- Roles in separate `user_roles` table + `has_role()` to avoid RLS recursion.
- Pricing recomputed server-side in `createOrder` server fn; never trust client fee.
- Realtime: enable replication on `messages`, `post_likes`, `post_comments`.
- AI gateway via `createServerFn` reading `LOVABLE_API_KEY` inside `.handler()`.
- Maps: `leaflet` + `react-leaflet` with OpenStreetMap tiles (no API key).

### Delivery order
1. Phase 1 (quick cleanup) — ship immediately.
2. Phase 2 (Cloud + auth + schema) — checkpoint, test login flow.
3. Phase 3 (pricing UI + likes/comments + DM).
4. Phase 4 (SupportBot + dead-button audit).

Reply "go" to start with Phase 1+2, or tell me to reorder/skip phases.