# VeloX – Qara/Luks Dizayn + Funksional Yeniləmələr

## 1. Vizual Yenidən Dizayn (Qara + Luks Mavi)
- `src/styles.css` tokenlərini yenilə: `--background` qara (oklch 0.12 0 0), `--foreground` ağ, `--card` tünd boz, `--primary` luks elektrik mavi (oklch 0.62 0.22 255), `--primary-glow` parlaq mavi, `--gradient-hero` mavi gradient, gümüş kənar (`--border` az parlaq).
- Bütün düymələr: gradient mavi + soft glow shadow (`--shadow-glow`).
- Kartlar: tünd background, nazik mavi border-on-hover.
- AppHeader, landing, dashboards yoxlanır ki, hardcoded ağ/açıq rəng qalmasın (semantic token-lərdən istifadə).

## 2. Xəritə – Wolt üslubu marşrut xətti
- `MapPicker.tsx` üzərində: A və B pin-ləri seçildikdə OSRM public demo (`https://router.project-osrm.org/route/v1/driving/...`) ilə real yol marşrutu çəkilir, `<Polyline>` mavi luks rənglə + glow.
- Məsafə avtomatik hesablanır (driving distance), `customer.tsx`-ə ötürülür → `calcDeliveryFee`.
- Tile layer: tünd Carto "dark_all" (`https://{s}.basemaps.cartocdn.com/dark_all/...`) qara temaya uyğun.

## 3. FIN Kod ilə Kuryer Girişi
- `profiles`-ə `fin_code text` sütunu əlavə (migration).
- `auth.tsx`-də Kuryer rolu seçildikdə, e-poçt+şifrə əvəzinə "FIN kod + şifrə" formu göstərilir. FIN saxlanılır profile-də (maskalanır UI-da: `*****1234`).
- Texniki: signup vaxtı sintetik email yaradılır `fin{code}@velox.app`, profile-ə `fin_code` yazılır. Login: profil id-ni FIN-dən tapıb həmin email ilə `signInWithPassword`.

## 4. Kuryer Balans Artırma
- `courier.tsx`-də "Balans artır" düyməsi → modal (məbləğ daxil et). 
- Hələlik manual: `courier_wallet.balance_azn += amount` (real ödəniş gec mərhələdə). 1 AZN günlük gediş haqqı balansdan çıxılır (cron sonra).

## 5. Profil və Paylaşımlar – Rola görə
- `posts` cədvəlində RLS artıq store rolunu məcbur edir. Customer-lərin də paylaşımı üçün:
  - `posts.store_id` → `posts.author_id`-yə adlandırma (ALTER COLUMN RENAME) və INSERT policy: `auth.uid() = author_id AND (has_role(uid,'store') OR has_role(uid,'customer'))`. Kuryerlərə INSERT bağlı.
  - `customer.tsx` və `store.tsx`-də "Paylaşım yarat" formu (başlıq, təsvir, şəkil URL).
- `profile.tsx`:
  - Kuryer üçün: yalnız YouTube/TikTok/Instagram link sahələri (`yt_url`, `tt_url`, `ig_url` columns əlavə, ya da mövcud `social_url` array-ə dəyişdir → JSONB).
  - Mağaza/Müştəri: bio + paylaşımlar siyahısı.

## 6. Like + Şərh + DM
- Hazırda `post_likes`/`post_comments` mövcuddur. Feed komponentinə real-time count + comment input əlavə (customer.tsx, store.tsx).
- DM (`/messages`) hər kəs üçün açıq – var. "Mesaj" düyməsi profile/post yanında konversasiya yaradır.

## 7. "Hazırdır" düyməsinin qorunması
- `orders` cədvəlinə `ready_at timestamptz`. Mağaza yalnız əmin olanda "Hazırdır" basır → status `ready`. Kuryer feed yalnız `status='ready'` sifarişləri göstərir. UI-da "Yalnız mal hazır olanda basın!" xəbərdarlığı + təsdiq dialog.

## 8. i18n – Tam tərcümə
- `i18n.ts`-də az/en/ru üçün bütün yeni açarları tamamla: fin_code, top_up, balance, ready_warning, route_distance, posts_compose, link_youtube, link_tiktok, link_instagram və s. Hardcoded mətnləri komponentlərdən `t()`-yə keçir.

## Texniki Qeydlər
- Migration: `ALTER TABLE posts RENAME COLUMN store_id TO author_id`, drop+recreate INSERT policy, add `posts.author_role`. ALTER profiles ADD `fin_code text unique`, `yt_url`, `tt_url`, `ig_url`. ALTER orders ADD `ready_at timestamptz`.
- OSRM public server rate-limited; məqbul MVP üçün. Sonra self-host.
- FIN kod 7 rəqəm validasiya (AZ standart).

## Çatdırılma sırası
1. Migration (schema dəyişiklikləri)
2. Dizayn tokenləri + tünd Carto map
3. OSRM marşrut + customer pricing
4. FIN auth + balans modal
5. Posts rola görə + profile rol-spesifik sahələr
6. Ready guard + i18n təmizliyi

Təsdiq üçün "davam" yazın.