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

// Keywords par nom d'exercice (quand les muscles ne sont pas bien taggués)
const PECS_NAME_KWS   = ["développé", "developpe", "pecs", "pectoral", "fly", "pompe", "pompes", "dips", "chest", "poitrine"];
const DOS_NAME_KWS    = ["tirage", "rowing", "traction", "pull", "soudevé", "soulevé", "soulevé", "row", "dorsal", "dos"];
const LEGS_NAME_KWS   = ["squat", "fente", "presse", "leg", "mollet", "ischio", "hip", "deadlift", "roumain"];
const EPAUL_NAME_KWS  = ["écart", "ecart", "développé militaire", "developpe militaire", "hausser", "shrug", "lateral", "latéral", "oiseau"];
const PUSH_NAME_KWS   = [...new Set([...PECS_NAME_KWS, ...EPAUL_NAME_KWS, "triceps", "extension", "dips"])];
const PULL_NAME_KWS   = [...new Set([...DOS_NAME_KWS, "biceps", "curl"])];
const FULL_NAME_KWS   = [...new Set([...PUSH_NAME_KWS, ...PULL_NAME_KWS, ...LEGS_NAME_KWS])];
const CARDIO_NAME_KWS = ["marche", "course", "skierg", "escaliers", "vélo", "velo", "rameur", "corde", "hiit", "cardio"];

async function byMuscleOrName(muscles: string[], nameKws: string[], limit: number, locationKws?: string[]): Promise<LibEx[]> {
  const muscleCond = muscles.length
    ? muscles.map((k) => `EXISTS(SELECT 1 FROM unnest(muscles) m WHERE LOWER(m) ILIKE '%${k.replace(/'/g,"''")}%')`).join(" OR ")
    : "false";
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

type Def = {
  name: string; category: string; durationMinutes: number;
  muscles: string[]; nameKws: string[]; locationKws?: string[];
  sets: number; reps: string; rest: number; limit?: number;
};

const PECS_M  = ["pectoral", "pecs", "poitrine", "chest"];
const DOS_M   = ["dos", "dorsal", "grand dorsal", "latissimus", "trapèze", "rhomboïde"];
const LEGS_M  = ["quadriceps", "quads", "ischio", "femoral", "fessiers", "glutes", "mollets", "jambes"];
const EPAUL_M = ["épaule", "epaule", "deltoïde", "deltoide", "delta", "shoulder", "trapèze"];
const HAUT_M  = [...new Set([...PECS_M, ...DOS_M, ...EPAUL_M, "biceps", "triceps"])];
const PUSH_M  = [...new Set([...PECS_M, ...EPAUL_M, "triceps"])];
const PULL_M  = [...new Set([...DOS_M, "biceps"])];
const FULL_M  = [...new Set([...PUSH_M, ...PULL_M, ...LEGS_M])];

const TEMPLATES: Def[] = [
  // ── JAMBES ──────────────────────────────────────────────────────
  { name:"Jambes — Salle",       category:"Jambes", durationMinutes:65, muscles:LEGS_M,  nameKws:LEGS_NAME_KWS,  locationKws:GYM_KWS,  sets:4, reps:"12", rest:90, limit:8 },
  { name:"Jambes — Maison",      category:"Jambes", durationMinutes:55, muscles:LEGS_M,  nameKws:LEGS_NAME_KWS,  locationKws:HOME_KWS, sets:4, reps:"15", rest:60, limit:8 },
  { name:"Jambes Salle B",       category:"Jambes", durationMinutes:60, muscles:LEGS_M,  nameKws:LEGS_NAME_KWS,  locationKws:GYM_KWS,  sets:4, reps:"12", rest:90, limit:8 },
  { name:"Jambes Maison B",      category:"Jambes", durationMinutes:50, muscles:LEGS_M,  nameKws:LEGS_NAME_KWS,  locationKws:HOME_KWS, sets:3, reps:"15", rest:60, limit:8 },

  // ── HAUT DU CORPS ───────────────────────────────────────────────
  { name:"Haut du corps — Salle",  category:"Haut du corps", durationMinutes:65, muscles:HAUT_M, nameKws:FULL_NAME_KWS, locationKws:GYM_KWS,  sets:3, reps:"12", rest:90, limit:8 },
  { name:"Haut du corps — Maison", category:"Haut du corps", durationMinutes:55, muscles:HAUT_M, nameKws:FULL_NAME_KWS, locationKws:HOME_KWS, sets:3, reps:"15", rest:60, limit:8 },
  { name:"Haut du corps Salle B",  category:"Haut du corps", durationMinutes:60, muscles:HAUT_M, nameKws:FULL_NAME_KWS, locationKws:GYM_KWS,  sets:4, reps:"10", rest:90, limit:8 },
  { name:"Haut du corps Maison B", category:"Haut du corps", durationMinutes:50, muscles:HAUT_M, nameKws:FULL_NAME_KWS, locationKws:HOME_KWS, sets:4, reps:"12", rest:60, limit:8 },

  // ── PECS ───────────────────────────────────────────────────────────
  { name:"Pecs — Salle",   category:"Pecs", durationMinutes:60, muscles:PECS_M, nameKws:PECS_NAME_KWS, locationKws:GYM_KWS,  sets:4, reps:"10", rest:90, limit:8 },
  { name:"Pecs — Maison",  category:"Pecs", durationMinutes:50, muscles:PECS_M, nameKws:PECS_NAME_KWS, locationKws:HOME_KWS, sets:4, reps:"12", rest:60, limit:8 },
  { name:"Pecs Salle B",   category:"Pecs", durationMinutes:55, muscles:PECS_M, nameKws:PECS_NAME_KWS, locationKws:GYM_KWS,  sets:3, reps:"12", rest:90, limit:6 },
  { name:"Pecs Maison B",  category:"Pecs", durationMinutes:45, muscles:PECS_M, nameKws:PECS_NAME_KWS, locationKws:HOME_KWS, sets:3, reps:"15", rest:60, limit:6 },

  // ── DOS ──────────────────────────────────────────────────────────────
  { name:"Dos — Salle",   category:"Dos", durationMinutes:65, muscles:DOS_M, nameKws:DOS_NAME_KWS, locationKws:GYM_KWS,  sets:4, reps:"10", rest:90, limit:8 },
  { name:"Dos — Maison",  category:"Dos", durationMinutes:55, muscles:DOS_M, nameKws:DOS_NAME_KWS, locationKws:HOME_KWS, sets:4, reps:"12", rest:60, limit:8 },
  { name:"Dos Salle B",   category:"Dos", durationMinutes:60, muscles:DOS_M, nameKws:DOS_NAME_KWS, locationKws:GYM_KWS,  sets:3, reps:"12", rest:90, limit:8 },
  { name:"Dos Maison B",  category:"Dos", durationMinutes:50, muscles:DOS_M, nameKws:DOS_NAME_KWS, locationKws:HOME_KWS, sets:3, reps:"12", rest:60, limit:8 },

  // ── PECS / DOS ──────────────────────────────────────────────────────
  { name:"Pecs / Dos — Salle",  category:"Pecs / Dos", durationMinutes:70, muscles:[...PECS_M,...DOS_M], nameKws:[...PECS_NAME_KWS,...DOS_NAME_KWS], locationKws:GYM_KWS,  sets:4, reps:"10", rest:90, limit:8 },
  { name:"Pecs / Dos — Maison", category:"Pecs / Dos", durationMinutes:60, muscles:[...PECS_M,...DOS_M], nameKws:[...PECS_NAME_KWS,...DOS_NAME_KWS], locationKws:HOME_KWS, sets:3, reps:"12", rest:60, limit:8 },
  { name:"Pecs / Dos Salle B",  category:"Pecs / Dos", durationMinutes:65, muscles:[...PECS_M,...DOS_M], nameKws:[...PECS_NAME_KWS,...DOS_NAME_KWS], locationKws:GYM_KWS,  sets:3, reps:"12", rest:90, limit:8 },
  { name:"Pecs / Dos Maison B", category:"Pecs / Dos", durationMinutes:55, muscles:[...PECS_M,...DOS_M], nameKws:[...PECS_NAME_KWS,...DOS_NAME_KWS], locationKws:HOME_KWS, sets:4, reps:"12", rest:60, limit:8 },

  // ── ÉPAULES ────────────────────────────────────────────────────────
  { name:"Épaules — Salle",  category:"Épaules", durationMinutes:55, muscles:EPAUL_M, nameKws:EPAUL_NAME_KWS, locationKws:GYM_KWS,  sets:4, reps:"12", rest:90, limit:8 },
  { name:"Épaules — Maison", category:"Épaules", durationMinutes:45, muscles:EPAUL_M, nameKws:EPAUL_NAME_KWS, locationKws:HOME_KWS, sets:4, reps:"15", rest:60, limit:8 },
  { name:"Épaules Salle B",  category:"Épaules", durationMinutes:50, muscles:EPAUL_M, nameKws:EPAUL_NAME_KWS, locationKws:GYM_KWS,  sets:3, reps:"15", rest:90, limit:7 },
  { name:"Épaules Maison B", category:"Épaules", durationMinutes:45, muscles:EPAUL_M, nameKws:EPAUL_NAME_KWS, locationKws:HOME_KWS, sets:3, reps:"15", rest:60, limit:7 },

  // ── PPL ─────────────────────────────────────────────────────────────
  { name:"Push — Salle",    category:"Push / Pull / Legs", durationMinutes:65, muscles:PUSH_M, nameKws:PUSH_NAME_KWS, locationKws:GYM_KWS,  sets:4, reps:"10", rest:90, limit:8 },
  { name:"Push — Maison",   category:"Push / Pull / Legs", durationMinutes:55, muscles:PUSH_M, nameKws:PUSH_NAME_KWS, locationKws:HOME_KWS, sets:4, reps:"12", rest:60, limit:8 },
  { name:"Pull — Salle",    category:"Push / Pull / Legs", durationMinutes:60, muscles:PULL_M, nameKws:PULL_NAME_KWS, locationKws:GYM_KWS,  sets:4, reps:"10", rest:90, limit:7 },
  { name:"Pull — Maison",   category:"Push / Pull / Legs", durationMinutes:50, muscles:PULL_M, nameKws:PULL_NAME_KWS, locationKws:HOME_KWS, sets:4, reps:"12", rest:60, limit:7 },
  { name:"Legs Day — Salle",  category:"Push / Pull / Legs", durationMinutes:70, muscles:LEGS_M, nameKws:LEGS_NAME_KWS, locationKws:GYM_KWS,  sets:4, reps:"12", rest:90, limit:8 },
  { name:"Legs Day — Maison", category:"Push / Pull / Legs", durationMinutes:60, muscles:LEGS_M, nameKws:LEGS_NAME_KWS, locationKws:HOME_KWS, sets:4, reps:"15", rest:60, limit:8 },

  // ── FULL BODY ───────────────────────────────────────────────────────
  { name:"Full Body — Salle",     category:"Full Body", durationMinutes:60, muscles:FULL_M, nameKws:FULL_NAME_KWS, locationKws:GYM_KWS,  sets:3, reps:"12", rest:90, limit:8 },
  { name:"Full Body — Maison",    category:"Full Body", durationMinutes:50, muscles:FULL_M, nameKws:FULL_NAME_KWS, locationKws:HOME_KWS, sets:3, reps:"15", rest:60, limit:8 },
  { name:"Full Body Force Salle",  category:"Full Body", durationMinutes:65, muscles:FULL_M, nameKws:FULL_NAME_KWS, locationKws:GYM_KWS,  sets:4, reps:"8",  rest:90, limit:8 },
  { name:"Full Body Force Maison", category:"Full Body", durationMinutes:55, muscles:FULL_M, nameKws:FULL_NAME_KWS, locationKws:HOME_KWS, sets:4, reps:"10", rest:60, limit:8 },
  { name:"Full Body Express Salle",  category:"Full Body", durationMinutes:40, muscles:FULL_M, nameKws:FULL_NAME_KWS, locationKws:GYM_KWS,  sets:3, reps:"12", rest:60, limit:6 },
  { name:"Full Body Express Maison", category:"Full Body", durationMinutes:35, muscles:FULL_M, nameKws:FULL_NAME_KWS, locationKws:HOME_KWS, sets:3, reps:"12", rest:60, limit:6 },

  // ── CARDIO ─────────────────────────────────────────────────────────
  { name:"Cardio — Salle",  category:"Cardio", durationMinutes:40, muscles:["cardio"], nameKws:CARDIO_NAME_KWS, locationKws:GYM_KWS,  sets:1, reps:"10 min", rest:60, limit:6 },
  { name:"Cardio — Maison", category:"Cardio", durationMinutes:35, muscles:["cardio"], nameKws:CARDIO_NAME_KWS, locationKws:HOME_KWS, sets:1, reps:"10 min", rest:60, limit:6 },
  { name:"Cardio",           category:"Cardio", durationMinutes:40, muscles:["cardio"], nameKws:CARDIO_NAME_KWS,                       sets:1, reps:"10 min", rest:60, limit:6 },
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
    let exos = await byMuscleOrName(def.muscles, def.nameKws, limit, def.locationKws);

    // Fallback sans filtre lieu si < 3 exercices
    if (exos.length < 3 && def.locationKws) {
      exos = await byMuscleOrName(def.muscles, def.nameKws, limit);
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
    inserted, skipped, total: TEMPLATES.length, details,
  });
}
