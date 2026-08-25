-- 1) Remove políticas antigas dependentes da obra
DROP POLICY IF EXISTS materiais_engenheiro_all ON public.materiais;
DROP POLICY IF EXISTS movimentacoes_estoque_engenheiro_all ON public.movimentacoes_estoque;

-- 2) Materiais deixam de pertencer a uma obra
ALTER TABLE public.materiais DROP CONSTRAINT IF EXISTS materiais_obra_id_fkey;
ALTER TABLE public.materiais DROP COLUMN IF EXISTS obra_id;

-- 3) Políticas: estoque geral para engenheiros e admins
CREATE POLICY materiais_equipe_all ON public.materiais
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'engenheiro'::app_role) OR private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'engenheiro'::app_role) OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY movimentacoes_estoque_equipe_all ON public.movimentacoes_estoque
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'engenheiro'::app_role) OR private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'engenheiro'::app_role) OR private.has_role(auth.uid(), 'admin'::app_role));