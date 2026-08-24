CREATE TYPE public.movimentacao_tipo AS ENUM ('entrada', 'saida');

CREATE TABLE public.materiais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  nome text NOT NULL,
  categoria text NOT NULL DEFAULT '',
  unidade_medida text NOT NULL DEFAULT 'un',
  custo_unitario numeric(14,2),
  fornecedor text NOT NULL DEFAULT '',
  estoque_minimo numeric(14,3) NOT NULL DEFAULT 0,
  observacoes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX materiais_obra_id_idx ON public.materiais(obra_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.materiais TO authenticated;
GRANT ALL ON public.materiais TO service_role;

ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY materiais_engenheiro_all ON public.materiais
  FOR ALL TO authenticated
  USING (private.is_obra_engenheiro(obra_id) OR private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.is_obra_engenheiro(obra_id) OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER materiais_updated_at
  BEFORE UPDATE ON public.materiais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.movimentacoes_estoque (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id uuid NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  tipo public.movimentacao_tipo NOT NULL,
  quantidade numeric(14,3) NOT NULL,
  custo_unitario numeric(14,2),
  fornecedor text NOT NULL DEFAULT '',
  nota_fiscal text NOT NULL DEFAULT '',
  responsavel text NOT NULL DEFAULT '',
  observacoes text NOT NULL DEFAULT '',
  data_movimento date NOT NULL DEFAULT CURRENT_DATE,
  criado_por uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX movimentacoes_estoque_material_id_idx ON public.movimentacoes_estoque(material_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_estoque TO authenticated;
GRANT ALL ON public.movimentacoes_estoque TO service_role;

ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY movimentacoes_estoque_engenheiro_all ON public.movimentacoes_estoque
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.materiais m
    WHERE m.id = movimentacoes_estoque.material_id
      AND (private.is_obra_engenheiro(m.obra_id) OR private.has_role(auth.uid(), 'admin'::app_role))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.materiais m
    WHERE m.id = movimentacoes_estoque.material_id
      AND (private.is_obra_engenheiro(m.obra_id) OR private.has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE OR REPLACE FUNCTION public.validar_quantidade_movimentacao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.quantidade <= 0 THEN
    RAISE EXCEPTION 'A quantidade deve ser maior que zero.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER movimentacoes_estoque_validar
  BEFORE INSERT OR UPDATE ON public.movimentacoes_estoque
  FOR EACH ROW EXECUTE FUNCTION public.validar_quantidade_movimentacao();