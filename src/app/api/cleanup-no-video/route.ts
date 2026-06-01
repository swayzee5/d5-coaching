import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Count before
  const before = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) as count FROM exercises
     WHERE vimeo_video_id IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM exercise_library el
         WHERE LOWER(TRIM(el.name)) = LOWER(TRIM(exercises.name))
           AND el.vimeo_video_id IS NOT NULL
           AND el.is_active = true
       )`
  ).catch(() => [{ count: BigInt(0) }]);

  // Delete exercises that have no video — neither stored nor in library
  const deleted = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `WITH removed AS (
       DELETE FROM exercises
       WHERE vimeo_video_id IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM exercise_library el
           WHERE LOWER(TRIM(el.name)) = LOWER(TRIM(exercises.name))
             AND el.vimeo_video_id IS NOT NULL
             AND el.is_active = true
         )
       RETURNING id
     )
     SELECT COUNT(*) as count FROM removed`
  ).catch(() => [{ count: BigInt(0) }]);

  // Also delete from reboot_exercises without video
  const deletedReboot = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `WITH removed AS (
       DELETE FROM reboot_exercises
       WHERE vimeo_video_id IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM exercise_library el
           WHERE LOWER(TRIM(el.name)) = LOWER(TRIM(reboot_exercises.name))
             AND el.vimeo_video_id IS NOT NULL
             AND el.is_active = true
         )
       RETURNING id
     )
     SELECT COUNT(*) as count FROM removed`
  ).catch(() => [{ count: BigInt(0) }]);

  // Re-index order_index on affected sessions to avoid gaps
  await db.$executeRawUnsafe(
    `WITH ranked AS (
       SELECT id, session_id,
              ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY order_index) - 1 AS new_index
       FROM exercises
     )
     UPDATE exercises e
     SET order_index = r.new_index
     FROM ranked r
     WHERE e.id = r.id`
  ).catch(() => null);

  return NextResponse.json({
    message: "Nettoyage terminé",
    exercicesSupprimés: Number(deleted[0]?.count ?? 0),
    rebootSupprimés: Number(deletedReboot[0]?.count ?? 0),
    totalAvant: Number(before[0]?.count ?? 0),
  });
}
