# VeloX Production-Ready Transition Plan

Bu, 7 əsas bloku əhatə edən geniş bir yenilənmədir. Hər biri ardıcıl olaraq tətbiq olunacaq.

## 1. Presence Engine (Rol əsaslı status)

**DB dəyişiklikləri** (migration):
- `profiles.status` text ('online' | 'offline'), default 'offline'
- `profiles.day_pass_started_at` timestamptz (kuryer üçün)
- `profiles.id_document_url`, `profiles.id_status` ('none'|'pending_verification'|'verified')
- `courier_locations` cədvəli: id, courier_id, lat, lng, recorded_at; RLS: kuryer öz qeydlərini yazır, müştərilər yalnız onlara təyin olunmuş kuryerin son koordinatını oxuya bilər
- `start_courier_day()` RPC: cüzdandan 1 AZN tutur, `day_pass_until = now()+24h`, status='online'
- Müştəri: app açıq → online, bağlananda → offline (visibility + beforeunload)
- Mağaza: Switch toggle dashboard header-ində
- Kuryer: dashboardda "Günü Başlat (1 AZN)" düyməsi; balans yoxlanışı; saat bitəndə avtomatik offline

## 2. i18n Engine (AZ/EN/RU)

- `src/lib/i18n.ts` üzərindən tam dictionary (mövcud quruluş) genişləndiriləcək — bütün hardcoded AZ stringlərı `t()` ilə əvəz olunacaq
- Welcome/Login/Signup üst sağda dil seçici (artıq mövcud `LanguageSwitcher`) — pre-auth aktiv
- AppHeader, BottomNav, ShareSheet, feed, discover, activity, profile, courier, store, customer — hamısı translation map istifadə edəcək
- localStorage ilə dil yadda saxlanır

## 3. KYC ID Upload

- `identity_docs` private bucket (storage_create_bucket)
- RLS: yalnız user özü `auth.uid()/...` path-inə yaza/oxuya bilər
- Signup-da rol Courier/Seller seçilərsə → `IdUpload` komponenti ID şəkli (jpg/png) qəbul edir, yükləyir, `profiles.id_document_url` + `id_status='pending_verification'` yazır

## 4. Live GPS

- `useCourierTracking` hook: status=online və rol=courier olduqda hər 10 saniyədə `navigator.geolocation.getCurrentPosition` → `courier_locations` insert
- Activity səhifəsində müştəri öz aktiv sifarişinin kuryerini real-vaxtlı izləyir (Supabase Realtime + Leaflet artıq mövcud `MapPicker`-də)

## 5. Realtime Chat

- Artıq `courier_chat` var. "Qardaşlıq Çat"ı bütün rollar üçün açırıq: yeni `community_chat` cədvəli, RLS: hər authenticated user oxuya/yaza bilər
- Realtime subscription, send → optimistic input reset

## 6. Axın Video Feed

- `product_videos` public bucket
- ShareSheet üçün ayrıca "🎥 Video Paylaş" sekansı: title, price_azn, category, fayl yüklənir → posts cədvəlinə (`video_url`, `price_azn`, `title`, `tags=[category]`)
- Feed səhifəsində `<video autoplay loop muted playsInline>` + IntersectionObserver
- "Sifariş et" → orders insert (post_id, store_id=author_id) + Activity-ə redirect

## 7. Profile Two-State

- `/profile`-ı iki rejimə bölmək: State A (oxu) və State B (redaktə)
- "Profili redaktə et" / "Ləğv et" düymələri
- "Yadda saxla" → update + toast + State A-ya qayıt
- AppHeader-dən segment tabs və chat icon-u yalnız `/feed` (home) olduqda göstər; digər routelarda sadə back+title

## Texniki Qeydlər

- Bütün migrationlar GRANT + RLS ilə düzgün quruluşda
- Heç bir mövcud server fn auth axını sındırılmır
- Bucket yaratmaq üçün `supabase--storage_create_bucket` tool
- 24h sıfırlama: client tərəfdə `day_pass_until <= now()` yoxlanışı + serverdə insert/online qoruyucu (RPC)
- Mövcud `i18n.ts` strukturuna sadiq qalırıq, dictionary genişləndirilir

## Fayl Dəyişiklikləri

**Yeni:**
- `src/components/IdUpload.tsx`
- `src/components/PresenceSwitch.tsx` (Mağaza üçün)
- `src/components/StartDayButton.tsx` (Kuryer üçün)
- `src/components/CourierTracker.tsx` (xəritədə kuryer izi)
- `src/lib/useAppPresence.ts` (müştəri lifecycle)
- `src/lib/useCourierTracking.ts`
- `supabase/migrations/...` (status, day_pass, courier_locations, community_chat, RPC)

**Redaktə:**
- `src/lib/i18n.ts` (tam dictionary)
- `src/routes/auth.tsx` (KYC inteqrasiyası)
- `src/routes/courier.tsx` (StartDay, GPS, chat → community_chat)
- `src/routes/store.tsx` (PresenceSwitch)
- `src/routes/customer.tsx` (useAppPresence)
- `src/routes/profile.tsx` (iki state)
- `src/routes/feed.tsx` (Sifariş et işə salınması)
- `src/routes/activity.tsx` (CourierTracker)
- `src/components/AppHeader.tsx` (segments yalnız home-da)
- `src/components/ShareSheet.tsx` (video upload pipeline)

Təsdiq edirsiniz? Təsdiqdən sonra dəyişiklikləri ardıcıl tətbiq edirəm — əvvəlcə DB migration + bucket-lər, sonra hooks, sonra UI.