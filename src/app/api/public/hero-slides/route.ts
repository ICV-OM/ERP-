import { query } from "@/lib/db";

type HeroRow = {
  id: string;
  title_ar: string | null;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  image_path: string | null;
  has_image_data: boolean;
  duration_seconds: number;
  overlay_opacity: string | number;
  updated_at: Date;
};

export async function GET() {
  try {
    const result = await query<HeroRow>(`
      SELECT id,title_ar,title_en,description_ar,description_en,image_path,
             (image_data IS NOT NULL) AS has_image_data,
             duration_seconds,overlay_opacity,updated_at
      FROM hero_slides
      WHERE organization_id=(SELECT id FROM organizations LIMIT 1)
        AND is_active=TRUE
        AND (starts_at IS NULL OR starts_at<=now())
        AND (ends_at IS NULL OR ends_at>=now())
      ORDER BY sort_order,created_at
    `);

    return Response.json({
      slides: result.rows.map(row => ({
        id: row.id,
        titleAr: row.title_ar,
        titleEn: row.title_en,
        descriptionAr: row.description_ar,
        descriptionEn: row.description_en,
        imageUrl: row.has_image_data
          ? `/api/public/hero-slides/${row.id}/image?v=${new Date(row.updated_at).getTime()}`
          : row.image_path,
        durationSeconds: row.duration_seconds,
        overlayOpacity: Number(row.overlay_opacity)
      }))
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("public_hero_slides", error);
    return Response.json({ slides: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
