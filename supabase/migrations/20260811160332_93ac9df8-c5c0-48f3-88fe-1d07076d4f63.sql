CREATE POLICY "obras_files_engenheiro_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'obras' AND public.is_obra_engenheiro((split_part(name, '/', 1))::uuid));

CREATE POLICY "obras_files_engenheiro_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'obras' AND public.is_obra_engenheiro((split_part(name, '/', 1))::uuid));

CREATE POLICY "obras_files_engenheiro_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'obras' AND public.is_obra_engenheiro((split_part(name, '/', 1))::uuid));

CREATE POLICY "obras_files_cliente_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'obras' AND public.is_obra_cliente((split_part(name, '/', 1))::uuid));