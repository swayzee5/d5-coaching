import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Ex = { name: string; sets: number; reps: string; rest: number; notes?: string };
type Tpl = { name: string; category: string; durationMinutes: number; exercises: Ex[] };

const SEANCES: Tpl[] = [
  {
    name: "Séance Pectoraux",
    category: "Pectoraux",
    durationMinutes: 60,
    exercises: [
      { name: "Développé couché haltères", sets: 4, reps: "10", rest: 90, notes: "Mouvement principal, bien contrôler la descente" },
      { name: "Développé incliné haltères", sets: 4, reps: "12", rest: 90 },
      { name: "Écarté couché haltères", sets: 3, reps: "15", rest: 90 },
      { name: "Développé décliné haltères", sets: 3, reps: "12", rest: 90 },
      { name: "Câble croisé bas vers haut", sets: 3, reps: "15", rest: 90 },
      { name: "Pompes déclinées", sets: 3, reps: "max", rest: 90 },
      { name: "Dips pectoraux", sets: 3, reps: "12", rest: 90 },
    ],
  },
  {
    name: "Séance Dos",
    category: "Dos",
    durationMinutes: 65,
    exercises: [
      { name: "Tractions prise large", sets: 4, reps: "8", rest: 90, notes: "Amplitude complète, pas de compensation" },
      { name: "Rowing haltère unilatéral", sets: 4, reps: "12", rest: 90 },
      { name: "Tirage vertical prise large", sets: 3, reps: "12", rest: 90 },
      { name: "Rowing câble assis", sets: 3, reps: "15", rest: 90 },
      { name: "Face pull", sets: 4, reps: "20", rest: 90, notes: "Indispensable pour la santé des épaules" },
      { name: "Shrugs haltères", sets: 3, reps: "15", rest: 90 },
      { name: "Hyperextension", sets: 3, reps: "15", rest: 90 },
    ],
  },
  {
    name: "Séance Épaules",
    category: "Épaules",
    durationMinutes: 55,
    exercises: [
      { name: "Développé militaire haltères", sets: 4, reps: "10", rest: 90, notes: "Mouvement principal, ne pas bloquer les coudes en haut" },
      { name: "Arnold press", sets: 3, reps: "12", rest: 90 },
      { name: "Élévations latérales haltères", sets: 5, reps: "15", rest: 90, notes: "Poids léger, volume élevé" },
      { name: "Élévations latérales câble", sets: 3, reps: "15", rest: 90 },
      { name: "Oiseau haltères", sets: 4, reps: "15", rest: 90 },
      { name: "Face pull", sets: 4, reps: "20", rest: 90 },
      { name: "Rotation externe élastique", sets: 3, reps: "15", rest: 60 },
    ],
  },
  {
    name: "Séance Bras",
    category: "Bras",
    durationMinutes: 50,
    exercises: [
      { name: "Curl barre EZ", sets: 4, reps: "12", rest: 90 },
      { name: "Skull crusher barre EZ", sets: 4, reps: "12", rest: 90 },
      { name: "Curl marteau", sets: 3, reps: "12", rest: 90 },
      { name: "Extensions triceps câble corde", sets: 4, reps: "15", rest: 90 },
      { name: "Curl concentré", sets: 3, reps: "12", rest: 90 },
      { name: "Dips triceps aux barres", sets: 3, reps: "12", rest: 90 },
      { name: "Curl 21s", sets: 2, reps: "21", rest: 90, notes: "7 bas + 7 haut + 7 complets" },
    ],
  },
  {
    name: "Séance Jambes Homme",
    category: "Jambes Homme",
    durationMinutes: 70,
    exercises: [
      { name: "Squat barre", sets: 5, reps: "8", rest: 90, notes: "Descendre cuisses parallèles au sol minimum" },
      { name: "Leg press", sets: 4, reps: "12", rest: 90 },
      { name: "Hack squat", sets: 3, reps: "12", rest: 90 },
      { name: "Extension jambes machine", sets: 3, reps: "15", rest: 90 },
      { name: "Leg curl couché machine", sets: 4, reps: "12", rest: 90 },
      { name: "Hip thrust barre", sets: 4, reps: "15", rest: 90 },
      { name: "Fentes marchées", sets: 3, reps: "12", rest: 90 },
      { name: "Mollets debout machine", sets: 5, reps: "20", rest: 60 },
    ],
  },
  {
    name: "Séance Ischio & Fessiers Homme",
    category: "Jambes Homme",
    durationMinutes: 60,
    exercises: [
      { name: "Deadlift roumain barre", sets: 4, reps: "10", rest: 90, notes: "Dos neutre, sentir l'étirement des ischio" },
      { name: "Leg curl couché machine", sets: 4, reps: "12", rest: 90 },
      { name: "Nordic curl", sets: 3, reps: "8", rest: 90, notes: "Excentrique difficile, très efficace" },
      { name: "Hip thrust barre", sets: 5, reps: "12", rest: 90 },
      { name: "Bulgarian split squat", sets: 3, reps: "12", rest: 90 },
      { name: "Good morning", sets: 3, reps: "12", rest: 90 },
      { name: "Mollets sur marche", sets: 4, reps: "20", rest: 60 },
    ],
  },
  {
    name: "Séance Fessiers & Jambes Femme A",
    category: "Jambes Femme",
    durationMinutes: 55,
    exercises: [
      { name: "Hip thrust barre", sets: 5, reps: "12", rest: 90, notes: "Mouvement phare, bien contracter les fessiers en haut" },
      { name: "Squat gobelet", sets: 4, reps: "15", rest: 90 },
      { name: "Abduction machine", sets: 4, reps: "20", rest: 90 },
      { name: "Kickback câble", sets: 4, reps: "15", rest: 90 },
      { name: "Fentes marchées", sets: 3, reps: "12", rest: 90 },
      { name: "Clamshell élastique", sets: 3, reps: "20", rest: 60 },
      { name: "Donkey kick", sets: 3, reps: "15", rest: 60 },
      { name: "Mollets debout haltères", sets: 3, reps: "20", rest: 60 },
    ],
  },
  {
    name: "Séance Fessiers & Jambes Femme B",
    category: "Jambes Femme",
    durationMinutes: 55,
    exercises: [
      { name: "Bulgarian split squat", sets: 4, reps: "10", rest: 90, notes: "Pied arrière sur le banc, descente contrôlée" },
      { name: "Deadlift roumain haltères", sets: 4, reps: "12", rest: 90 },
      { name: "Monster walk élastique", sets: 3, reps: "20", rest: 60 },
      { name: "Step-up latéral", sets: 3, reps: "15", rest: 90 },
      { name: "Fire hydrant", sets: 3, reps: "20", rest: 60 },
      { name: "Squat pulse", sets: 3, reps: "20", rest: 60 },
      { name: "Glute bridge unilatéral", sets: 3, reps: "15", rest: 90 },
      { name: "Mollets unilateral", sets: 4, reps: "20", rest: 60 },
    ],
  },
  {
    name: "Full Body Express",
    category: "Full Body",
    durationMinutes: 45,
    exercises: [
      { name: "Squat gobelet", sets: 3, reps: "15", rest: 90 },
      { name: "Pompes classiques", sets: 3, reps: "15", rest: 90 },
      { name: "Hip thrust haltère", sets: 3, reps: "15", rest: 90 },
      { name: "Rowing haltère unilatéral", sets: 3, reps: "12", rest: 90 },
      { name: "Développé militaire haltères", sets: 3, reps: "12", rest: 90 },
      { name: "Fentes avant haltères", sets: 3, reps: "12", rest: 90 },
      { name: "Crunch", sets: 3, reps: "20", rest: 60 },
    ],
  },
  {
    name: "Gainage & Abdominaux",
    category: "Gainage",
    durationMinutes: 40,
    exercises: [
      { name: "Planche", sets: 4, reps: "45s", rest: 60 },
      { name: "Planche latérale", sets: 3, reps: "30s", rest: 60 },
      { name: "Dead bug", sets: 3, reps: "10", rest: 60 },
      { name: "Russian twist", sets: 3, reps: "20", rest: 60 },
      { name: "Hanging leg raises", sets: 3, reps: "15", rest: 90 },
      { name: "Mountain climber", sets: 3, reps: "30s", rest: 60 },
      { name: "Ab wheel rollout", sets: 3, reps: "10", rest: 90, notes: "Gainage absolu requis" },
    ],
  },
  {
    name: "Cardio & Mobilité",
    category: "Cardio",
    durationMinutes: 45,
    exercises: [
      { name: "Worlds greatest stretch", sets: 3, reps: "5", rest: 60, notes: "Mobilité complète — ne pas sauter cette étape" },
      { name: "Hip 90/90", sets: 3, reps: "10", rest: 60 },
      { name: "Burpee", sets: 4, reps: "10", rest: 90 },
      { name: "Jump squat", sets: 3, reps: "10", rest: 90 },
      { name: "Kettlebell swing", sets: 4, reps: "15", rest: 90 },
      { name: "Mountain climber", sets: 3, reps: "30s", rest: 60 },
      { name: "Saut à la corde", sets: 5, reps: "2 min", rest: 60 },
    ],
  },
];

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

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

  let inserted = 0;

  for (const tpl of SEANCES) {
    const existing = await db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM seance_templates WHERE name = ${tpl.name}
    `;
    if (Number(existing[0].count) > 0) continue;

    const rows = await db.$queryRaw<{ id: string }[]>`
      INSERT INTO seance_templates (name, category, duration_minutes)
      VALUES (${tpl.name}, ${tpl.category}, ${tpl.durationMinutes})
      RETURNING id::text
    `;
    const seanceId = rows[0].id;

    for (let i = 0; i < tpl.exercises.length; i++) {
      const ex = tpl.exercises[i];
      await db.$executeRaw`
        INSERT INTO seance_template_exercises (seance_template_id, exercise_name, sets, reps, rest_seconds, order_index, notes)
        VALUES (${seanceId}::uuid, ${ex.name}, ${ex.sets}, ${ex.reps}, ${ex.rest}, ${i}, ${ex.notes ?? null})
      `;
    }
    inserted++;
  }

  return NextResponse.json({ message: "Séances seedées", inserted, total: SEANCES.length });
}
