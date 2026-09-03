CREATE TYPE public.suporte_prioridade AS ENUM ('baixa','media','alta');
CREATE TYPE public.suporte_status AS ENUM ('aberto','em_atendimento','resolvido','fechado');

CREATE TABLE public.suporte_chamados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  unidade text NOT NULL DEFAULT '',
  assunto text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  prioridade public.suporte_prioridade NOT NULL DEFAULT 'media',
  status public.suporte_status NOT NULL DEFAULT 'aberto',
  fechado_em timestamptz,
  fechado_por uuid,
  ultima_mensagem_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.suporte_chamados TO authenticated;
GRANT ALL ON public.suporte_chamados TO service_role;
ALTER TABLE public.suporte_chamados ENABLE ROW LEVEL SECURITY;

CREATE POLICY suporte_chamados_admin_all ON public.suporte_chamados
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY suporte_chamados_cliente_select ON public.suporte_chamados
  FOR SELECT TO authenticated
  USING (cliente_id = auth.uid());

CREATE POLICY suporte_chamados_cliente_insert ON public.suporte_chamados
  FOR INSERT TO authenticated
  WITH CHECK (cliente_id = auth.uid() AND status = 'aberto'::suporte_status);

CREATE TRIGGER suporte_chamados_updated_at
  BEFORE UPDATE ON public.suporte_chamados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX suporte_chamados_cliente_idx ON public.suporte_chamados (cliente_id, created_at DESC);
CREATE INDEX suporte_chamados_status_idx ON public.suporte_chamados (status, ultima_mensagem_em DESC);

CREATE TABLE public.suporte_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id uuid NOT NULL REFERENCES public.suporte_chamados(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  autor_papel public.app_role NOT NULL,
  mensagem text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.suporte_mensagens TO authenticated;
GRANT ALL ON public.suporte_mensagens TO service_role;
ALTER TABLE public.suporte_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY suporte_mensagens_admin_all ON public.suporte_mensagens
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY suporte_mensagens_cliente_select ON public.suporte_mensagens
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.suporte_chamados c
    WHERE c.id = suporte_mensagens.chamado_id AND c.cliente_id = auth.uid()
  ));

CREATE POLICY suporte_mensagens_cliente_insert ON public.suporte_mensagens
  FOR INSERT TO authenticated
  WITH CHECK (
    autor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.suporte_chamados c
      WHERE c.id = suporte_mensagens.chamado_id AND c.cliente_id = auth.uid()
    )
  );

CREATE INDEX suporte_mensagens_chamado_idx ON public.suporte_mensagens (chamado_id, created_at);

CREATE TABLE public.suporte_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id uuid NOT NULL REFERENCES public.suporte_chamados(id) ON DELETE CASCADE,
  mensagem_id uuid REFERENCES public.suporte_mensagens(id) ON DELETE CASCADE,
  path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.suporte_anexos TO authenticated;
GRANT ALL ON public.suporte_anexos TO service_role;
ALTER TABLE public.suporte_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY suporte_anexos_admin_all ON public.suporte_anexos
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY suporte_anexos_cliente_select ON public.suporte_anexos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.suporte_chamados c
    WHERE c.id = suporte_anexos.chamado_id AND c.cliente_id = auth.uid()
  ));

CREATE POLICY suporte_anexos_cliente_insert ON public.suporte_anexos
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.suporte_chamados c
    WHERE c.id = suporte_anexos.chamado_id AND c.cliente_id = auth.uid()
  ));

CREATE INDEX suporte_anexos_chamado_idx ON public.suporte_anexos (chamado_id, created_at);