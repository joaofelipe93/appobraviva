-- Telefone
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.pre_cadastros ADD COLUMN IF NOT EXISTS telefone text;

-- obra_clientes: várias casas por cliente
ALTER TABLE public.obra_clientes ALTER COLUMN unidade SET DEFAULT '';
UPDATE public.obra_clientes SET unidade = '' WHERE unidade IS NULL;
ALTER TABLE public.obra_clientes ALTER COLUMN unidade SET NOT NULL;
ALTER TABLE public.obra_clientes ADD COLUMN IF NOT EXISTS percentual numeric(5,2);
ALTER TABLE public.obra_clientes ADD COLUMN IF NOT EXISTS contrato_ok boolean NOT NULL DEFAULT false;
ALTER TABLE public.obra_clientes DROP CONSTRAINT IF EXISTS obra_clientes_pkey;
ALTER TABLE public.obra_clientes ADD CONSTRAINT obra_clientes_pkey PRIMARY KEY (obra_id, cliente_id, unidade);

-- midias: cliente vê mídia sem casa OU das casas dele
DROP POLICY IF EXISTS midias_cliente_select ON public.midias;
CREATE POLICY midias_cliente_select ON public.midias FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.atualizacoes a
  JOIN public.obra_clientes oc ON oc.obra_id = a.obra_id
  WHERE a.id = midias.atualizacao_id
    AND oc.cliente_id = auth.uid()
    AND (midias.unidade IS NULL OR oc.unidade = '' OR lower(btrim(oc.unidade)) = lower(btrim(midias.unidade)))
));

-- Casas do pré-cadastro
CREATE TABLE IF NOT EXISTS public.pre_cadastro_unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pre_cadastro_id uuid NOT NULL REFERENCES public.pre_cadastros(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  unidade text NOT NULL DEFAULT '',
  percentual numeric(5,2),
  contrato_ok boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pre_cadastro_id, obra_id, unidade)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pre_cadastro_unidades TO authenticated;
GRANT ALL ON public.pre_cadastro_unidades TO service_role;
ALTER TABLE public.pre_cadastro_unidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pre_cadastro_unidades_admin_all ON public.pre_cadastro_unidades;
CREATE POLICY pre_cadastro_unidades_admin_all ON public.pre_cadastro_unidades FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- Migra vínculos já definidos no pré-cadastro para a nova tabela
INSERT INTO public.pre_cadastro_unidades (pre_cadastro_id, obra_id, unidade)
SELECT id, obra_id, coalesce(unidade, '') FROM public.pre_cadastros WHERE obra_id IS NOT NULL
ON CONFLICT DO NOTHING;