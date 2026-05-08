
-- Add profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS social_url TEXT,
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

-- Image url on posts (for stored image url) already exists
-- Add likes_count cache via function (computed)

-- Function: refresh verified for stores meeting 100 orders/month
CREATE OR REPLACE FUNCTION public.refresh_store_verified(_store uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET verified = (
    SELECT COUNT(*) >= 100
    FROM public.orders
    WHERE store_id = _store
      AND status = 'delivered'
      AND created_at > now() - interval '30 days'
  )
  WHERE id = _store;
END;
$$;

-- Trigger to bump verified on order completion
CREATE OR REPLACE FUNCTION public.on_order_delivered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') AND NEW.store_id IS NOT NULL THEN
    PERFORM public.refresh_store_verified(NEW.store_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_delivered ON public.orders;
CREATE TRIGGER trg_order_delivered
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.on_order_delivered();

-- Realtime
ALTER TABLE public.posts REPLICA IDENTITY FULL;
ALTER TABLE public.post_likes REPLICA IDENTITY FULL;
ALTER TABLE public.post_comments REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
