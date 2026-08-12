ALTER TABLE public.atualizacoes
  ADD COLUMN IF NOT EXISTS resumo_ia jsonb,
  ADD COLUMN IF NOT EXISTS resumo_ia_em timestamptz;