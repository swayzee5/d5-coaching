import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type LibEx = { id: string; name: string; vimeo_video_id: string };

const EXCLUDE_FILTER = `
  AND LOWER(name) NOT LIKE '%(seance)%'
  AND LOWER(name) NOT LIKE '%(séance)%'
  AND LOWER(name) NOT LIKE '%(programme)%'
`;

async function getExercisesByMuscle(keywords: string[], limit = 8): Promise<LibEx[]> {
  const conditions = keywords
    .map((k) => `EXISTS(SELECT 1 FROM unnest(muscles) m WHERE LOWER(m) ILIKE LOWER('%${k.replace(/'/g, "''")}%'))`)
    .join(" OR ");

  return db.$queryRawUnsafe<LibEx[]>(
    `SELECT id::text, name, vimeo_video_id
     FROM exercise_library
     WHERE vimeo_video_id IS NOT NULL AND is_active = true
       ${EXCLUDE_FILTER}
       AND (${conditions})
     ORDER BY name
     LIMIT ${limit}`
  ).catch(() => [] as LibEx[]);
}

async function getExercisesByName(keywords: string[], limit = 8): Promise<LibEx[]> {
  const conditions = keywords
    .map((k) => `LOWER(name) ILIKE LOWER('%${k.replace(/'/g, "''")}%')`)
    .join(" OR ");

  return db.$queryRawUnsafe<LibEx[]>(
    `SELECT id::text, name, vimeo_video_id
     FROM exercise_library
     WHERE vimeo_video_id IS NOT NULL AND is_active = true
       ${EXCLUDE_FILTER}
       AND (${conditions})
     ORDER BY name
     LIMIT ${limit}`
  ).catch(() => [] as LibEx[]);
}

async function getExercisesByMuscleOrName(muscleKws: string[], nameKws: string[], limit = 8): Promise<LibEx[]> {
  const muscleConds = muscleKws
    .map((k) => `EXISTS(SELECT 1 FROM unnest(muscles) m WHERE LOWER(m) ILIKE LOWER('%${k.replace(/'/g, "''")}%'))`)
    .join(" OR ");
  const nameConds = nameKws
    .map((k) => `LOWER(name) ILIKE LOWER('%${k.replace(/'/g, "''")}%')`)
    .join(" OR ");

  return db.$queryRawUnsafe<LibEx[]>(
    `SELECT id::text, name, vimeo_video_id
     FROM exercise_library
     WHERE vimeo_video_id IS NOT NULL AND is_active = true
       ${EXCLUDE_FILTER}
       AND (${muscleConds} OR ${nameConds})
     ORDER BY name
     LIMIT ${limit}`
  ).catch(() => [] as LibEx[]);
}

const TEMPLATE_DEFS: {
  name: string;
  category: string;
  durationMinutes: number;
  muscles?: string[];
  nameKws?: string[];
  sets: number;
  reps: string;
  rest: number;
  limit?: number;
}[] = [
  // ── JAMBES ──────────────────────────────────────────────────────────────────
  {
    name: "Séance Jambes",
    category: "Jambes",
    durationMinutes: 65,
    muscles: ["quadriceps", "quads", "ischio", "femoral", "fessiers", "glutes", "mollets", "jambes", "legs"],
    sets: 4, reps: "12", rest: 90,
    limit: 8,
  },
  {
    name: "Séance Jambes B",
    category: "Jambes",
    durationMinutes: 60,
    muscles: ["ischio", "femoral", "fessiers", "glutes", "gluteus", "mollets", "abducteurs", "adducteurs"],
    sets: 4, reps: "15", rest: 90,
    limit: 8,
  },
  // ── HAUT DU CORPS ────────────────────────────────────────────────────────────
  {
    name: "Séance Haut du corps",
    category: "Haut du corps",
    durationMinutes: 65,
    muscles: ["pectoral", "pecs", "dos", "dorsal", "épaule", "epaule", "biceps", "triceps"],
    sets: 3, reps: "12", rest: 90,
    limit: 8,
  },
  {
    name: "Séance Haut du corps B",
    category: "Haut du corps",
    durationMinutes: 60,
    muscles: ["pectoral", "pecs", "dos", "dorsal", "épaule", "epaule", "biceps", "triceps", "bras"],
    sets: 4, reps: "10", rest: 90,
    limit: 8,
  },
  // ── PECS ────────────────────────────────────────────────────────────────────
  {
    name: "Séance Pecs",
    category: "Pecs",
    durationMinutes: 60,
    muscles: ["pectoral", "pecs", "poitrine", "chest"],
    sets: 4, reps: "10", rest: 90,
    limit: 8,
  },
  {
    name: "Séance Pecs B",
    category: "Pecs",
    durationMinutes: 55,
    muscles: ["pectoral", "pecs", "poitrine", "chest"],
    sets: 3, reps: "12", rest: 90,
    limit: 6,
  },
  // ── PECS / DOS ───────────────────────────────────────────────────────────────
  {
    name: "Séance Pecs / Dos",
    category: "Pecs / Dos",
    durationMinutes: 70,
    muscles: ["pectoral", "pecs", "poitrine", "chest", "dos", "dorsal", "grand dorsal", "latissimus"],
    sets: 4, reps: "10", rest: 90,
    limit: 8,
  },
  {
    name: "Séance Pecs / Dos B",
    category: "Pecs / Dos",
    durationMinutes: 65,
    muscles: ["pectoral", "pecs", "dos", "dorsal", "trapèze", "trapeze", "rhomboïde"],
    sets: 3, reps: "12", rest: 90,
    limit: 8,
  },
  // ── ÉPAULES ──────────────────────────────────────────────────────────────────
  {
    name: "Séance Épaules",
    category: "Épaules",
    durationMinutes: 55,
    muscles: ["épaule", "epaule", "deltoïde", "deltoide", "delta", "shoulder"],
    sets: 4, reps: "12", rest: 90,
    limit: 8,
  },
  {
    name: "Séance Épaules B",
    category: "Épaules",
    durationMinutes: 50,
    muscles: ["épaule", "epaule", "deltoïde", "deltoide", "delta", "trapèze", "trapeze"],
    sets: 3, reps: "15", rest: 90,
    limit: 7,
  },
  // ── CARDIO ──────────────────────────────────────────────────────────────────
  {
    name: "Séance Cardio",
    category: "Cardio",
    durationMinutes: 40,
    muscles: ["cardio"],
    nameKws: ["marche", "course", "skierg", "escaliers", "vélo", "rameur", "corde", "cardio", "hiit"],
    sets: 3, reps: "10", rest: 60,
    limit: 6,
  },
];

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const reset = req.nextUrl.searchParams.get("reset") === "1";

  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS seance_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      category TEXT DEFAULT 'Général',
      duration_minutes INT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS seance_template_exercises (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      seance_template_id UUID NOT NULL REFERENCES seance_templates(id) ON DELETE CASCADE,
      exercise_name TEXT NOT NULL,
      sets INT DEFAULT 3,
      reps TEXT DEFAULT '10',
      rest_seconds INT DEFAULT 90,
      order_index INT DEFAULT 0,
      notes TEXT
    )
  `;

  if (reset) {
    await db.$executeRaw`TRUNCATE seance_templates CASCADE`;
  }

  const totalVideos = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) as count FROM exercise_library
     WHERE vimeo_video_id IS NOT NULL AND is_active = true
       ${EXCLUDE_FILTER}`
  ).catch(() => [{ count: BigInt(0) }]);

  const videoCount = Number(totalVideos[0]?.count ?? 0);

  let inserted = 0;
  let skipped = 0;
  const details: { name: string; exercises: number; status: string }[] = [];

  for (const def of TEMPLATE_DEFS) {
    if (!reset) {
      const exists = await db.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM seance_templates WHERE name = ${def.name}
      `.catch(() => [{ count: BigInt(0) }]);
      if (Number(exists[0]?.count) > 0) {
        skipped++;
        details.push({ name: def.name, exercises: 0, status: "exists" });
        continue;
      }
    }

    const limit = def.limit ?? 8;
    let exercises: LibEx[];

    if (def.nameKws && def.muscles) {
      exercises = await getExercisesByMuscleOrName(def.muscles, def.nameKws, limit);
    } else if (def.nameKws) {
      exercises = await getExercisesByName(def.nameKws, limit);
    } else {
      exercises = await getExercisesByMuscle(def.muscles!, limit);
    }

    if (exercises.length < 2) {
      skipped++;
      details.push({ name: def.name, exercises: exercises.length, status: "not enough" });
      continue;
    }

    const rows = await db.$queryRaw<{ id: string }[]>`
      INSERT INTO seance_templates (name, category, duration_minutes)
      VALUES (${def.name}, ${def.category}, ${def.durationMinutes})
      RETURNING id::text
    `;
    const seanceId = rows[0].id;

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      await db.$executeRaw`
        INSERT INTO seance_template_exercises (seance_template_id, exercise_name, sets, reps, rest_seconds, order_index)
        VALUES (${seanceId}::uuid, ${ex.name}, ${def.sets}, ${def.reps}, ${def.rest}, ${i})
      `;
    }

    inserted++;
    details.push({ name: def.name, exercises: exercises.length, status: "created" });
  }

  return NextResponse.json({
    message: reset ? "Templates réinitialisés" : "Séances seedées",
    exercisesWithVideos: videoCount,
    inserted,
    skipped,
    details,
  });
}
