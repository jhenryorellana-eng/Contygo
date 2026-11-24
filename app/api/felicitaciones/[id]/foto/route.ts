/* GET /api/felicitaciones/:id/foto — la foto de una felicitación que la landing enseña: solo si el dueño la aprobó y su
   autor dio permiso (lib/reviews.ts → publicReviewPhoto). Cualquier otra, 404. Cinco minutos en el CDN: si el dueño la
   retira, deja de verse en ese plazo. */
import { NextResponse } from "next/server";
import { publicReviewPhoto } from "@/lib/reviews";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const photo = await publicReviewPhoto(params.id);
  if (!photo) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return new NextResponse(Buffer.from(photo), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=300, s-maxage=300", "X-Content-Type-Options": "nosniff" } });
}
