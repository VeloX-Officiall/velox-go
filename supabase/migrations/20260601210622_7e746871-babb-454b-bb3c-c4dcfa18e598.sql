
-- Update handle_new_user to persist username + fin_code from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _username text;
  _fin text;
BEGIN
  _username := NULLIF(lower(NEW.raw_user_meta_data->>'username'), '');
  _fin := NULLIF(upper(NEW.raw_user_meta_data->>'fin_code'), '');

  INSERT INTO public.profiles (id, full_name, username, fin_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    _username,
    _fin
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        username  = COALESCE(EXCLUDED.username, public.profiles.username),
        fin_code  = COALESCE(EXCLUDED.fin_code, public.profiles.fin_code);

  IF NEW.raw_user_meta_data->>'role' IN ('courier','store','customer') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Make sure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Posts: add price
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS price_azn numeric;

-- Orders: link to post
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS post_id uuid;
