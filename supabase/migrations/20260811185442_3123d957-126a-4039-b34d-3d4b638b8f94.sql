CREATE TABLE public.pre_cadastros (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL DEFAULT '',
  cpf text NOT NULL,
  email text NOT NULL DEFAULT '',
  papel public.app_role NOT NULL,
  criado_por uuid,
  usado_em timestamp with time zone,
  usado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX pre_cadastros_cpf_key ON public.pre_cadastros (cpf);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pre_cadastros TO authenticated;
GRANT ALL ON public.pre_cadastros TO service_role;

ALTER TABLE public.pre_cadastros ENABLE ROW LEVEL SECURITY;

CREATE POLICY pre_cadastros_admin_all ON public.pre_cadastros
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER pre_cadastros_updated_at
  BEFORE UPDATE ON public.pre_cadastros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY user_roles_admin_select ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY profiles_admin_select ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));