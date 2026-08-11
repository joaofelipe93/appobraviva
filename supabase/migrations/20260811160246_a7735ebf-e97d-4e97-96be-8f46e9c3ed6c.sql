CREATE TYPE public.app_role AS ENUM ('engenheiro', 'cliente');
CREATE TYPE public.etapa_status AS ENUM ('nao_iniciada', 'em_andamento', 'concluida');
CREATE TYPE public.midia_tipo AS ENUM ('foto', 'video');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE TABLE public.obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engenheiro_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  endereco TEXT NOT NULL DEFAULT '',
  data_inicio DATE,
  previsao_termino DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obras TO authenticated;
GRANT ALL ON public.obras TO service_role;
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.obra_clientes (
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (obra_id, cliente_id)
);
GRANT SELECT, INSERT, DELETE ON public.obra_clientes TO authenticated;
GRANT ALL ON public.obra_clientes TO service_role;
ALTER TABLE public.obra_clientes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_obra_engenheiro(_obra_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.obras o WHERE o.id = _obra_id AND o.engenheiro_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_obra_cliente(_obra_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.obra_clientes oc WHERE oc.obra_id = _obra_id AND oc.cliente_id = auth.uid());
$$;

CREATE TABLE public.etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  status public.etapa_status NOT NULL DEFAULT 'nao_iniciada',
  data_conclusao DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etapas TO authenticated;
GRANT ALL ON public.etapas TO service_role;
ALTER TABLE public.etapas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.atualizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  criado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_visita DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT NOT NULL DEFAULT '',
  excel_path TEXT,
  excel_nome TEXT,
  excel_dados JSONB,
  etapas_atualizadas UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atualizacoes TO authenticated;
GRANT ALL ON public.atualizacoes TO service_role;
ALTER TABLE public.atualizacoes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.midias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atualizacao_id UUID NOT NULL REFERENCES public.atualizacoes(id) ON DELETE CASCADE,
  tipo public.midia_tipo NOT NULL,
  path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.midias TO authenticated;
GRANT ALL ON public.midias TO service_role;
ALTER TABLE public.midias ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.leituras (
  atualizacao_id UUID NOT NULL REFERENCES public.atualizacoes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lida_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (atualizacao_id, user_id)
);
GRANT SELECT, INSERT ON public.leituras TO authenticated;
GRANT ALL ON public.leituras TO service_role;
ALTER TABLE public.leituras ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_atualizacao(_atualizacao_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.atualizacoes a
    WHERE a.id = _atualizacao_id
      AND (public.is_obra_engenheiro(a.obra_id) OR public.is_obra_cliente(a.obra_id))
  );
$$;

-- profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_select_obra_membros" ON public.profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.obras o WHERE o.engenheiro_id = profiles.id AND public.is_obra_cliente(o.id))
  OR EXISTS (SELECT 1 FROM public.obra_clientes oc WHERE oc.cliente_id = profiles.id AND public.is_obra_engenheiro(oc.obra_id))
);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- user_roles
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- obras
CREATE POLICY "obras_engenheiro_all" ON public.obras FOR ALL TO authenticated USING (engenheiro_id = auth.uid()) WITH CHECK (engenheiro_id = auth.uid() AND public.has_role(auth.uid(), 'engenheiro'));
CREATE POLICY "obras_cliente_select" ON public.obras FOR SELECT TO authenticated USING (public.is_obra_cliente(id));

-- obra_clientes
CREATE POLICY "obra_clientes_engenheiro_all" ON public.obra_clientes FOR ALL TO authenticated USING (public.is_obra_engenheiro(obra_id)) WITH CHECK (public.is_obra_engenheiro(obra_id));
CREATE POLICY "obra_clientes_cliente_select" ON public.obra_clientes FOR SELECT TO authenticated USING (cliente_id = auth.uid());

-- etapas
CREATE POLICY "etapas_engenheiro_all" ON public.etapas FOR ALL TO authenticated USING (public.is_obra_engenheiro(obra_id)) WITH CHECK (public.is_obra_engenheiro(obra_id));
CREATE POLICY "etapas_cliente_select" ON public.etapas FOR SELECT TO authenticated USING (public.is_obra_cliente(obra_id));

-- atualizacoes
CREATE POLICY "atualizacoes_engenheiro_all" ON public.atualizacoes FOR ALL TO authenticated USING (public.is_obra_engenheiro(obra_id)) WITH CHECK (public.is_obra_engenheiro(obra_id) AND criado_por = auth.uid());
CREATE POLICY "atualizacoes_cliente_select" ON public.atualizacoes FOR SELECT TO authenticated USING (public.is_obra_cliente(obra_id));

-- midias
CREATE POLICY "midias_engenheiro_all" ON public.midias FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.atualizacoes a WHERE a.id = midias.atualizacao_id AND public.is_obra_engenheiro(a.obra_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.atualizacoes a WHERE a.id = midias.atualizacao_id AND public.is_obra_engenheiro(a.obra_id))
);
CREATE POLICY "midias_cliente_select" ON public.midias FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.atualizacoes a WHERE a.id = midias.atualizacao_id AND public.is_obra_cliente(a.obra_id))
);

-- leituras
CREATE POLICY "leituras_select_own" ON public.leituras FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "leituras_insert_own" ON public.leituras FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.can_view_atualizacao(atualizacao_id));

CREATE INDEX idx_atualizacoes_obra ON public.atualizacoes(obra_id, data_visita DESC);
CREATE INDEX idx_etapas_obra ON public.etapas(obra_id, ordem);
CREATE INDEX idx_midias_atualizacao ON public.midias(atualizacao_id);