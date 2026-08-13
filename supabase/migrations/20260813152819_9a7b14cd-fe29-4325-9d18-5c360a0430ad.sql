ALTER TABLE public.obra_clientes ADD COLUMN IF NOT EXISTS unidade text;
ALTER TABLE public.midias ADD COLUMN IF NOT EXISTS unidade text;
ALTER TABLE public.atualizacoes ADD COLUMN IF NOT EXISTS resumos_unidades jsonb;

DROP POLICY IF EXISTS midias_cliente_select ON public.midias;
CREATE POLICY midias_cliente_select ON public.midias
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.atualizacoes a
    JOIN public.obra_clientes oc ON oc.obra_id = a.obra_id
    WHERE a.id = midias.atualizacao_id
      AND oc.cliente_id = auth.uid()
      AND (
        midias.unidade IS NULL
        OR oc.unidade IS NULL
        OR lower(btrim(oc.unidade)) = lower(btrim(midias.unidade))
      )
  )
);