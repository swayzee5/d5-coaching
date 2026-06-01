import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type LibEx = { id: string; name: string; vimeo_video_id: string };

const EXCLUDE = `
  AND LOWER(name) NOT LIKE '%(seance)%'
  AND LOWER(name) NOT LIKE '%(séance)%'
  AND LOWER(name) NOT LIKE '%(programme)%'
`;

const HOME_KWS = ["maison", "poids de corps", "poids du corps", "élastique", "elastique", "sans matériel", "sans materiel", "bodyweight"];
const GYM_KWS  = ["salle", "machine", "câble", "cable", "haltère", "haltere", "barre", "poulie", "smith", "banc"];

async function byMuscle(muscles: string[], limit: number, locationKws?: string[]): Promise<LibEx[]> {
  const muscleCond = muscles
    .map((k) => `EXISTS(SELECT 1 FROM unnest(muscles) m WHERE LOWER(m) ILIKE '%${k.replace(/'/g,"''")}%')`)
    .join(" OR ");
  const locCond = locationKws?.length
    ? `AND (${locationKws.map((k) => `LOWER(name) ILIKE '%${k.replace(/'/g,"''")}%'`).join(" OR ")})`
    : "";
  return db.$queryRawUnsafe<LibEx[]>(
    `SELECT id::text, name, vimeo_video_id FROM exercise_library
     WHERE vimeo_video_id IS NOT NULL AND is_active = true ${EXCLUDE} ${locCond}
       AND (${muscleCond})
     ORDER BY name LIMIT ${limit}`
  ).catch(() => []);
}

async function byMuscleOrName(muscles: string[], nameKws: string[], limit: number, locationKws?: string[]): Promise<LibEx[]> {
  const muscleCond = muscles
    .map((k) => `EXISTS(SELECT 1 FROM unnest(muscles) m WHERE LOWER(m) ILIKE '%${k.replace(/'/g,"''")}%')`)
    .join(" OR ");
  const nameCond = nameKws
    .map((k) => `LOWER(name) ILIKE '%${k.replace(/'/g,"''")}%'`)
    .join(" OR ");
  const locCond = locationKws?.length
    ? `AND (${locationKws.map((k) => `LOWER(name) ILIKE '%${k.replace(/'/g,"''")}%'`).join(" OR ")})`
    : "";
  return db.$queryRawUnsafe<LibEx[]>(
    `SELECT id::text, name, vimeo_video_id FROM exercise_library
     WHERE vimeo_video_id IS NOT NULL AND is_active = true ${EXCLUDE} ${locCond}
       AND (${muscleCond} OR ${nameCond})
     ORDER BY name LIMIT ${limit}`
  ).catch(() => []);
}

type TemplateDef = {
  name: string; category: string; durationMinutes: number;
  muscles?: string[]; nameKws?: string[]; locationKws?: string[];
  sets: number; reps: string; rest: number; limit?: number;
};

const PUSH    = ["pectoral", "pecs", "poitrine", "épaule", "epaule", "deltoïde", "deltoide", "triceps"];
const PULL    = ["dos", "dorsal", "grand dorsal", "latissimus", "biceps", "trapèze", "trapeze", "rhomboïde"];
const LEGS    = ["quadriceps", "quads", "ischio", "femoral", "fessiers", "glutes", "mollets", "jambes"];
const FULL    = [...new Set([...PUSH, ...PULL, ...LEGS])];
const HAUT    = ["pectoral", "pecs", "dos", "dorsal", "épaule", "epaule", "biceps", "triceps"];
const PECS    = ["pectoral", "pecs", "poitrine", "chest"];
const PECSDO  = [...new Set([...PECS, "dos", "dorsal", "grand dorsal", "latissimus", "trapèze", "rhomboïde"])];
const EPAUL   = ["épaule", "epaule", "deltoïde", "deltoide", "delta", "shoulder", "trapèze"];
const CARDIO_M = ["cardio"];
const CARDIO_N = ["marche", "course", "skierg", "escaliers", "vélo", "rameur", "corde", "hiit", "cardio"];

const TEMPLATES: TemplateDef[] = [
  // ── JAMBES ──────────────────────────────────────────────────────────────
  { name:"Jambes — Salle",       category:"Jambes",         durationMinutes:65, muscles:LEGS,   locationKws:GYM_KWS,  sets:4, reps:"12", rest:90, limit:8 },
  { name:"Jambes — Maison",      category:"Jambes",         durationMinutes:55, muscles:LEGS,   locationKws:HOME_KWS, sets:4, reps:"15", rest:60, limit:8 },
  { name:"Jambes Salle B",       category:"Jambes",         durationMinutes:60, muscles:["ischio","femoral","fessiers","glutes","mollets"], locationKws:GYM_KWS,  sets:4, reps:"12", rest:90, limit:8 },
  { name:"Jambes Maison B",      category:"Jambes",         durationMinutes:50, muscles:["ischio","femoral","fessiers","glutes","abducteurs"], locationKws:HOME_KWS, sets:3, reps:"15", rest:60, limit:8 },

  // ── HAUT DU CORPS ───────────────────────────────────────────────────────
  { name:"Haut du corps — Salle",  category:"Haut du corps", durationMinutes:65, muscles:HAUT, locationKws:GYM_KWS,  sets:3, reps:"12", rest:90, limit:8 },
  { name:"Haut du corps — Maison", category:"Haut du corps", durationMinutes:55, muscles:HAUT, locationKws:HOME_KWS, sets:3, reps:"15", rest:60, limit:8 },
  { name:"Haut du corps Salle B",  category:"Haut du corps", durationMinutes:60, muscles:HAUT, locationKws:GYM_KWS,  sets:4, reps:"10", rest:90, limit:8 },
  { name:"Haut du corps Maison B", category:"Haut du corps", durationMinutes:50, muscles:HAUT, locationKws:HOME_KWS, sets:4, reps:"12", rest:60, limit:8 },

  // ── PECS ────────────────────────────────────────────────────────────────
  { name:"Pecs — Salle",   category:"Pecs", durationMinutes:60, muscles:PECS, locationKws:GYM_KWS,  sets:4, reps:"10", rest:90, limit:8 },
  { name:"Pecs — Maison",  category:"Pecs", durationMinutes:50, muscles:PECS, locationKws:HOME_KWS, sets:4, reps:"12", rest:60, limit:8 },
  { name:"Pecs Salle B",   category:"Pecs", durationMinutes:55, muscles:PECS, locationKws:GYM_KWS,  sets:3, reps:"12", rest:90, limit:6 },
  { name:"Pecs Maison B",  category:"Pecs", durationMinutes:45, muscles:PECS, locationKws:HOME_KWS, sets:3, reps:"15", rest:60, limit:6 },

  // ── PECS / DOS ──────────────────────────────────────────────────────────
  { name:"Pecs / Dos — Salle",  category:"Pecs / Dos", durationMinutes:70, muscles:PECSDO, locationKws:GYM_KWS,  sets:4, reps:"10", rest:90, limit:8 },
  { name:"Pecs / Dos — Maison", category:"Pecs / Dos", durationMinutes:60, muscles:PECSDO, locationKws:HOME_KWS, sets:3, reps:"12", rest:60, limit:8 },
  { name:"Pecs / Dos Salle B",  category:"Pecs / Dos", durationMinutes:65, muscles:PECSDO, locationKws:GYM_KWS,  sets:3, reps:"12", rest:90, limit:8 },
  { name:"Pecs / Dos Maison B", category:"Pecs / Dos", durationMinutes:55, muscles:PECSDO, locationKws:HOME_KWS, sets:4, reps:"12", rest:60, limit:8 },

  // ── ÉPAULES ────────────────────────────────────────────────────────────
  { name:"Épaules — Salle",  category:"Épaules", durationMinutes:55, muscles:EPAUL, locationKws:GYM_KWS,  sets:4, reps:"12", rest:90, limit:8 },
  { name:"Épaules — Maison", category:"Épaules", durationMinutes:45, muscles:EPAUL, locationKws:HOME_KWS, sets:4, reps:"15", rest:60, limit:8 },
  { name:"Épaules Salle B",  category:"Épaules", durationMinutes:50, muscles:EPAUL, locationKws:GYM_KWS,  sets:3, reps:"15", rest:90, limit:7 },
  { name:"Épaules Maison B", category:"Épaules", durationMinutes:45, muscles:EPAUL, locationKws:HOME_KWS, sets:3, reps:"15", rest:60, limit:7 },

  // ── PPL ───────────────────────────────────────────────────────────────────
  { name:"Push — Salle",   category:"Push / Pull / Legs", durationMinutes:65, muscles:PUSH, locationKws:GYM_KWS,  sets:4, reps:"10", rest:90, limit:8 },
  { name:"Push — Maison",  category:"Push / Pull / Legs", durationMinutes:55, muscles:PUSH, locationKws:HOME_KWS, sets:4, reps:"12", rest:60, limit:8 },
  { name:"Pull — Salle",   category:"Push / Pull / Legs", durationMinutes:60, muscles:PULL, locationKws:GYM_KWS,  sets:4, reps:"10", rest:90, limit:7 },
  { name:"Pull — Maison",  category:"Push / Pull / Legs", durationMinutes:50, muscles:PULL, locationKws:HOME_KWS, sets:4, reps:"12", rest:60, limit:7 },
  { name:"Legs Day — Salle",  category:"Push / Pull / Legs", durationMinutes:70, muscles:LEGS, locationKws:GYM_KWS,  sets:4, reps:"12", rest:90, limit:8 },
  { name:"Legs Day — Maison", category:"Push / Pull / Legs", durationMinutes:60, muscles:LEGS, locationKws:HOME_KWS, sets:4, reps:"15", rest:60, limit:8 },

  // ── FULL BODY ───────────────────────────────────────────────────────────
  { name:"Full Body — Salle",    category:"Full Body", durationMinutes:60, muscles:FULL, locationKws:GYM_KWS,  sets:3, reps:"12", rest:90, limit:8 },
  { name:"Full Body — Maison",   category:"Full Body", durationMinutes:50, muscles:FULL, locationKws:HOME_KWS, sets:3, reps:"15", rest:60, limit:8 },
  { name:"Full Body Force Salle", category:"Full Body", durationMinutes:65, muscles:FULL, locationKws:GYM_KWS,  sets:4, reps:"8",  rest:90, limit:8 },
  { name:"Full Body Force Maison",category:"Full Body", durationMinutes:55, muscles:FULL, locationKws:HOME_KWS, sets:4, reps:"10", rest:60, limit:8 },
  { name:"Full Body Express Salle",  category:"Full Body", durationMinutes:40, muscles:FULL, locationKws:GYM_KWS,  sets:3, reps:"12", rest:60, limit:6 },
  { name:"Full Body Express Maison", category:"Full Body", durationMinutes:35, muscles:FULL, locationKws:HOME_KWS, sets:3, reps:"12", rest:60, limit:6 },

  // ── CARDIO ────────────────────────────────────────────────────────────
  { name:"Cardio — Salle",  category:"Cardio", durationMinutes:40, muscles:CARDIO_M, nameKws:CARDIO_N, locationKws:GYM_KWS,  sets:1, reps:"10 min", rest:60, limit:6 },
  { name:"Cardio — Maison", category:"Cardio", durationMinutes:35, muscles:CARDIO_M, nameKws:CARDIO_N, locationKws:HOME_KWS, sets:1, reps:"10 min", rest:60, limit:6 },
  { name:"Cardio",           category:"Cardio", durationMinutes:40, muscles:CARDIO_M, nameKws:CARDIO_N,                       sets:1, reps:"10 min", rest:60, limit:6 },
];

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const reset = req.nextUrl.searchParams.get("reset") === "1";

  await db.$executeRaw`CREATE TABLE IF NOT EXISTS seance_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, category TEXT DEFAULT 'Général',
    duration_minutes INT, notes TEXT, created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await db.$executeRaw`CREATE TABLE IF NOT EXISTS seance_template_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seance_template_id UUID NOT NULL REFERENCES seance_templates(id) ON DELETE CASCADE,
    exercise_name TEXT NOT NULL, sets INT DEFAULT 3, reps TEXT DEFAULT '10',
    rest_seconds INT DEFAULT 90, order_index INT DEFAULT 0, notes TEXT
  )`;

  if (reset) await db.$executeRaw`TRUNCATE seance_templates CASCADE`;

  const [countRow] = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) as count FROM exercise_library WHERE vimeo_video_id IS NOT NULL AND is_active = true ${EXCLUDE}`
  ).catch(() => [{ count: BigInt(0) }]);

  let inserted = 0, skipped = 0;
  const details: { name: string; exos: number; status: string }[] = [];

  for (const def of TEMPLATES) {
    if (!reset) {
      const [row] = await db.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM seance_templates WHERE name = ${def.name}
      `.catch(() => [{ count: BigInt(0) }]);
      if (Number(row?.count) > 0) { skipped++; details.push({ name: def.name, exos: 0, status: "exists" }); continue; }
    }

    const limit = def.limit ?? 8;
    let exos = def.nameKws
      ? await byMuscleOrName(def.muscles ?? [], def.nameKws, limit, def.locationKws)
      : await byMuscle(def.muscles ?? [], limit, def.locationKws);

    // Fallback sans filtre lieu si < 3 exercices
    if (exos.length < 3 && def.locationKws) {
      exos = def.nameKws
        ? await byMuscleOrName(def.muscles ?? [], def.nameKws, limit)
        : await byMuscle(def.muscles ?? [], limit);
    }

    if (exos.length < 2) { skipped++; details.push({ name: def.name, exos: exos.length, status: "not enough" }); continue; }

    const [{ id }] = await db.$queryRaw<{ id: string }[]>`
      INSERT INTO seance_templates (name, category, duration_minutes)
      VALUES (${def.name}, ${def.category}, ${def.durationMinutes})
      RETURNING id::text
    `;

    for (let i = 0; i < exos.length; i++) {
      await db.$executeRaw`
        INSERT INTO seance_template_exercises (seance_template_id, exercise_name, sets, reps, rest_seconds, order_index)
        VALUES (${id}::uuid, ${exos[i].name}, ${def.sets}, ${def.reps}, ${def.rest}, ${i})
      `;
    }

    inserted++;
    details.push({ name: def.name, exos: exos.length, status: "created" });
  }

  return NextResponse.json({
    message: reset ? "Templates réinitialisés" : "Séances seedées",
    exercisesWithVideos: Number(countRow?.count ?? 0),
    inserted, skipped, total: TEMPLATES.length, details,
  });
}
