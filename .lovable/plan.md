## VeloX Super App — Tam Yenidən Qurma Planı

Bu plan kritik bug-fix-ləri və tam yeni naviqasiya/ekran strukturunu Azərbaycan dilində hardcode olunmuş şəkildə tətbiq edir.

---

### 1. Kritik Bug-fix-lər

**A. Auth axını (`src/routes/auth.tsx`)**
- Profil insert-i `handle_new_user` trigger-i tərəfindən idarə olunur — amma trigger `username` və `fin_code` yazmır. Düzəliş: trigger-i yeniləyəcəyik ki, `raw_user_meta_data`-dan `username` və `fin_code` götürsün. Bu, RLS/timing race-lərini aradan qaldırır.
- Client-də: signup zamanı bütün məlumatları `options.data`-ya ötürmək; sonradan `update` etməmək (race-condition yox).
- Username unikallığını qeydiyyatdan əvvəl yoxla, error mesajını AZ-də göstər.

**B. Qardaşlıq Çat (`src/routes/courier.tsx`)**
- Form submit handler-də `setBody("")` send-dən ƏVVƏL state-i təmizləmir → optimistik UI yox. Düzəliş: `await supabase.insert` uğurlu olduqdan sonra `setBody("")` çağır, error olarsa toast göstər.
- Realtime subscription-da event listener `INSERT` filtrini düzgün qur, dublikatları `id` ilə dedupe et.
- Input-da `disabled={sending}` flag-i əlavə et.

**C. Tam AZ Lokalizasiya**
- `src/lib/i18n.ts`-i UI üçün istifadə etməyi DAYANDIR. Bütün route/komponent string-ləri birbaşa AZ-də hardcode et.
- LanguageSwitcher-i header-dən sil (yalnız AI bot üçün dil seçimi qalsın, daxili setting).

---

### 2. Üst Header (Dinamik) — yeni `AppHeader` komponenti

```
┌─────────────────────────────────────────────────────────┐
│ [📍 Bakı, Nizami küç.]   [Axın | Mağazalar]   [💬 3]   │
└─────────────────────────────────────────────────────────┘
```

- **Sol**: Müştəri üçün ünvan seçici (modal açılır + MapPicker); Kuryer üçün `Onlayn/Oflayn` toggle (profiles.is_online yazır).
- **Orta**: Segmented control `Axın | Mağazalar` — route dəyişdirir `/feed` ↔ `/stores` (və ya tab state).
- **Sağ**: Chat icon + unread badge → `/messages` route-una.

---

### 3. Alt Naviqasiya — yeni `BottomNav` komponenti (5 tab)

| Tab | Route | Məzmun |
|-----|-------|--------|
| 🏠 Axın | `/feed` | Vertikal video swipe feed, sağda Like/Comment/Share/Sifariş et düymələri |
| 🔍 Kəşfet | `/discover` | Axtarış + 4 kateqoriya grid (Restoranlar, Marketlər, Geyim, Şirniyyat) |
| ➕ Paylaş | modal | Bottom-sheet: "Video Paylaş" / "Şəkil Paylaş" + Məhsul Adı/Qiymət/Təsvir |
| 🛍️ Aktivlik | `/activity` | Rol-əsaslı: müştəri → sifariş tracker; kuryer → iş paneli |
| 👤 Profil | `/profile` | İstifadəçi + VeloX Cüzdan (Balans artır/Nağdlaşdır) |

---

### 4. Database dəyişiklikləri

- `handle_new_user` trigger-ini yeniləmək: `username`, `fin_code` metadata-dan oxusun.
- `posts` cədvəlinə `price_azn` numeric NULL əlavə et (məhsul qiyməti üçün).
- `orders` cədvəlinə `post_id` uuid NULL əlavə et (feed-dən sifariş üçün).

---

### 5. Yeni/Dəyişəcək fayllar

**Yeni:**
- `src/components/AppHeader.tsx` (yenidən yazılır — dinamik)
- `src/components/BottomNav.tsx`
- `src/components/ShareSheet.tsx` (paylaş modal)
- `src/components/AddressSelector.tsx`
- `src/routes/feed.tsx`
- `src/routes/discover.tsx`
- `src/routes/activity.tsx`

**Dəyişəcək:**
- `src/routes/__root.tsx` — BottomNav-ı bütün auth-lı route-lara əlavə
- `src/routes/auth.tsx` — signup race-condition fix
- `src/routes/courier.tsx` — chat send/clear fix
- `src/routes/profile.tsx` — VeloX Cüzdan bölməsi + Balans artır/Nağdlaşdır
- `src/routes/customer.tsx` & `store.tsx` — yeni route-lara redirect (legacy)
- `supabase/migrations/*` — trigger + sütun əlavələri

---

### 6. Texniki qeydlər

- Bütün UI-string-lər AZ-də hardcode (i18n.ts yalnız AI bot üçün).
- `framer-motion` artıq dependency-dədir, bottom-sheet üçün istifadə.
- Video feed üçün native `<video>` + `IntersectionObserver` (yeni dependency yox).
- VeloX Cüzdan "Balans artır" mövcud `CardCheckout` komponentini istifadə edəcək; "Nağdlaşdır" sadəcə transactions cədvəlinə `withdraw` kind ilə insert edəcək (simulyasiya).
- "Sifariş et" düyməsi feed-də post-dan order yaradır (post_id ilə bağlı).

Plan təsdiqlənsə, hər şeyi tək axında qururam: əvvəl migration, sonra komponentlər və route-lar, sonunda chat/auth düzəlişləri.
