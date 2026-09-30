/* ============================================================
   UsaLatinoPrime — CRM (Supabase vía RPC, SOLO servidor)
   Contactos, historial de actividad y accesos del equipo.
   Esquema y funciones: supabase/crm.sql
   ============================================================ */
import type { Answers } from "@/lib/types";

export type Stage = "nuevo" | "contactado" | "calificado" | "pagado" | "en_tramite" | "cerrado" | "perdido";

export const STAGES: readonly Stage[] = ["nuevo", "contactado", "calificado", "pagado", "en_tramite", "cerrado", "perdido"];

export const STAGE_LABEL: Record<Stage, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  calificado: "Calificado",
  pagado: "Pagado",
  en_tramite: "En trámite",
  cerrado: "Cerrado",
  perdido: "Perdido",
};

/** Etapas del tablero (las abiertas); cerrado y perdido se ven aparte. */
export const BOARD_STAGES: readonly Stage[] = ["nuevo", "contactado", "calificado", "pagado", "en_tramite"];

export type ContactSource = "embudo" | "manual" | "prime" | "whatsapp";

export interface Contact {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  phone: string | null;
  service_id: string | null;
  stage: Stage;
  advisor_id: string | null;
  source: ContactSource;
  answers: Answers | null;
  result_tone: string | null;
  notes: string | null;
  next_action: string | null;
  next_action_at: string | null;
  first_contact_at: string | null;
  lost_reason: string | null;
  amount: number | null;
  last_activity_at: string;
  created_by: string | null;
}

export type ActivityKind = "nota" | "etapa" | "whatsapp" | "llamada" | "cita" | "seguimiento" | "sistema";

export interface Activity {
  id: string;
  contact_id: string;
  created_at: string;
  author: string | null;
  kind: ActivityKind;
  body: string | null;
  meta: Record<string, unknown> | null;
}

export interface TeamUser {
  id: string;
  name: string;
  role: "owner" | "advisor";
  advisor_id: string | null;
  active: boolean;
  created_at: string;
  last_login_at: string | null;
}

/** Campos que el panel puede cambiar en un contacto. */
export type ContactPatch = Partial<
  Pick<Contact, "name" | "phone" | "service_id" | "stage" | "advisor_id" | "notes" | "next_action" | "next_action_at" | "lost_reason" | "amount">
>;

const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const ADMIN_SECRET = process.env.SUPABASE_ADMIN_SECRET ?? "";

export const crmEnabled = Boolean(SUPABASE_URL && ANON_KEY && ADMIN_SECRET);

async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<{ ok: boolean; data: T | null; error?: string }> {
  if (!crmEnabled) return { ok: false, data: null, error: "not_configured" };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ p_secret: ADMIN_SECRET, ...body }),
    });
    const text = await res.text();
    if (!res.ok) {
      let msg = "upstream";
      try {
        msg = (JSON.parse(text) as { message?: string }).message ?? msg;
      } catch {
        /* texto plano */
      }
      return { ok: false, data: null, error: msg };
    }
    return { ok: true, data: (text ? JSON.parse(text) : null) as T };
  } catch {
    return { ok: false, data: null, error: "network" };
  }
}

// ---------------- Equipo ----------------

export async function teamLogin(user: string, password: string): Promise<Pick<TeamUser, "id" | "name" | "role" | "advisor_id"> | null> {
  const r = await rpc<Pick<TeamUser, "id" | "name" | "role" | "advisor_id">[]>("ulp_team_login", {
    p_user: user.trim().toLowerCase(),
    p_password: password,
  });
  return r.ok && r.data && r.data.length > 0 ? r.data[0]! : null;
}

export async function teamList(): Promise<TeamUser[] | null> {
  const r = await rpc<TeamUser[]>("ulp_team_users_list", {});
  return r.ok ? (r.data ?? []) : null;
}

export async function teamUpsert(u: {
  id: string;
  name: string;
  role: "owner" | "advisor";
  advisorId: string | null;
  password: string | null;
  active: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const r = await rpc<unknown>("ulp_team_user_upsert", {
    p_id: u.id,
    p_name: u.name,
    p_role: u.role,
    p_advisor_id: u.advisorId,
    p_password: u.password,
    p_active: u.active,
  });
  return { ok: r.ok, error: r.error };
}

// ---------------- Contactos ----------------

export async function contactCreate(c: {
  name: string;
  phone: string | null;
  serviceId: string | null;
  stage?: Stage;
  advisorId: string | null;
  source: ContactSource;
  answers?: Answers | null;
  resultTone?: string | null;
  notes?: string | null;
  createdBy: string;
}): Promise<string | null> {
  const r = await rpc<string>("ulp_crm_contact_create", {
    p_name: c.name,
    p_phone: c.phone,
    p_service_id: c.serviceId,
    p_stage: c.stage ?? "nuevo",
    p_advisor_id: c.advisorId,
    p_source: c.source,
    p_answers: c.answers ?? null,
    p_result_tone: c.resultTone ?? null,
    p_notes: c.notes ?? null,
    p_created_by: c.createdBy,
  });
  return r.ok ? r.data : null;
}

export async function contactUpdate(id: string, patch: ContactPatch, author: string): Promise<boolean> {
  return (await rpc<unknown>("ulp_crm_contact_update", { p_id: id, p_patch: patch, p_author: author })).ok;
}

export async function contactsList(opts: { advisorId?: string | null; stage?: Stage | null; q?: string | null; limit?: number } = {}): Promise<Contact[] | null> {
  const r = await rpc<Contact[]>("ulp_crm_contacts_list", {
    p_advisor_id: opts.advisorId ?? null,
    p_stage: opts.stage ?? null,
    p_q: opts.q ?? null,
    p_limit: opts.limit ?? 400,
  });
  return r.ok ? (r.data ?? []) : null;
}

export async function contactGet(id: string): Promise<Contact | null> {
  const r = await rpc<Contact[]>("ulp_crm_contact_get", { p_id: id });
  return r.ok && r.data && r.data.length > 0 ? r.data[0]! : null;
}

export async function activitiesList(contactId: string): Promise<Activity[] | null> {
  const r = await rpc<Activity[]>("ulp_crm_activities_list", { p_contact_id: contactId, p_limit: 200 });
  return r.ok ? (r.data ?? []) : null;
}

export async function activityAdd(a: {
  contactId: string;
  author: string;
  kind: ActivityKind;
  body: string | null;
  meta?: Record<string, unknown> | null;
}): Promise<boolean> {
  return (
    await rpc<unknown>("ulp_crm_activity_add", {
      p_contact_id: a.contactId,
      p_author: a.author,
      p_kind: a.kind,
      p_body: a.body,
      p_meta: a.meta ?? null,
    })
  ).ok;
}

export async function leadLink(leadId: string, contactId: string): Promise<boolean> {
  return (await rpc<unknown>("ulp_crm_lead_link", { p_lead_id: leadId, p_contact_id: contactId })).ok;
}

/** Valida un id de contacto (uuid). */
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export function isStage(v: unknown): v is Stage {
  return typeof v === "string" && (STAGES as readonly string[]).includes(v);
}
