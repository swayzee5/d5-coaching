import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Count exercises without video before
  const before = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) as count FROM exercises WHERE vimeo_video_id IS NULL`
  ).catch(() => [{ count: BigInt(0) }]);

  // Pass 1 — match by library_exercise_id (direct FK link)
  const byId = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `WITH updated AS (
       UPDATE exercises e
       SET vimeo_video_id = el.vimeo_video_id
       FROM exercise_library el
       WHERE e.vimeo_video_id IS NULL
         AND el.vimeo_video_id IS NOT NULL
         AND e.library_exercise_id = el.id
       RETURNING e.id
     )
     SELECT COUNT(*) as count FROM updated`
  ).catch(() => [{ count: BigInt(0) }]);

  // Pass 2 — match by name (case-insensitive) for exercises without a library link
  const byName = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `WITH updated AS (
       UPDATE exercises e
       SET vimeo_video_id = el.vimeo_video_id
       FROM exercise_library el
       WHERE e.vimeo_video_id IS NULL
         AND el.vimeo_video_id IS NOT NULL
         AND LOWER(TRIM(e.name)) = LOWER(TRIM(el.name))
       RETURNING e.id
     )
     SELECT COUNT(*) as count FROM updated`
  ).catch(() => [{ count: BigInt(0) }]);

  // Also backfill library_exercise_id where missing (bonus)
  await db.$queryRawUnsafe(
    `UPDATE exercises e
     SET library_exercise_id = el.id
     FROM exercise_library el
     WHERE e.library_exercise_id IS NULL
       AND LOWER(TRIM(e.name)) = LOWER(TRIM(el.name))`
  ).catch(() => null);

  // Count remaining without video
  const after = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) as count FROM exercises WHERE vimeo_video_id IS NULL`
  ).catch(() => [{ count: BigInt(0) }]);

  const totalUpdated = Number(byId[0]?.count ?? 0) + Number(byName[0]?.count ?? 0);

  return NextResponse.json({
    message: "Backfill terminé",
    avant: Number(before[0]?.count ?? 0),
    misAJourParId: Number(byId[0]?.count ?? 0),
    misAJourParNom: Number(byName[0]?.count ?? 0),
    totalMisAJour: totalUpdated,
    restantSansVideo: Number(after[0]?.count ?? 0),
  });
}
