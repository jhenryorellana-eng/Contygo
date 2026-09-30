-- Fase 2: ejecutar SOLO después de desplegar la web que utiliza
-- ulp_assign_advisor_secure y ulp_record_lead y comprobar sus rutas.
-- No afecta a reseñas ni a las RPC administrativas que validan p_secret.
revoke execute on function public.ulp_assign_advisor() from public, anon, authenticated;
drop policy if exists "ulp_leads_insert_public" on public.ulp_leads;
revoke insert on table public.ulp_leads from public, anon, authenticated;
