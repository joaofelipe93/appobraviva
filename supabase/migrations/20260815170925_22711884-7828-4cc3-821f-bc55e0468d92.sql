REVOKE SELECT ON public.atualizacoes FROM authenticated;
REVOKE SELECT ON public.atualizacoes FROM anon;

GRANT SELECT (
  id, obra_id, criado_por, data_visita, observacoes,
  excel_path, excel_nome, etapas_atualizadas, created_at, resumo_ia_em
) ON public.atualizacoes TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.atualizacoes TO authenticated;
GRANT ALL ON public.atualizacoes TO service_role;