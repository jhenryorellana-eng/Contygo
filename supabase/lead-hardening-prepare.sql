-- Fase 1: compatible con la web anterior. Aplicar antes del despliegue.
-- El cierre de las llamadas antiguas está en lead-hardening-cutover.sql.
create index if not exists ulp_leads_contact_id_idx on public.ulp_leads(contact_id);
create index if not exists ulp_team_users_advisor_id_idx on public.ulp_team_users(advisor_id);
alter table public.ulp_leads add column if not exists visitor_id uuid;
create index if not exists ulp_leads_visitor_id_idx on public.ulp_leads(visitor_id);

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
create or replace function public.ulp_assign_advisor_secure(p_secret text)
returns table(id text, name text, whatsapp text)
language plpgsql security definer set search_path = public as $$
begin
  perform public.ulp_check_secret(p_secret);
  -- Serializa la elección completa, no solo la actualización de la fila ganadora.
  perform pg_advisory_xact_lock(724106, 1);
  return query select * from public.ulp_assign_advisor();
end; $$;
revoke all on function public.ulp_assign_advisor_secure(text) from public, anon, authenticated;
grant execute on function public.ulp_assign_advisor_secure(text) to anon;

create or replace function public.ulp_record_lead(
  p_secret text, p_id uuid, p_advisor_id text, p_kind text, p_path text,
  p_service_id text, p_source text, p_contact_id uuid, p_visitor_id uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_source text;
  v_contact public.ulp_contacts%rowtype;
  v_inserted uuid;
begin
  perform public.ulp_check_secret(p_secret);
  if p_id is null or p_visitor_id is null then raise exception 'invalid_id'; end if;
  if p_source is null or p_source not in ('auto','sticky') then raise exception 'invalid_source'; end if;
  if not exists(select 1 from public.ulp_advisors where id=p_advisor_id and active) then
    raise exception 'advisor_unavailable';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_visitor_id::text, 724106));
  if p_contact_id is not null then
    select * into v_contact from public.ulp_contacts where id=p_contact_id for update;
    if not found then raise exception 'contact_not_found'; end if;
    if v_contact.advisor_id is distinct from p_advisor_id then
      if exists(select 1 from public.ulp_advisors where id=v_contact.advisor_id and active) then
        raise exception 'advisor_mismatch';
      end if;
      update public.ulp_contacts set advisor_id=p_advisor_id where id=p_contact_id;
    end if;
  end if;

  -- Un mismo visitante o contacto solo aporta un primer clic, incluso con
  -- solicitudes simultáneas, formulario previo o una nueva cookie de navegador.
  if exists(select 1 from public.ulp_leads where visitor_id=p_visitor_id)
     or (p_contact_id is not null and exists(select 1 from public.ulp_leads where contact_id=p_contact_id)) then
    v_source := 'sticky';
  else
    v_source := p_source;
  end if;
  insert into public.ulp_leads(id,advisor_id,kind,path,service_id,source,contact_id,visitor_id)
    values(p_id,p_advisor_id,p_kind,p_path,p_service_id,v_source,p_contact_id,p_visitor_id)
    on conflict (id) do nothing returning id into v_inserted;
  if v_inserted is null then return p_id; end if;

  if p_contact_id is not null then
    perform public.ulp_crm_activity_add(p_secret,p_contact_id,'web','whatsapp',
      'Abrió WhatsApp',
      jsonb_build_object('kind',p_kind,'path',p_path,'advisor_id',p_advisor_id,'lead_id',p_id));
  end if;
  return p_id;
end; $$;
revoke all on function public.ulp_record_lead(text,uuid,text,text,text,text,text,uuid,uuid) from public, anon, authenticated;
grant execute on function public.ulp_record_lead(text,uuid,text,text,text,text,text,uuid,uuid) to anon;

