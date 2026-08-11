REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_obra_engenheiro(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_obra_cliente(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_view_atualizacao(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_obra_engenheiro(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_obra_cliente(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_atualizacao(UUID) TO authenticated, service_role;