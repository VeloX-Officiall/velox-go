
-- 1. Posts: rename store_id -> author_id, add author_role
ALTER TABLE public.posts RENAME COLUMN store_id TO author_id;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author_role text NOT NULL DEFAULT 'store';

-- Drop old policies referencing store_id
DROP POLICY IF EXISTS posts_insert_store ON public.posts;
DROP POLICY IF EXISTS posts_update_own ON public.posts;
DROP POLICY IF EXISTS posts_delete_own ON public.posts;

-- Recreate using author_id; allow store + customer to post, deny couriers
CREATE POLICY posts_insert_author ON public.posts
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND (public.has_role(auth.uid(), 'store'::public.app_role)
         OR public.has_role(auth.uid(), 'customer'::public.app_role))
  );
CREATE POLICY posts_update_own ON public.posts
  FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY posts_delete_own ON public.posts
  FOR DELETE USING (auth.uid() = author_id);

-- 2. Profiles: FIN code + social links
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fin_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS yt_url text,
  ADD COLUMN IF NOT EXISTS tt_url text,
  ADD COLUMN IF NOT EXISTS ig_url text;

-- 3. Orders: ready_at timestamp
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ready_at timestamptz;

-- 4. Refresh verified function uses store_id no longer (posts), but orders still use store_id — keep as is.
