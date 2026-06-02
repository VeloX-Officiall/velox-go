
CREATE POLICY "id_docs_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'identity-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "id_docs_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'identity-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "id_docs_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'identity-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
