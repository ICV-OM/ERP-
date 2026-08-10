import { query } from "@/lib/db";

type ImageRow = { image_data: Buffer | null; mime_type: string | null };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = await query<ImageRow>(`
      SELECT image_data,mime_type
      FROM hero_slides
      WHERE id=$1
        AND is_active=TRUE
        AND (starts_at IS NULL OR starts_at<=now())
        AND (ends_at IS NULL OR ends_at>=now())
      LIMIT 1
    `, [id]);
    const row = result.rows[0];
    if (!row?.image_data || !row.mime_type) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(row.image_data), {
      headers: {
        "Content-Type": row.mime_type,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    console.error("public_hero_image", error);
    return new Response("Unable to load image", { status: 500 });
  }
}
