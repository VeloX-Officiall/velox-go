CREATE TABLE public.post_reposts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  original_author_id uuid,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.post_reposts TO authenticated;
GRANT SELECT ON public.post_reposts TO anon;
GRANT ALL ON public.post_reposts TO service_role;

ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;

CREATE POLICY reposts_select_all ON public.post_reposts FOR SELECT USING (true);
CREATE POLICY reposts_insert_own ON public.post_reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY reposts_delete_own ON public.post_reposts FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX post_reposts_user_idx ON public.post_reposts(user_id);
CREATE INDEX post_reposts_post_idx ON public.post_reposts(post_id);