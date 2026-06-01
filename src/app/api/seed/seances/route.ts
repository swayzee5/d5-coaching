import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type LibEx = { id: string; name: string; vimeo_video_id: string };

async function getExercisesByMuscle(keywords: string[], limit = 8): Promise<LibEx[]> {
  const conditions = keywords
    .map((k) => `EXISTS(SELECT 1 FROM unnest(muscles) m WHERE LOWER(m) ILIKE LOWER('%${k.replace(/'/g, "''")}%'))`)
    .join(" OR ");

  return db.$queryRawUnsafe<LibEx[]>(
    `SELECT id::text, name, vimeo_video_id
     FROM exercise_library
     WHERE vimeo_video_id IS NOT NULL AND is_active = true
       AND (${conditions})
     ORDER BY name
     LIMIT ${limit}`
  ).catch(() => [] as LibEx[]);
}

const TEMPLATE_DEFS = [
  {
    name: "Séance Pectoraux",
    category: "Pectoraux",
    durationMinutes: 60,
    muscles: ["pectoral", "pecs", "poitrine", "chest"],
    sets: 4, reps: "10", rest: 90,
  },
  {
    name: "Séance Pectoraux — Variante",
    category: "Pectoraux",
    durationMinutes: 60,
    muscles: ["pectoral", "pecs", "poitrine", "chest"],
    sets: 3, reps: "12", rest: 90,
    limit: 6,
  },
  {
    name: "Séance Dos",
    category: "Dos",
    durationMinutes: 65,
    muscles: ["dos", "dorsal", "grand dorsal", "latissimus", "trapèze", "trapeze", "rhomboïde", "rhomboide"],
    sets: 4, reps: "10", rest: 90,
  },
  {
    name: "Séance Dos — Haut du dos",
    category: "Dos",
    durationMinutes: 60,
    muscles: ["dos", "trapèze", "trapeze", "rhomboïde", "rhomboide", "postérieur", "posterieur"],
    sets: 4, reps: "12", rest: 90,
    limit: 6,
  },
  {
    name: "Séance Épaules",
    category: "Épaules",
    durationMinutes: 55,
    muscles: ["épaule", "epaule", "deltoïde", "deltoide", "delta", "shoulder"],
    sets: 4, reps: "12", rest: 90,
  },
  {
    name: "Séance Biceps",
    category: "Bras",
    durationMinutes: 40,
    muscles: ["biceps"],
    sets: 4, reps: "12", rest: 90,
  },
  {
    name: "Séance Triceps",
    category: "Bras",
    durationMinutes: 40,
    muscles: ["triceps"],
    sets: 4, reps: "12", rest: 90,
  },
  {
    name: "Séance Bras",
    category: "Bras",
    durationMinutes: 50,
    muscles: ["biceps", "triceps", "bras", "avant-bras"],
    sets: 3, reps: "12", rest: 90,
  },
  {
    name: "Séance Jambes — Quadriceps",
    category: "Jambes",
    durationMinutes: 65,
    muscles: ["quadriceps", "quads", "jambes", "legs"],
    sets: 4, reps: "12", rest: 90,
  },
  {
    name: "Séance Jambes — Ischios & Fessiers",
    category: "Jambes",
    durationMinutes: 60,
    muscles: ["ischio", "femoral", "fessiers", "glutes", "gluteus", "hanches"],
    sets: 4, reps: "12", rest: 90,
  },
  {
    name: "Séance Fessiers Femme A",
    category: "Fessiers",
    durationMinutes: 55,
    muscles: ["fessiers", "glutes", "gluteus", "hanches"],
    sets: 4, reps: "12", rest: 90,
  },
  {
    name: "Séance Fessiers Femme B",
    category: "Fessiers",
    durationMinutes: 55,
    muscles: ["fessiers", "glutes", "gluteus", "abducteurs", "adducteurs"],
    sets: 3, reps: "15", rest: 90,
    limit: 6,
  },
  {
    name: "Séance Mollets & Mollets",
    category: "Jambes",
    durationMinutes: 30,
    muscles: ["mollets", "gastrocné", "soléaire", "calves"],
    sets: 5, reps: "20", rest: 60,
    limit: 5,
  },
  {
    name: "Séance Gainage & Abdominaux",
    category: "Gainage",
    durationMinutes: 40,
    muscles: ["abdominaux", "abdos", "abs", "core", "gainage", "obliques"],
    sets: 3, reps: "15", rest: 60,
  },
  {
    name: "Séance Abdominaux",
    category: "Abdominaux",
    durationMinutes: 35,
    muscles: ["abdominaux", "abdos", "abs", "obliques"],
    sets: 3, reps: "20", rest: 60,
    limit: 7,
  },
  {
    name: "Séance Cardio & Mobilité",
    category: "Cardio",
    durationMinutes: 45,
    muscles: ["cardio", "mobilité", "mobilite", "souplesse", "full body", "corps entier"],
    sets: 3, reps: "10", rest: 60,
  },
];

const PUSH_MUSCLES = ["pectoral", "pecs", "poitrine", "épaule", "epaule", "deltoïde", "deltoide", "triceps"];
const PULL_MUSCLES = ["dos", "dorsal", "grand dorsal", "latissimus", "biceps", "trapèze", "trapeze", "rhomboïde"];
const LEGS_MUSCLES = ["quadriceps", "quads", "ischio", "femoral", "fessiers", "glutes", "mollets", "jambes"];
const FULLBODY_MUSCLES = [...new Set([...PUSH_MUSCLES, ...PULL_MUSCLES, ...LEGS_MUSCLES])];

const COMPOUND_TEMPLATES = [
  {
    name: "Séance Push (Pecs + Épaules + Triceps)",
    category: "Push / Pull / Legs",
    durationMinutes: 65,
    muscles: PUSH_MUSCLES,
    sets: 4, reps: "10", rest: 90,
    limit: 8,
  },
  {
    name: "Séance Pull (Dos + Biceps)",
    category: "Push / Pull / Legs",
    durationMinutes: 60,
    muscles: PULL_MUSCLES,
    sets: 4, reps: "10", rest: 90,
    limit: 7,
  },
  {
    name: "Séance Legs Day",
    category: "Push / Pull / Legs",
    durationMinutes: 70,
    muscles: LEGS_MUSCLES,
    sets: 4, reps: "12", rest: 90,
    limit: 8,
  },
  {
    name: "Full Body Express",
    category: "Full Body",
    durationMinutes: 50,
    muscles: FULLBODY_MUSCLES,
    sets: 3, reps: "12", rest: 90,
    limit: 8,
  },
  {
    name: "Full Body Force",
    category: "Full Body",
    durationMinutes: 60,
    muscles: FULLBODY_MUSCLES,
    sets: 4, reps: "8", rest: 90,
    limit: 6,
  },
];

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const reset = req.nextUrl.searchParams.get("reset") === "1";

  // Ensure tables exist
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

  // Check how many exercises with videos we have
  const totalVideos = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM exercise_library WHERE vimeo_video_id IS NOT NULL AND is_active = true
  `.catch(() => [{ count: BigInt(0) }]);

  const videoCount = Number(totalVideos[0]?.count ?? 0);

  let inserted = 0;
  let skipped = 0;

  const allDefs = [...TEMPLATE_DEFS, ...COMPOUND_TEMPLATES];

  for (const def of allDefs) {
    // Skip if already exists (unless reset)
    if (!reset) {
      const exists = await db.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM seance_templates WHERE name = ${def.name}
      `.catch(() => [{ count: BigInt(0) }]);
      if (Number(exists[0]?.count) > 0) { skipped++; continue; }
    }

    const limit = (def as { limit?: number }).limit ?? 8;
    const exercises = await getExercisesByMuscle(def.muscles, limit);

    if (exercises.length < 3) {
      // Not enough exercises with videos — skip
      skipped++;
      continue;
    }

    // Insert template
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
  }

  return NextResponse.json({
    message: reset ? "Templates réinitialisés et recréés" : "Séances seedées",
    exercisesWithVideos: videoCount,
    inserted,
    skipped,
    total: allDefs.length,
  });
}
