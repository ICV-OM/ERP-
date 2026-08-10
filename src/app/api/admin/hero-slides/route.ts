import { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/session";
import { assertCsrf, safeJsonError } from "@/lib/security";
import { query } from "@/lib/db";
import { audit } from "@/lib/audit";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const metaSchema = z.object({
  titleAr: z.string().trim().max(180).optional().default(""),
  titleEn: z.string().trim().max(180).optional().default(""),
  descriptionAr: z.string().trim().max(600).optional().default(""),
  descriptionEn: z.string().trim().max(600).optional().default(""),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
  isActive: z.enum(["true", "false"]).transform(v => v === "true").default("true"),
  durationSeconds: z.coerce.number().int().min(2).max(30).default(5),
  overlayOpacity: z.coerce.number().min(0).max(0.8).default(0.45),
  startsAt: z.string().trim().max(40).optional().default(""),
  endsAt: z.string().trim().max(40).optional().default("")
});

type HeroAdminRow = {
  id: string;
  title_ar: string | null;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  image_path: string | null;
  has_image_data: boolean;
  sort_order: number;
  is_active: boolean;
  duration_seconds: number;
  overlay_opacity: string | number;
  starts_at: Date | null;
  ends_at: Date | null;
  updated_at: Date;
};

function serialize(row: HeroAdminRow) {
  return {
    id: row.id,
    titleAr: row.title_ar ?? "",
    titleEn: row.title_en ?? "",
    descriptionAr: row.description_ar ?? "",
    descriptionEn: row.description_en ?? "",
    imageUrl: row.has_image_data
      ? `/api/public/hero-slides/${row.id}/image?v=${new Date(row.updated_at).getTime()}`
      : row.image_path,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    durationSeconds: row.duration_seconds,
    overlayOpacity: Number(row.overlay_opacity),
    startsAt: row.starts_at?.toISOString() ?? "",
    endsAt: row.ends_at?.toISOString() ?? ""
  };
}

async function loadSlides(organizationId: string) {
  const result = await query<HeroAdminRow>(`
    SELECT id,title_ar,title_en,description_ar,description_en,image_path,
           (image_data IS NOT NULL) AS has_image_data,sort_order,is_active,
           duration_seconds,overlay_opacity,starts_at,ends_at,updated_at
    FROM hero_slides
    WHERE organization_id=$1
    ORDER BY sort_order,created_at
  `, [organizationId]);
  return result.rows.map(serialize);
}

export async function GET() {
  const auth = await requireApiUser("branding:manage");
  if (!auth.ok) return safeJsonError(auth.message, auth.status);
  try {
    return Response.json({ slides: await loadSlides(auth.user.organizationId) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("admin_hero_slides_get", error);
    return safeJsonError("Unable to load hero slides", 500);
  }
}

export async function POST(request: NextRequest) {
  try { assertCsrf(request); } catch { return safeJsonError("Request rejected", 403); }
  const auth = await requireApiUser("branding:manage");
  if (!auth.ok) return safeJsonError(auth.message, auth.status);

  try {
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File) || file.size === 0) return safeJsonError("Image is required", 422);
    if (file.size > MAX_IMAGE_BYTES) return safeJsonError("Image must be 6 MB or smaller", 413);
    if (!ALLOWED_TYPES.has(file.type)) return safeJsonError("Only JPG, PNG and WebP images are allowed", 415);

    const parsed = metaSchema.safeParse({
      titleAr: form.get("titleAr") ?? "",
      titleEn: form.get("titleEn") ?? "",
      descriptionAr: form.get("descriptionAr") ?? "",
      descriptionEn: form.get("descriptionEn") ?? "",
      sortOrder: form.get("sortOrder") ?? 0,
      isActive: form.get("isActive") ?? "true",
      durationSeconds: form.get("durationSeconds") ?? 5,
      overlayOpacity: form.get("overlayOpacity") ?? 0.45,
      startsAt: form.get("startsAt") ?? "",
      endsAt: form.get("endsAt") ?? ""
    });
    if (!parsed.success) return safeJsonError(parsed.error.issues[0]?.message ?? "Invalid slide", 422);
    const data = parsed.data;
    const bytes = Buffer.from(await file.arrayBuffer());

    const result = await query<{ id: string }>(`
      INSERT INTO hero_slides(
        organization_id,title_ar,title_en,description_ar,description_en,image_data,mime_type,
        sort_order,is_active,duration_seconds,overlay_opacity,starts_at,ends_at,updated_at
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now())
      RETURNING id
    `, [
      auth.user.organizationId,
      data.titleAr || null,
      data.titleEn || null,
      data.descriptionAr || null,
      data.descriptionEn || null,
      bytes,
      file.type,
      data.sortOrder,
      data.isActive,
      data.durationSeconds,
      data.overlayOpacity,
      data.startsAt ? new Date(data.startsAt) : null,
      data.endsAt ? new Date(data.endsAt) : null
    ]);

    await audit({
      organizationId: auth.user.organizationId,
      actorUserId: auth.user.id,
      action: "branding.hero_slide.create",
      entityType: "hero_slide",
      entityId: result.rows[0].id,
      after: { titleAr: data.titleAr, titleEn: data.titleEn, sortOrder: data.sortOrder, isActive: data.isActive },
      requestId: request.headers.get("x-request-id")
    });

    return Response.json({ ok: true, id: result.rows[0].id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("admin_hero_slides_create", error);
    return safeJsonError("Unable to create hero slide", 500);
  }
}
