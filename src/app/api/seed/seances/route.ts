import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type LibEx = { id: string; name: string; vimeo_video_id: string };

const EXCLUDE = `
  AND LOWER(name) NOT LIKE '%(seance)%'
  AND LOWER(name) NOT LIKE '%(séance)%'
  AND LOWER(name) NOT LIKE '%(programme)%'
`;

const HOME_KWS = ["maison", "poids de corps", "poids du corps", "élastique", "elastique", "sans matériel", "sans materiel", "bodyweight"];
const GYM_KWS = ["salle", "machine", "câble", "cable", "haltere", "haltère", "barre", "poulie", "smith", "banc"];

async function byMuscle(muscles: string[], limit: number, locationKws?: string[]): Promise<LibEx[]> {
  const muscleCond = muscles
    .map((k) => `EXISTS(SELECT 1 FROM unnest(muscles) m WHERE LOWER(m) ILIKE '%${k.replace(/'/g, "''")}%')`)
    .join(" OR ");
  const locCond = locationKws && locationKws.length > 0
    ? `AND (${locationKws.map((k) => `LOWER(name) ILIKE '%${k.replace(/'/g, "''")}%'`).join(" OR ")})`
    : "";

  return db.$queryRawUnsafe<LibEx[]>(
    `SELECT id::text, name, vimeo_video_id
     FROM exercise_library
     WHERE vimeo_video_id IS NOT NULL AND is_active = true
       ${EXCLUDE}
       ${locCond}
       AND (${muscleCond})
     ORDER BY name LIMIT ${limit}`
  ).catch(() => []);
}

async function byMuscleOrName(muscles: string[], nameKws: string[], limit: number): Promise<LibEx[]> {
  const muscleCond = muscles
    .map((k) => `EXISTS(SELECT 1 FROM unnest(muscles) m WHERE LOWER(m) ILIKE '%${k.replace(/'/g, "''")}%')`)
    .join(" OR ");
  const nameCond = nameKws
    .map((k) => `LOWER(name) ILIKE '%${k.replace(/'/g, "''")}%'`)
    .join(" OR ");

  return db.$queryRawUnsafe<LibEx[]>(
    `SELECT id::text, name, vimeo_video_id
     FROM exercise_library
     WHERE vimeo_video_id IS NOT NULL AND is_active = true
       ${EXCLUDE}
       AND (${muscleCond} OR ${nameCond})
     ORDER BY name LIMIT ${limit}`
  ).catch(() => []);
}

type TemplateDef = {
  name: string;
  category: string;
  durationMinutes: number;
  muscles?: string[];
  nameKws?: string[];
  locationKws?: string[];
  sets: number;
  reps: string;
  rest: number;
  limit?: number;
};

const JAMBES_MUSCLES = ["quadriceps", "quads", "ischio", "femoral", "fessiers", "glutes", "mollets", "jambes", "legs"];
const HAUT_MUSCLES = ["pectoral", "pecs", "dos", "dorsal", "épaule", "epaule", "biceps", "triceps"];
const PECS_MUSCLES = ["pectoral", "pecs", "poitrine", "chest"];
const PECS_DOS_MUSCLES = ["pectoral", "pecs", "poitrine", "chest", "dos", "dorsal", "grand dorsal", "latissimus", "trapèze", "rhomboïde"];
const EPAULES_MUSCLES = ["épaule", "epaule", "deltoïde", "deltoide", "delta", "shoulder", "trapèze", "trapeze"];
const CARDIO_MUSCLES = ["cardio"];
const CARDIO_NAME_KWS = ["marche", "course", "skierg", "escaliers", "vélo", "rameur", "corde", "hiit", "cardio"];

const TEMPLATES: TemplateDef[] = [
  // ─── JAMBES ───────────────────────────────────────────────────────────────
  { name: "Jambes — Salle",      category: "Jambes", durationMinutes: 65, muscles: JAMBES_MUSCLES, locationKws: GYM_KWS,  sets: 4, reps: "12", rest: 90, limit: 8 },
  { name: "Jambes — Maison",     category: "Jambes", durationMinutes: 55, muscles: JAMBES_MUSCLES, locationKws: HOME_KWS, sets: 4, reps: "15", rest: 60, limit: 8 },
  { name: "Jambes Salle B",      category: "Jambes", durationMinutes: 60, muscles: ["ischio", "femoral", "fessiers", "glutes", "mollets"], locationKws: GYM_KWS,  sets: 4, reps: "12", rest: 90, limit: 8 },
  { name: "Jambes Maison B",     category: "Jambes", durationMinutes: 50, muscles: ["ischio", "femoral", "fessiers", "glutes", "abducteurs"], locationKws: HOME_KWS, sets: 3, reps: "15", rest: 60, limit: 8 },

  // ─── HAUT DU CORPS ────────────────────────────────────────────────────────
  { name: "Haut du corps — Salle",  category: "Haut du corps", durationMinutes: 65, muscles: HAUT_MUSCLES, locationKws: GYM_KWS,  sets: 3, reps: "12", rest: 90, limit: 8 },
  { name: "Haut du corps — Maison", category: "Haut du corps", durationMinutes: 55, muscles: HAUT_MUSCLES, locationKws: HOME_KWS, sets: 3, reps: "15", rest: 60, limit: 8 },
  { name: "Haut du corps Salle B",  category: "Haut du corps", durationMinutes: 60, muscles: HAUT_MUSCLES, locationKws: GYM_KWS,  sets: 4, reps: "10", rest: 90, limit: 8 },
  { name: "Haut du corps Maison B", category: "Haut du corps", durationMinutes: 50, muscles: HAUT_MUSCLES, locationKws: HOME_KWS, sets: 4, reps: "12", rest: 60, limit: 8 },

  // ─── PECS ─────────────────────────────────────────────────────────────────
  { name: "Pecs — Salle",  category: "Pecs", durationMinutes: 60, muscles: PECS_MUSCLES, locationKws: GYM_KWS,  sets: 4, reps: "10", rest: 90, limit: 8 },
  { name: "Pecs — Maison", category: "Pecs", durationMinutes: 50, muscles: PECS_MUSCLES, locationKws: HOME_KWS, sets: 4, reps: "12", rest: 60, limit: 8 },
  { name: "Pecs Salle B",  category: "Pecs", durationMinutes: 55, muscles: PECS_MUSCLES, locationKws: GYM_KWS,  sets: 3, reps: "12", rest: 90, limit: 6 },
  { name: "Pecs Maison B", category: "Pecs", durationMinutes: 45, muscles: PECS_MUSCLES, locationKws: HOME_KWS, sets: 3, reps: "15", rest: 60, limit: 6 },

  // ─── PECS / DOS ───────────────────────────────────────────────────────────
  { name: "Pecs / Dos — Salle",  category: "Pecs / Dos", durationMinutes: 70, muscles: PECS_DOS_MUSCLES, locationKws: GYM_KWS,  sets: 4, reps: "10", rest: 90, limit: 8 },
  { name: "Pecs / Dos — Maison", category: "Pecs / Dos", durationMinutes: 60, muscles: PECS_DOS_MUSCLES, locationKws: HOME_KWS, sets: 3, reps: "12", rest: 60, limit: 8 },
  { name: "Pecs / Dos Salle B",  category: "Pecs / Dos", durationMinutes: 65, muscles: PECS_DOS_MUSCLES, locationKws: GYM_KWS,  sets: 3, reps: "12", rest: 90, limit: 8 },
  { name: "Pecs / Dos Maison B", category: "Pecs / Dos", durationMinutes: 55, muscles: PECS_DOS_MUSCLES, locationKws: HOME_KWS, sets: 4, reps: "12", rest: 60, limit: 8 },

  // ─── ÉPAULES ──────────────────────────────────────────────────────────────
  { name: "Épaules — Salle",  category: "Épaules", durationMinutes: 55, muscles: EPAULES_MUSCLES, locationKws: GYM_KWS,  sets: 4, reps: "12", rest: 90, limit: 8 },
  { name: "Épaules — Maison", category: "Épaules", durationMinutes: 45, muscles: EPAULES_MUSCLES, locationKws: HOME_KWS, sets: 4, reps: "15", rest: 60, limit: 8 },
  { name: "Épaules Salle B",  category: "Épaules", durationMinutes: 50, muscles: EPAULES_MUSCLES, locationKws: GYM_KWS,  sets: 3, reps: "15", rest: 90, limit: 7 },
  { name: "Épaules Maison B", category: "Épaules", durationMinutes: 45, muscles: EPAULES_MUSCLES, locationKws: HOME_KWS, sets: 3, reps: "15", rest: 60, limit: 7 },

  // ─── CARDIO ───────────────────────────────────────────────────────────────
  { name: "Cardio", category: "Cardio", durationMinutes: 40, muscles: CARDIO_MUSCLES, nameKws: CARDIO_NAME_KWS, sets: 1, reps: "10 min", rest: 60, limit: 6 },
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

  const [totalRow] = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) as count FROM exercise_library WHERE vimeo_video_id IS NOT NULL AND is_active = true ${EXCLUDE}`
  ).catch(() => [{ count: BigInt(0) }]);

  let inserted = 0;
  let skipped = 0;
  const details: { name: string; exercises: number; status: string }[] = [];

  for (const def of TEMPLATES) {
    if (!reset) {
      const [row] = await db.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM seance_templates WHERE name = ${def.name}
      `.catch(() => [{ count: BigInt(0) }]);
      if (Number(row?.count) > 0) {
        skipped++;
        details.push({ name: def.name, exercises: 0, status: "exists" });
        continue;
      }
    }

    const limit = def.limit ?? 8;
    let exercises: LibEx[];

    if (def.nameKws) {
      exercises = await byMuscleOrName(def.muscles ?? [], def.nameKws, limit);
    } else {
      exercises = await byMuscle(def.muscles ?? [], limit, def.locationKws);
    }

    // Fallback sans filtre lieu si pas assez d'exercices
    if (exercises.length < 3 && def.locationKws) {
      exercises = await byMuscle(def.muscles ?? [], limit);
    }

    if (exercises.length < 2) {
      skipped++;
      details.push({ name: def.name, exercises: exercises.length, status: "not enough" });
      continue;
    }

    const [{ id: seanceId }] = await db.$queryRaw<{ id: string }[]>`
      INSERT INTO seance_templates (name, category, duration_minutes)
      VALUES (${def.name}, ${def.category}, ${def.durationMinutes})
      RETURNING id::text
    `;

    for (let i = 0; i < exercises.length; i++) {
      await db.$executeRaw`
        INSERT INTO seance_template_exercises (seance_template_id, exercise_name, sets, reps, rest_seconds, order_index)
        VALUES (${seanceId}::uuid, ${exercises[i].name}, ${def.sets}, ${def.reps}, ${def.rest}, ${i})
      `;
    }

    inserted++;
    details.push({ name: def.name, exercises: exercises.length, status: "created" });
  }

  return NextResponse.json({
    message: reset ? "Templates réinitialisés" : "Séances seedées",
    exercisesWithVideos: Number(totalRow?.count ?? 0),
    inserted,
    skipped,
    total: TEMPLATES.length,
    details,
  });
}
