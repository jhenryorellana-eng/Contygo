-- Funciones del CRM exportadas del proyecto cbdyfraxmhtcuhftfgoj.
-- Ejecutar después de setup.sql, advisors.sql y crm.sql.
-- No contiene contraseñas, secretos ni datos de clientes.

CREATE OR REPLACE FUNCTION public.ulp_check_secret(p_secret text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (select 1 from public.ulp_admin_config where admin_secret = p_secret) then
    raise exception 'unauthorized';
  end if;
end; $function$;
REVOKE ALL ON FUNCTION public.ulp_check_secret(p_secret text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ulp_check_secret(p_secret text) TO anon;

CREATE OR REPLACE FUNCTION public.ulp_crm_activities_list(p_secret text, p_contact_id uuid, p_limit integer DEFAULT 200)
 RETURNS SETOF ulp_activities
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.ulp_check_secret(p_secret);
  return query select a.* from public.ulp_activities a where a.contact_id = p_contact_id
    order by a.created_at desc limit greatest(1, least(p_limit, 1000));
end; $function$;
REVOKE ALL ON FUNCTION public.ulp_crm_activities_list(p_secret text, p_contact_id uuid, p_limit integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ulp_crm_activities_list(p_secret text, p_contact_id uuid, p_limit integer) TO anon;

CREATE OR REPLACE FUNCTION public.ulp_crm_activity_add(p_secret text, p_contact_id uuid, p_author text, p_kind text, p_body text, p_meta jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.ulp_check_secret(p_secret);
  insert into public.ulp_activities (contact_id, author, kind, body, meta) values (p_contact_id, p_author, p_kind, p_body, p_meta);
  update public.ulp_contacts c set last_activity_at = now(), updated_at = now(),
    first_contact_at = case when c.first_contact_at is null and p_author is not null and p_author <> 'web' and p_kind in ('whatsapp','llamada','cita') then now() else c.first_contact_at end
    where c.id = p_contact_id;
end; $function$;
REVOKE ALL ON FUNCTION public.ulp_crm_activity_add(p_secret text, p_contact_id uuid, p_author text, p_kind text, p_body text, p_meta jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ulp_crm_activity_add(p_secret text, p_contact_id uuid, p_author text, p_kind text, p_body text, p_meta jsonb) TO anon;

CREATE OR REPLACE FUNCTION public.ulp_crm_contact_create(p_secret text, p_name text, p_phone text, p_service_id text, p_stage text, p_advisor_id text, p_source text, p_answers jsonb, p_result_tone text, p_notes text, p_created_by text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; v_existing uuid;
begin
  perform public.ulp_check_secret(p_secret);
  -- Mismo teléfono con caso abierto → no se duplica: se enriquece y se anota.
  if p_phone is not null then
    select c.id into v_existing from public.ulp_contacts c
      where c.phone = p_phone and c.stage not in ('cerrado','perdido')
      order by c.created_at desc limit 1;
  end if;
  if v_existing is not null then
    update public.ulp_contacts c
       set service_id = coalesce(p_service_id, c.service_id),
           answers = coalesce(p_answers, c.answers),
           result_tone = coalesce(p_result_tone, c.result_tone),
           updated_at = now(), last_activity_at = now()
     where c.id = v_existing;
    insert into public.ulp_activities (contact_id, author, kind, body, meta)
    values (v_existing, p_created_by, 'sistema', 'Volvió a completar el cuestionario', jsonb_build_object('service_id', p_service_id, 'source', p_source));
    return v_existing;
  end if;
  insert into public.ulp_contacts (name, phone, service_id, stage, advisor_id, source, answers, result_tone, notes, created_by)
  values (p_name, p_phone, p_service_id, coalesce(p_stage, 'nuevo'), p_advisor_id, coalesce(p_source, 'manual'), p_answers, p_result_tone, p_notes, p_created_by)
  returning id into v_id;
  insert into public.ulp_activities (contact_id, author, kind, body, meta)
  values (v_id, p_created_by, 'sistema',
          case coalesce(p_source, 'manual') when 'embudo' then 'Llegó desde el cuestionario de la web' when 'prime' then 'Llegó desde Prime' else 'Contacto creado' end,
          jsonb_build_object('service_id', p_service_id, 'source', p_source));
  return v_id;
end; $function$;
REVOKE ALL ON FUNCTION public.ulp_crm_contact_create(p_secret text, p_name text, p_phone text, p_service_id text, p_stage text, p_advisor_id text, p_source text, p_answers jsonb, p_result_tone text, p_notes text, p_created_by text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ulp_crm_contact_create(p_secret text, p_name text, p_phone text, p_service_id text, p_stage text, p_advisor_id text, p_source text, p_answers jsonb, p_result_tone text, p_notes text, p_created_by text) TO anon;

CREATE OR REPLACE FUNCTION public.ulp_crm_contact_get(p_secret text, p_id uuid)
 RETURNS SETOF ulp_contacts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.ulp_check_secret(p_secret);
  return query select c.* from public.ulp_contacts c where c.id = p_id;
end; $function$;
REVOKE ALL ON FUNCTION public.ulp_crm_contact_get(p_secret text, p_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ulp_crm_contact_get(p_secret text, p_id uuid) TO anon;

CREATE OR REPLACE FUNCTION public.ulp_crm_contact_update(p_secret text, p_id uuid, p_patch jsonb, p_author text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.ulp_contacts%rowtype; v_stage text;
begin
  perform public.ulp_check_secret(p_secret);
  select * into v from public.ulp_contacts c where c.id = p_id;
  if not found then raise exception 'not_found'; end if;
  v_stage := coalesce(p_patch->>'stage', v.stage);
  update public.ulp_contacts c set
    name           = coalesce(p_patch->>'name', c.name),
    phone          = case when p_patch ? 'phone' then nullif(p_patch->>'phone','') else c.phone end,
    service_id     = case when p_patch ? 'service_id' then nullif(p_patch->>'service_id','') else c.service_id end,
    stage          = v_stage,
    advisor_id     = case when p_patch ? 'advisor_id' then nullif(p_patch->>'advisor_id','') else c.advisor_id end,
    notes          = case when p_patch ? 'notes' then nullif(p_patch->>'notes','') else c.notes end,
    next_action    = case when p_patch ? 'next_action' then nullif(p_patch->>'next_action','') else c.next_action end,
    next_action_at = case when p_patch ? 'next_action_at' then nullif(p_patch->>'next_action_at','')::timestamptz else c.next_action_at end,
    lost_reason    = case when p_patch ? 'lost_reason' then nullif(p_patch->>'lost_reason','') else c.lost_reason end,
    amount         = case when p_patch ? 'amount' then nullif(p_patch->>'amount','')::numeric else c.amount end,
    first_contact_at = case when v.first_contact_at is null and v_stage <> 'nuevo' then now() else c.first_contact_at end,
    updated_at = now(), last_activity_at = now()
  where c.id = p_id;
  if v_stage <> v.stage then
    insert into public.ulp_activities (contact_id, author, kind, body, meta)
    values (p_id, p_author, 'etapa', null, jsonb_build_object('from', v.stage, 'to', v_stage, 'lost_reason', p_patch->>'lost_reason'));
  end if;
  if p_patch ? 'advisor_id' and coalesce(p_patch->>'advisor_id','') <> coalesce(v.advisor_id,'') then
    insert into public.ulp_activities (contact_id, author, kind, body, meta)
    values (p_id, p_author, 'sistema', 'Reasignado', jsonb_build_object('from', v.advisor_id, 'to', p_patch->>'advisor_id'));
  end if;
end; $function$;
REVOKE ALL ON FUNCTION public.ulp_crm_contact_update(p_secret text, p_id uuid, p_patch jsonb, p_author text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ulp_crm_contact_update(p_secret text, p_id uuid, p_patch jsonb, p_author text) TO anon;

CREATE OR REPLACE FUNCTION public.ulp_crm_contacts_list(p_secret text, p_advisor_id text DEFAULT NULL::text, p_stage text DEFAULT NULL::text, p_q text DEFAULT NULL::text, p_limit integer DEFAULT 400)
 RETURNS SETOF ulp_contacts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.ulp_check_secret(p_secret);
  return query
    select c.* from public.ulp_contacts c
    where (p_advisor_id is null or c.advisor_id = p_advisor_id)
      and (p_stage is null or c.stage = p_stage)
      and (p_q is null or p_q = '' or c.name ilike '%' || p_q || '%' or coalesce(c.phone,'') like '%' || regexp_replace(p_q, '\D', '', 'g') || '%')
    order by c.updated_at desc
    limit greatest(1, least(p_limit, 2000));
end; $function$;
REVOKE ALL ON FUNCTION public.ulp_crm_contacts_list(p_secret text, p_advisor_id text, p_stage text, p_q text, p_limit integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ulp_crm_contacts_list(p_secret text, p_advisor_id text, p_stage text, p_q text, p_limit integer) TO anon;

CREATE OR REPLACE FUNCTION public.ulp_crm_lead_link(p_secret text, p_lead_id uuid, p_contact_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.ulp_check_secret(p_secret);
  update public.ulp_leads set contact_id = p_contact_id where id = p_lead_id;
end; $function$;
REVOKE ALL ON FUNCTION public.ulp_crm_lead_link(p_secret text, p_lead_id uuid, p_contact_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ulp_crm_lead_link(p_secret text, p_lead_id uuid, p_contact_id uuid) TO anon;

CREATE OR REPLACE FUNCTION public.ulp_team_login(p_secret text, p_user text, p_password text)
 RETURNS TABLE(id text, name text, role text, advisor_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v public.ulp_team_users%rowtype;
begin
  perform public.ulp_check_secret(p_secret);
  select * into v from public.ulp_team_users u where u.id = lower(p_user) and u.active;
  if not found or v.password_hash <> crypt(p_password, v.password_hash) then
    return;
  end if;
  update public.ulp_team_users u set last_login_at = now() where u.id = v.id;
  return query select v.id, v.name, v.role, v.advisor_id;
end; $function$;
REVOKE ALL ON FUNCTION public.ulp_team_login(p_secret text, p_user text, p_password text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ulp_team_login(p_secret text, p_user text, p_password text) TO anon;

CREATE OR REPLACE FUNCTION public.ulp_team_user_upsert(p_secret text, p_id text, p_name text, p_role text, p_advisor_id text, p_password text, p_active boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  perform public.ulp_check_secret(p_secret);
  if p_password is not null and char_length(p_password) < 6 then
    raise exception 'password_too_short';
  end if;
  insert into public.ulp_team_users (id, name, role, advisor_id, password_hash, active)
  values (lower(p_id), p_name, p_role, p_advisor_id, crypt(coalesce(p_password, gen_random_uuid()::text), gen_salt('bf')), p_active)
  on conflict (id) do update
    set name = excluded.name, role = excluded.role, advisor_id = excluded.advisor_id, active = excluded.active,
        password_hash = case when p_password is null then public.ulp_team_users.password_hash else excluded.password_hash end;
end; $function$;
REVOKE ALL ON FUNCTION public.ulp_team_user_upsert(p_secret text, p_id text, p_name text, p_role text, p_advisor_id text, p_password text, p_active boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ulp_team_user_upsert(p_secret text, p_id text, p_name text, p_role text, p_advisor_id text, p_password text, p_active boolean) TO anon;

CREATE OR REPLACE FUNCTION public.ulp_team_users_list(p_secret text)
 RETURNS TABLE(id text, name text, role text, advisor_id text, active boolean, created_at timestamp with time zone, last_login_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.ulp_check_secret(p_secret);
  return query select u.id, u.name, u.role, u.advisor_id, u.active, u.created_at, u.last_login_at
    from public.ulp_team_users u order by u.created_at;
end; $function$;
REVOKE ALL ON FUNCTION public.ulp_team_users_list(p_secret text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ulp_team_users_list(p_secret text) TO anon;
