create schema if not exists private;
revoke all on schema private from anon, authenticated;
grant usage on schema private to authenticated, service_role;

create or replace function private.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path to 'public'
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role); $$;

create or replace function private.is_obra_engenheiro(_obra_id uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$ select exists (select 1 from public.obras o where o.id = _obra_id and o.engenheiro_id = auth.uid()); $$;

create or replace function private.is_obra_cliente(_obra_id uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$ select exists (select 1 from public.obra_clientes oc where oc.obra_id = _obra_id and oc.cliente_id = auth.uid()); $$;

create or replace function private.can_view_atualizacao(_atualizacao_id uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$ select exists (select 1 from public.atualizacoes a where a.id = _atualizacao_id and (private.is_obra_engenheiro(a.obra_id) or private.is_obra_cliente(a.obra_id))); $$;

revoke all on function private.has_role(uuid, app_role) from public;
revoke all on function private.is_obra_engenheiro(uuid) from public;
revoke all on function private.is_obra_cliente(uuid) from public;
revoke all on function private.can_view_atualizacao(uuid) from public;
grant execute on function private.has_role(uuid, app_role) to authenticated, service_role;
grant execute on function private.is_obra_engenheiro(uuid) to authenticated, service_role;
grant execute on function private.is_obra_cliente(uuid) to authenticated, service_role;
grant execute on function private.can_view_atualizacao(uuid) to authenticated, service_role;

drop policy if exists atualizacoes_cliente_select on public.atualizacoes;
create policy atualizacoes_cliente_select on public.atualizacoes for select to authenticated using (private.is_obra_cliente(obra_id));
drop policy if exists atualizacoes_engenheiro_all on public.atualizacoes;
create policy atualizacoes_engenheiro_all on public.atualizacoes for all to authenticated using (private.is_obra_engenheiro(obra_id)) with check (private.is_obra_engenheiro(obra_id) and criado_por = auth.uid());

drop policy if exists etapas_cliente_select on public.etapas;
create policy etapas_cliente_select on public.etapas for select to authenticated using (private.is_obra_cliente(obra_id));
drop policy if exists etapas_engenheiro_all on public.etapas;
create policy etapas_engenheiro_all on public.etapas for all to authenticated using (private.is_obra_engenheiro(obra_id)) with check (private.is_obra_engenheiro(obra_id));

drop policy if exists leituras_insert_own on public.leituras;
create policy leituras_insert_own on public.leituras for insert to authenticated with check (user_id = auth.uid() and private.can_view_atualizacao(atualizacao_id));

drop policy if exists midias_cliente_select on public.midias;
create policy midias_cliente_select on public.midias for select to authenticated using (exists (select 1 from public.atualizacoes a where a.id = midias.atualizacao_id and private.is_obra_cliente(a.obra_id)));
drop policy if exists midias_engenheiro_all on public.midias;
create policy midias_engenheiro_all on public.midias for all to authenticated using (exists (select 1 from public.atualizacoes a where a.id = midias.atualizacao_id and private.is_obra_engenheiro(a.obra_id))) with check (exists (select 1 from public.atualizacoes a where a.id = midias.atualizacao_id and private.is_obra_engenheiro(a.obra_id)));

drop policy if exists obra_clientes_engenheiro_all on public.obra_clientes;
create policy obra_clientes_engenheiro_all on public.obra_clientes for all to authenticated using (private.is_obra_engenheiro(obra_id)) with check (private.is_obra_engenheiro(obra_id));

drop policy if exists obras_cliente_select on public.obras;
create policy obras_cliente_select on public.obras for select to authenticated using (private.is_obra_cliente(id));
drop policy if exists obras_engenheiro_all on public.obras;
create policy obras_engenheiro_all on public.obras for all to authenticated using (engenheiro_id = auth.uid()) with check (engenheiro_id = auth.uid() and private.has_role(auth.uid(), 'engenheiro'));

drop policy if exists pre_cadastros_admin_all on public.pre_cadastros;
create policy pre_cadastros_admin_all on public.pre_cadastros for all to authenticated using (private.has_role(auth.uid(), 'admin')) with check (private.has_role(auth.uid(), 'admin'));

drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select on public.profiles for select to authenticated using (private.has_role(auth.uid(), 'admin'));
drop policy if exists profiles_select_obra_membros on public.profiles;
create policy profiles_select_obra_membros on public.profiles for select to authenticated using (
  exists (select 1 from public.obras o where o.engenheiro_id = profiles.id and private.is_obra_cliente(o.id))
  or exists (select 1 from public.obra_clientes oc where oc.cliente_id = profiles.id and private.is_obra_engenheiro(oc.obra_id))
);

drop policy if exists user_roles_admin_select on public.user_roles;
create policy user_roles_admin_select on public.user_roles for select to authenticated using (private.has_role(auth.uid(), 'admin'));

drop policy if exists obras_files_engenheiro_select on storage.objects;
create policy obras_files_engenheiro_select on storage.objects for select to authenticated using (bucket_id = 'obras' and private.is_obra_engenheiro((split_part(name, '/', 1))::uuid));
drop policy if exists obras_files_engenheiro_insert on storage.objects;
create policy obras_files_engenheiro_insert on storage.objects for insert to authenticated with check (bucket_id = 'obras' and private.is_obra_engenheiro((split_part(name, '/', 1))::uuid));
drop policy if exists obras_files_engenheiro_delete on storage.objects;
create policy obras_files_engenheiro_delete on storage.objects for delete to authenticated using (bucket_id = 'obras' and private.is_obra_engenheiro((split_part(name, '/', 1))::uuid));
drop policy if exists obras_files_cliente_select on storage.objects;
create policy obras_files_cliente_select on storage.objects for select to authenticated using (bucket_id = 'obras' and private.is_obra_cliente((split_part(name, '/', 1))::uuid));

drop function if exists public.can_view_atualizacao(uuid);
drop function if exists public.has_role(uuid, app_role);
drop function if exists public.is_obra_engenheiro(uuid);
drop function if exists public.is_obra_cliente(uuid);