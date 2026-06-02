
-- 1. Profile additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'offline',
  ADD COLUMN IF NOT EXISTS day_pass_until timestamptz,
  ADD COLUMN IF NOT EXISTS id_document_url text,
  ADD COLUMN IF NOT EXISTS id_status text NOT NULL DEFAULT 'none';

-- 2. courier_locations table
CREATE TABLE IF NOT EXISTS public.courier_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id uuid NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS courier_locations_courier_recorded_idx
  ON public.courier_locations(courier_id, recorded_at DESC);

GRANT SELECT, INSERT ON public.courier_locations TO authenticated;
GRANT ALL ON public.courier_locations TO service_role;

ALTER TABLE public.courier_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courier_loc_insert_self" ON public.courier_locations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = courier_id AND public.has_role(auth.uid(), 'courier'));

CREATE POLICY "courier_loc_select_party" ON public.courier_locations
  FOR SELECT TO authenticated
  USING (
    auth.uid() = courier_id
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.courier_id = courier_locations.courier_id
        AND o.customer_id = auth.uid()
        AND o.status NOT IN ('delivered','cancelled')
    )
  );

-- 3. community_chat table
CREATE TABLE IF NOT EXISTS public.community_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_chat_created_idx
  ON public.community_chat(created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.community_chat TO authenticated;
GRANT ALL ON public.community_chat TO service_role;

ALTER TABLE public.community_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cchat_select_auth" ON public.community_chat
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "cchat_insert_self" ON public.community_chat
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cchat_delete_own" ON public.community_chat
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.community_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.courier_locations;

-- 4. start_courier_day RPC
CREATE OR REPLACE FUNCTION public.start_courier_day()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _bal numeric;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF NOT public.has_role(_uid, 'courier') THEN
    RAISE EXCEPTION 'not_a_courier';
  END IF;

  INSERT INTO public.courier_wallet (user_id, balance_azn)
  VALUES (_uid, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance_azn INTO _bal FROM public.courier_wallet WHERE user_id = _uid FOR UPDATE;
  IF COALESCE(_bal, 0) < 1.0 THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  UPDATE public.courier_wallet
    SET balance_azn = balance_azn - 1.0,
        day_pass_until = now() + interval '24 hours',
        updated_at = now()
    WHERE user_id = _uid;

  UPDATE public.profiles
    SET status = 'online',
        day_pass_until = now() + interval '24 hours',
        last_seen_at = now(),
        is_online = true
    WHERE id = _uid;

  INSERT INTO public.transactions (user_id, amount_azn, kind, status)
  VALUES (_uid, -1.0, 'day_pass', 'success');

  RETURN jsonb_build_object('ok', true, 'expires_at', now() + interval '24 hours');
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_courier_day() TO authenticated;

-- 5. Ensure courier_wallet has day_pass_until (already present per schema)
-- Add courier_wallet upsert path
ALTER TABLE public.courier_wallet
  ADD COLUMN IF NOT EXISTS day_pass_until timestamptz;
