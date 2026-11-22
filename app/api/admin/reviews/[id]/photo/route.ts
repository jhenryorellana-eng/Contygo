/* ============================================================
   GET /api/admin/reviews/:id/photo — la foto de una felicitación.
   Solo con la sesión del dueño: la foto no tiene dirección pública.
   ============================================================ */
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { adminReviewPhoto } from "@/lib/reviews";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const photo = await adminReviewPhoto(params.id);
  if (!photo) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return new NextResponse(Buffer.from(photo), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
