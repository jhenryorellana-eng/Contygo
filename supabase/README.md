# Base de datos de USA Latino Prime

Proyecto: `cbdyfraxmhtcuhftfgoj` (PaginaWeb).

## Reconstrucción en un proyecto nuevo

Ejecutar los archivos en este orden:

1. `setup.sql`: sustituir el secreto de ejemplo por uno nuevo y configurar el mismo valor en `SUPABASE_ADMIN_SECRET` del servidor.
2. `advisors.sql`.
3. `crm.sql`.
4. `crm-functions.sql`: definiciones completas de las funciones del CRM y del equipo, sin contraseñas ni datos exportados.
5. `lead-hardening-prepare.sql`.
6. Desplegar la web de esta versión.
7. `lead-hardening-cutover.sql`.

Estos archivos reconstruyen el esquema y las funciones. No son una copia de los datos de clientes ni de los accesos del equipo. Crear las cuentas con contraseña nueva mediante el panel del dueño.

## Actualización del proyecto existente

La migración `ulp_lead_tracking_secure_prepare` está aplicada. Añade los índices pendientes, la identidad del visitante, las RPC protegidas y la corrección de `first_contact_at`.

Las nuevas llamadas usan la misma `SUPABASE_ADMIN_SECRET` que el CRM. No introducirla en variables `NEXT_PUBLIC_*`.

El siguiente paso es desplegar el código actualizado en el proyecto Vercel `new-landing-8ehi`, ID `prj_xm1twLPC7yQXJr1dpqoUmA2J56hf`, equipo `team_hma3AVHZQnS5Q9DGbWrMlnR3`, dominio `www.usalatinoprime.com`.

Solo después de validar el despliegue se aplica `lead-hardening-cutover.sql`: retira la llamada anónima al reparto antiguo y la inserción directa en leads. Aplicarlo antes rompería estas operaciones en la versión anterior de la web.

La fase compatible no elimina todavía esas dos vías antiguas. Las advertencias sobre funciones `SECURITY DEFINER` protegidas por secreto y tablas privadas con RLS sin políticas responden al modelo de acceso del servidor; no se deben resolver abriendo las tablas.

## Qué se mide

- `assigned_count`: turnos consumidos en la captura o en un clic sin asesora previa.
- Lead `auto`: primer clic reconocido del visitante/contacto. No confirma que haya enviado el mensaje.
- Lead `sticky`: clic posterior del mismo visitante o contacto.
- `first_contact_at`: primera actividad humana de contacto o cambio de etapa; el clic web del cliente no lo establece.
- El registro del clic y su actividad se guardan en una única transacción. Un mismo ID de operación no duplica el historial.
- Las cookies de contacto y visitante están firmadas y vencen a los 30 días. Las cookies de contacto antiguas sin firma se ignoran; una nueva captura genera una válida.

No se reconstruyen asociaciones históricas sin evidencia: los 33 leads existentes no tenían `contact_id` y no se han vinculado arbitrariamente.

## Verificación

- `npm test`: flujo de captura a WhatsApp, asesora existente, cookies manipuladas/vencidas y bots. Usa respuestas simuladas; no conecta a producción.
- `npm run lint` y `npx tsc --noEmit --incremental false`.
- `npm run build` (requiere acceso a Google Fonts).
- `tests/lead-tracking.sql`: integración con las funciones reales, secretos incorrectos, primer clic, repetición, reintento, historial y primera respuesta humana. Usa una transacción que termina en `ROLLBACK`; si hay un error, detener la prueba y revertir la transacción.
- Tras publicar y cerrar permisos: comprobar que `anon` no tiene `EXECUTE` en `ulp_assign_advisor()` ni `INSERT` en `ulp_leads`; las RPC nuevas deben rechazar un secreto incorrecto.
