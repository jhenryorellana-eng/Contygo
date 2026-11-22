-- ============================================================
-- Felicitaciones (21-11-2026): una reseña puede llevar foto, el lugar
-- y decir si es un trámite aprobado. Se ejecuta UNA vez en el proyecto
-- de Supabase, después de setup.sql. Es idempotente.
--
-- La foto solo se guarda con el permiso de quien la envía (consent), y
-- nada se publica hasta que el dueño lo aprueba en /admin.
-- ============================================================

alter table public.ulp_reviews
  add column if not exists kind       text    not null default 'review',
  add column if not exists place      text,
  add column if not exists image_path text,
  add column if not exists consent    boolean not null default false;

alter table public.ulp_reviews drop constraint if exists ulp_reviews_kind_check;
alter table public.ulp_reviews add  constraint ulp_reviews_kind_check
  check (kind in ('review', 'approval'));

alter table public.ulp_reviews drop constraint if exists ulp_reviews_place_check;
alter table public.ulp_reviews add  constraint ulp_reviews_place_check
  check (place is null or char_length(place) between 2 and 60);

-- El nombre del archivo lo pone el servidor: un uuid y su extensión.
alter table public.ulp_reviews drop constraint if exists ulp_reviews_image_path_check;
alter table public.ulp_reviews add  constraint ulp_reviews_image_path_check
  check (image_path is null or image_path ~ '^[0-9a-f-]{36}\.jpg$');

-- Una foto, solo con permiso.
alter table public.ulp_reviews drop constraint if exists ulp_reviews_image_needs_consent;
alter table public.ulp_reviews add  constraint ulp_reviews_image_needs_consent
  check (image_path is null or consent);

-- ---- Las fotos: un cajón público de solo imágenes pequeñas ----
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('felicitaciones', 'felicitaciones', true, 1572864, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- La clave anon vive solo en el servidor de la landing (nunca llega al
-- navegador): es él quien sube la foto, ya revisada y reducida.
drop policy if exists "felicitaciones_insert" on storage.objects;
create policy "felicitaciones_insert" on storage.objects
  for insert to anon
  with check (bucket_id = 'felicitaciones');
