-- ============================================================
-- UsaLatinoPrime — CRM interno (equipo, contactos, actividad)
-- Ya aplicado en Supabase (migración ulp_crm_core). Registro para
-- recrear el esquema. Requiere setup.sql y advisors.sql.
-- Todo el acceso pasa por RPC con el secreto de admin (RLS sin políticas):
-- el navegador nunca toca estas tablas; el servidor de la web sí.
--
-- Etapas: nuevo → contactado → calificado → pagado → en_tramite → cerrado
--         (o perdido, con motivo). first_contact_at mide la velocidad de
--         respuesta (ver docs/evidencia-crm.md).
-- ============================================================
create extension if not exists pgcrypto;

create table if not exists public.ulp_team_users (
  id            text primary key check (id ~ '^[a-z0-9-]{2,30}$'),
  name          text not null check (char_length(name) between 2 and 60),
  role          text not null check (role in ('owner','advisor')),
  advisor_id    text references public.ulp_advisors(id),
  password_hash text not null,                    -- bcrypt (pgcrypto)
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);
alter table public.ulp_team_users enable row level security;

create table if not exists public.ulp_contacts (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  name             text not null check (char_length(name) between 2 and 80),
  phone            text check (phone is null or phone ~ '^[0-9]{8,15}$'),
  service_id       text check (service_id is null or char_length(service_id) <= 40),
  stage            text not null default 'nuevo'
                   check (stage in ('nuevo','contactado','calificado','pagado','en_tramite','cerrado','perdido')),
  advisor_id       text references public.ulp_advisors(id),
  source           text not null default 'manual' check (source in ('embudo','manual','prime','whatsapp')),
  answers          jsonb,                         -- respuestas del cuestionario
  result_tone      text,                          -- success | urgent | contact
  notes            text check (notes is null or char_length(notes) <= 4000),
  next_action      text check (next_action is null or char_length(next_action) <= 200),
  next_action_at   timestamptz,
  first_contact_at timestamptz,
  lost_reason      text check (lost_reason is null or char_length(lost_reason) <= 200),
  amount           numeric(10,2),
  last_activity_at timestamptz not null default now(),
  created_by       text
);
alter table public.ulp_contacts enable row level security;
create index if not exists ulp_contacts_advisor_stage_idx on public.ulp_contacts (advisor_id, stage);
create index if not exists ulp_contacts_next_action_idx on public.ulp_contacts (next_action_at) where next_action_at is not null;
create index if not exists ulp_contacts_updated_idx on public.ulp_contacts (updated_at desc);
create index if not exists ulp_contacts_phone_idx on public.ulp_contacts (phone) where phone is not null;

create table if not exists public.ulp_activities (
  id         uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.ulp_contacts(id) on delete cascade,
  created_at timestamptz not null default now(),
  author     text,
  kind       text not null check (kind in ('nota','etapa','whatsapp','llamada','cita','seguimiento','sistema')),
  body       text check (body is null or char_length(body) <= 2000),
  meta       jsonb
);
alter table public.ulp_activities enable row level security;
create index if not exists ulp_activities_contact_idx on public.ulp_activities (contact_id, created_at desc);

alter table public.ulp_leads add column if not exists contact_id uuid references public.ulp_contacts(id) on delete set null;

-- Ejecutar a continuación crm-functions.sql y lead-hardening-prepare.sql.
-- El cierre de permisos se aplica con lead-hardening-cutover.sql después
-- de desplegar la versión de la web que utiliza las RPC protegidas.
