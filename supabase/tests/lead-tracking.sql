-- Pruebas de integración: todas las escrituras se revierten.
begin;
do $test$
declare
  secret text;
  advisor text;
  cid uuid;
  visitor uuid := gen_random_uuid();
  visitor2 uuid := gen_random_uuid();
  click1 uuid := gen_random_uuid();
  click2 uuid := gen_random_uuid();
  click3 uuid := gen_random_uuid();
  before_count bigint;
begin
  select admin_secret into secret from public.ulp_admin_config limit 1;
  select id into advisor from public.ulp_advisors where active order by id limit 1;
  if secret is null or advisor is null then raise exception 'test_setup_missing'; end if;

  begin
    perform public.ulp_assign_advisor_secure('invalid-test-secret');
    raise exception 'test_expected_rejection';
  exception when raise_exception then
    if sqlerrm <> 'unauthorized' then raise; end if;
  end;
  begin
    perform public.ulp_record_lead('invalid-test-secret',click1,advisor,'whatsapp','/audit',null,'auto',null,visitor);
    raise exception 'test_expected_rejection';
  exception when raise_exception then
    if sqlerrm <> 'unauthorized' then raise; end if;
  end;

  select sum(assigned_count) into before_count from public.ulp_advisors;
  perform public.ulp_assign_advisor_secure(secret);
  if (select sum(assigned_count) from public.ulp_advisors) <> before_count+1 then raise exception 'test_assignment_failed'; end if;

  -- Emula captura previa: ya tiene asesora pero todavía no abrió WhatsApp.
  cid := public.ulp_crm_contact_create(secret,'Prueba transaccional',null,null,'nuevo',advisor,'embudo',null,null,null,'web');
  perform public.ulp_record_lead(secret,click1,advisor,'whatsapp','/audit',null,'auto',cid,visitor);
  perform public.ulp_record_lead(secret,click2,advisor,'cita','/audit',null,'auto',cid,visitor);
  -- Mismo contacto desde otro navegador tampoco cuenta como nuevo.
  perform public.ulp_record_lead(secret,click3,advisor,'whatsapp','/audit',null,'auto',cid,visitor2);
  -- Reintento con el mismo ID: no crea otro lead ni otra actividad.
  perform public.ulp_record_lead(secret,click1,advisor,'whatsapp','/audit',null,'auto',cid,visitor);
  if (select count(*) from public.ulp_leads where contact_id=cid and source='auto') <> 1 then raise exception 'test_first_click_count'; end if;
  if (select count(*) from public.ulp_leads where contact_id=cid and source='sticky') <> 2 then raise exception 'test_repeat_count'; end if;
  if (select count(*) from public.ulp_activities where contact_id=cid and kind='whatsapp') <> 3 then raise exception 'test_atomic_history'; end if;
  if (select first_contact_at from public.ulp_contacts where id=cid) is not null then raise exception 'test_visitor_marked_as_advisor'; end if;

  perform public.ulp_crm_activity_add(secret,cid,'Asesora de prueba','llamada','Llamó al contacto',null);
  if (select first_contact_at from public.ulp_contacts where id=cid) is null then raise exception 'test_human_not_recorded'; end if;

  -- Visitante sin formulario: una sola conversión, luego repetición.
  visitor := gen_random_uuid();
  click1 := gen_random_uuid();
  click2 := gen_random_uuid();
  perform public.ulp_record_lead(secret,click1,advisor,'whatsapp','/audit',null,'auto',null,visitor);
  perform public.ulp_record_lead(secret,click2,advisor,'whatsapp','/audit',null,'auto',null,visitor);
  if (select count(*) from public.ulp_leads where visitor_id=visitor and source='auto') <> 1 then raise exception 'test_anonymous_first'; end if;
  if (select count(*) from public.ulp_leads where visitor_id=visitor and source='sticky') <> 1 then raise exception 'test_anonymous_repeat'; end if;
end;
$test$;
rollback;
select 'passed: secret guards, assignment, first/repeat clicks, atomic history, retry idempotency, human response; all writes rolled back' as test_result;

