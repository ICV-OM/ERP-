import { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/session";
import { assertCsrf, safeJsonError } from "@/lib/security";
import { query } from "@/lib/db";
import { audit } from "@/lib/audit";

const patchSchema = z.object({
  titleAr: z.string().trim().max(180).optional(),
  titleEn: z.string().trim().max(180).optional(),
  descriptionAr: z.string().trim().max(600).optional(),
  descriptionEn: z.string().trim().max(600).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
  durationSeconds: z.number().int().min(2).max(30).optional(),
  overlayOpacity: z.number().min(0).max(0.8).optional(),
  startsAt: z.string().max(40).nullable().optional(),
  endsAt: z.string().max(40).nullable().optional()
});

function cleanDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return date;
}

async function ownsSlide(id: string, organizationId: string) {
  const result = await query<{ id: string }>("SELECT id FROM hero_slides WHERE id=$1 AND organization_id=$2", [id, organizationId]);
  return Boolean(result.rowCount);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { assertCsrf(request); } catch { return safeJsonError("Request rejected", 403); }
  const auth = await requireApiUser("branding:manage");
  if (!auth.ok) return safeJsonError(auth.message, auth.status);

  try {
    const { id } = await context.params;
    if (!(await ownsSlide(id, auth.user.organizationId))) return safeJsonError("Slide not found", 404);
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return safeJsonError(parsed.error.issues[0]?.message ?? "Invalid slide", 422);
    const d = parsed.data;

    await query(`
      UPDATE hero_slides SET
        title_ar=COALESCE($3,title_ar),
        title_en=COALESCE($4,title_en),
        description_ar=COALESCE($5,description_ar),
        description_en=COALESCE($6,description_en),
        sort_order=COALESCE($7,sort_order),
        is_active=COALESCE($8,is_active),
        duration_seconds=COALESCE($9,duration_seconds),
        overlay_opacity=COALESCE($10,overlay_opacity),
        starts_at=CASE WHEN $11::boolean THEN $12::timestamptz ELSE starts_at END,
        ends_at=CASE WHEN $13::boolean THEN $14::timestamptz ELSE ends_at END,
        updated_at=now()
      WHERE id=$1 AND organization_id=$2
    `, [
      id, auth.user.organizationId,
      d.titleAr === undefined ? null : d.titleAr || null,
      d.titleEn === undefined ? null : d.titleEn || null,
      d.descriptionAr === undefined ? null : d.descriptionAr || null,
      d.descriptionEn === undefined ? null : d.descriptionEn || null,
      d.sortOrder ?? null,
      d.isActive ?? null,
      d.durationSeconds ?? null,
      d.overlayOpacity ?? null,
      d.startsAt !== undefined,
      d.startsAt !== undefined ? cleanDate(d.startsAt) : null,
      d.endsAt !== undefined,
      d.endsAt !== undefined ? cleanDate(d.endsAt) : null
    ]);

    await audit({
      organizationId: auth.user.organizationId,
      actorUserId: auth.user.id,
      action: "branding.hero_slide.update",
      entityType: "hero_slide",
      entityId: id,
      after: d,
      requestId: request.headers.get("x-request-id")
    });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("admin_hero_slide_patch", error);
    return safeJsonError("Unable to update hero slide", 500);
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { assertCsrf(request); } catch { return safeJsonError("Request rejected", 403); }
  const auth = await requireApiUser("branding:manage");
  if (!auth.ok) return safeJsonError(auth.message, auth.status);

  try {
    const { id } = await context.params;
    if (!(await ownsSlide(id, auth.user.organizationId))) return safeJsonError("Slide not found", 404);
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File) || file.size === 0) return safeJsonError("Image is required", 422);
    if (file.size > 6 * 1024 * 1024) return safeJsonError("Image must be 6 MB or smaller", 413);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return safeJsonError("Only JPG, PNG and WebP images are allowed", 415);
    const bytes = Buffer.from(await file.arrayBuffer());

    await query(`UPDATE hero_slides SET image_data=$3,mime_type=$4,image_path=NULL,updated_at=now() WHERE id=$1 AND organization_id=$2`, [id, auth.user.organizationId, bytes, file.type]);
    await audit({
      organizationId: auth.user.organizationId,
      actorUserId: auth.user.id,
      action: "branding.hero_slide.image_replace",
      entityType: "hero_slide",
      entityId: id,
      after: { mimeType: file.type, size: file.size },
      requestId: request.headers.get("x-request-id")
    });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("admin_hero_slide_image", error);
    return safeJsonError("Unable to replace hero image", 500);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { assertCsrf(request); } catch { return safeJsonError("Request rejected", 403); }
  const auth = await requireApiUser("branding:manage");
  if (!auth.ok) return safeJsonError(auth.message, auth.status);

  try {
    const { id } = await context.params;
    const result = await query("DELETE FROM hero_slides WHERE id=$1 AND organization_id=$2", [id, auth.user.organizationId]);
    if (!result.rowCount) return safeJsonError("Slide not found", 404);
    await audit({
      organizationId: auth.user.organizationId,
      actorUserId: auth.user.id,
      action: "branding.hero_slide.delete",
      entityType: "hero_slide",
      entityId: id,
      requestId: request.headers.get("x-request-id")
    });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("admin_hero_slide_delete", error);
    return safeJsonError("Unable to delete hero slide", 500);
  }
}
