CREATE TABLE public.courier_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_courier_chat_created ON public.courier_chat (created_at DESC);

ALTER TABLE public.courier_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courier_chat_select_couriers"
  ON public.courier_chat FOR SELECT
  USING (public.has_role(auth.uid(), 'courier'::public.app_role));

CREATE POLICY "courier_chat_insert_courier_self"
  ON public.courier_chat FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'courier'::public.app_role));

CREATE POLICY "courier_chat_delete_own"
  ON public.courier_chat FOR DELETE
  USING (auth.uid() = user_id);

ALTER TABLE public.courier_chat REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.courier_chat;