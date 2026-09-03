CREATE POLICY suporte_files_cliente_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'suporte' AND split_part(name, '/', 1) = auth.uid()::text);

CREATE POLICY suporte_files_cliente_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'suporte' AND split_part(name, '/', 1) = auth.uid()::text);

CREATE POLICY suporte_files_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'suporte' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY suporte_files_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'suporte' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY suporte_files_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'suporte' AND private.has_role(auth.uid(), 'admin'::app_role));