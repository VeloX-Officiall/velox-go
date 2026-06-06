
-- 1) PROFILES: hide sensitive columns from other users via column-level grants
REVOKE SELECT (phone, fin_code, id_document_url) ON public.profiles FROM anon, authenticated;

-- Function so the owner can still load their full profile (including sensitive cols)
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- 2) TRANSACTIONS: remove client-side insert; provide secure top-up function
DROP POLICY IF EXISTS tx_insert_own ON public.transactions;

-- 3) COURIER_WALLET: remove client-side balance updates
DROP POLICY IF EXISTS wallet_update_own ON public.courier_wallet;

-- Secure top-up: inserts transaction + credits wallet atomically
CREATE OR REPLACE FUNCTION public.topup_wallet(_amount numeric, _card_last4 text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _new_bal numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 1000 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  IF _card_last4 IS NULL OR _card_last4 !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'invalid_card';
  END IF;

  INSERT INTO public.courier_wallet (user_id, balance_azn)
    VALUES (_uid, 0) ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.courier_wallet
     SET balance_azn = balance_azn + _amount, updated_at = now()
   WHERE user_id = _uid
   RETURNING balance_azn INTO _new_bal;

  INSERT INTO public.transactions (user_id, amount_azn, kind, status, card_last4)
    VALUES (_uid, _amount, 'topup', 'success', _card_last4);

  RETURN _new_bal;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.topup_wallet(numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.topup_wallet(numeric, text) TO authenticated;

-- 4) USER_ROLES: prevent privilege escalation — only allow initial assignment
DROP POLICY IF EXISTS user_roles_insert_own ON public.user_roles;
CREATE POLICY user_roles_insert_initial ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
  );

-- 5) Lock down anon execution of internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.start_courier_day() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_courier_day() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.refresh_store_verified(uuid) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_order_delivered() FROM PUBLIC, anon, authenticated;
