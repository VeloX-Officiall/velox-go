
-- 1) Add direction column to transactions (in/out) so we keep amount positive
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'in'
    CHECK (direction IN ('in','out'));

-- 2) Fix start_courier_day to insert positive amount with direction=out
CREATE OR REPLACE FUNCTION public.start_courier_day()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _bal numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.has_role(_uid, 'courier') THEN RAISE EXCEPTION 'not_a_courier'; END IF;

  INSERT INTO public.courier_wallet (user_id, balance_azn)
  VALUES (_uid, 0) ON CONFLICT (user_id) DO NOTHING;

  SELECT balance_azn INTO _bal FROM public.courier_wallet WHERE user_id = _uid FOR UPDATE;
  IF COALESCE(_bal, 0) < 1.0 THEN RAISE EXCEPTION 'insufficient_balance'; END IF;

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

  INSERT INTO public.transactions (user_id, amount_azn, kind, status, direction)
  VALUES (_uid, 1.0, 'day_pass', 'success', 'out');

  RETURN jsonb_build_object('ok', true, 'expires_at', now() + interval '24 hours');
END;
$function$;

-- 3) Also patch topup_wallet to set direction=in explicitly
CREATE OR REPLACE FUNCTION public.topup_wallet(_amount numeric, _card_last4 text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _new_bal numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 1000 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF _card_last4 IS NULL OR _card_last4 !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'invalid_card'; END IF;

  INSERT INTO public.courier_wallet (user_id, balance_azn)
    VALUES (_uid, 0) ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.courier_wallet
     SET balance_azn = balance_azn + _amount, updated_at = now()
   WHERE user_id = _uid
   RETURNING balance_azn INTO _new_bal;

  INSERT INTO public.transactions (user_id, amount_azn, kind, status, card_last4, direction)
    VALUES (_uid, _amount, 'topup', 'success', _card_last4, 'in');

  RETURN _new_bal;
END;
$function$;
