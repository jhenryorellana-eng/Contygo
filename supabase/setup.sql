-- ============================================================
-- UsaLatinoPrime — Reseñas de clientes
-- Ejecutar UNA VEZ en el proyecto de Supabase (SQL Editor).
--
-- ANTES DE EJECUTAR: sustituye REEMPLAZA_ESTE_SECRETO (más abajo)
-- por una cadena larga aleatoria. La MISMA cadena va en la variable
-- de entorno SUPABASE_ADMIN_SECRET de la web (Vercel / .env.local).
--
-- Diseño:
--  · Cualquiera puede ENVIAR una reseña (queda 'pending', invisible).
--  · El público solo LEE las aprobadas.
--  · Moderar (listar pendientes, aprobar, rechazar) exige el secreto
--    de admin, que solo conoce el servidor de la web. No hace falta
--    la service_role key.
--  · Prefijo ulp_ para no chocar con otras tablas si el proyecto
--    se comparte.
-- ============================================================

-- ---- Tabla ----
create table if not exists public.ulp_reviews (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null check (char_length(name) between 2 and 80),
  service_id text,
  rating     int  not null check (rating between 1 and 5),
  comment    text not null check (char_length(comment) between 10 and 600),
  status     text not null default 'pending'
             check (status in ('pending', 'approved', 'rejected'))
);

alter table public.ulp_reviews enable row level security;

-- ---- Políticas públicas (rol anon) ----
drop policy if exists "ulp_reviews_insert_public" on public.ulp_reviews;
create policy "ulp_reviews_insert_public" on public.ulp_reviews
  for insert to anon
  with check (status = 'pending');

drop policy if exists "ulp_reviews_select_approved" on public.ulp_reviews;
create policy "ulp_reviews_select_approved" on public.ulp_reviews
  for select to anon
  using (status = 'approved');

-- ---- Config privada del admin ----
-- Sin políticas: con RLS activo nadie la lee por la API.
create table if not exists public.ulp_admin_config (
  id           boolean primary key default true check (id),
  admin_secret text not null
);
alter table public.ulp_admin_config enable row level security;

insert into public.ulp_admin_config (id, admin_secret)
values (true, 'REEMPLAZA_ESTE_SECRETO')
on conflict (id) do update set admin_secret = excluded.admin_secret;

-- ---- Funciones de moderación (exigen el secreto) ----
create or replace function public.ulp_admin_reviews_list(
  p_secret text,
  p_status text default 'pending'
)
returns setof public.ulp_reviews
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.ulp_admin_config where admin_secret = p_secret) then
    raise exception 'unauthorized';
  end if;
  return query
    select r.* from public.ulp_reviews r
    where p_status = 'all' or r.status = p_status
    order by r.created_at desc;
end;
$$;

create or replace function public.ulp_admin_review_set_status(
  p_secret text,
  p_id     uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.ulp_admin_config where admin_secret = p_secret) then
    raise exception 'unauthorized';
  end if;
  if p_status not in ('pending', 'approved', 'rejected') then
    raise exception 'invalid status';
  end if;
  update public.ulp_reviews set status = p_status where id = p_id;
end;
$$;

grant execute on function public.ulp_admin_reviews_list(text, text) to anon;
grant execute on function public.ulp_admin_review_set_status(text, uuid, text) to anon;
