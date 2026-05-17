import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type ExTpl = { name: string; sets: number; reps: string; rest: number; notes?: string };
type SsTpl = { name: string; dayOfWeek?: number; orderIndex: number; durationMinutes?: number; notes?: string; exercises: ExTpl[] };
type PgTpl = { name: string; description: string; category: string; weeksDuration: number; sessions: SsTpl[] };

const TEMPLATES: PgTpl[] = [
  {
    name: "Push / Pull / Legs",
    description: "Programme 3 jours fondamental pour prise de masse. Push le lundi, Pull le mercredi, Legs le vendredi.",
    category: "Intermédiaire",
    weeksDuration: 8,
    sessions: [
      {
        name: "Push — Pectoraux / Épaules / Triceps",
        dayOfWeek: 1, orderIndex: 0, durationMinutes: 60,
        exercises: [
          { name: "Développé couché haltères", sets: 4, reps: "10", rest: 90 },
          { name: "Développé incliné haltères", sets: 3, reps: "12", rest: 90 },
          { name: "Écarté couché haltères", sets: 3, reps: "15", rest: 90 },
          { name: "Développé militaire haltères", sets: 4, reps: "10", rest: 90 },
          { name: "Élévations latérales haltères", sets: 4, reps: "15", rest: 90 },
          { name: "Oiseau haltères", sets: 3, reps: "15", rest: 90 },
          { name: "Extensions triceps câble corde", sets: 4, reps: "15", rest: 90 },
          { name: "Skull crusher barre EZ", sets: 3, reps: "12", rest: 90 },
        ],
      },
      {
        name: "Pull — Dos / Biceps",
        dayOfWeek: 3, orderIndex: 1, durationMinutes: 60,
        exercises: [
          { name: "Tractions prise large", sets: 4, reps: "8", rest: 90 },
          { name: "Rowing haltère unilatéral", sets: 4, reps: "12", rest: 90 },
          { name: "Tirage vertical prise étroite", sets: 3, reps: "12", rest: 90 },
          { name: "Rowing câble assis", sets: 3, reps: "15", rest: 90 },
          { name: "Face pull", sets: 4, reps: "20", rest: 90 },
          { name: "Shrugs haltères", sets: 3, reps: "15", rest: 90 },
          { name: "Curl barre EZ", sets: 4, reps: "12", rest: 90 },
          { name: "Curl marteau", sets: 3, reps: "12", rest: 90 },
        ],
      },
      {
        name: "Legs — Quadriceps / Ischio / Fessiers",
        dayOfWeek: 5, orderIndex: 2, durationMinutes: 70,
        exercises: [
          { name: "Squat barre", sets: 5, reps: "8", rest: 90, notes: "Descendre cuisses parallèles au sol" },
          { name: "Leg press", sets: 4, reps: "12", rest: 90 },
          { name: "Fentes marchées", sets: 3, reps: "12", rest: 90 },
          { name: "Extension jambes machine", sets: 3, reps: "15", rest: 90 },
          { name: "Leg curl couché machine", sets: 4, reps: "12", rest: 90 },
          { name: "Deadlift roumain barre", sets: 3, reps: "12", rest: 90 },
          { name: "Hip thrust barre", sets: 4, reps: "15", rest: 90 },
          { name: "Mollets debout machine", sets: 5, reps: "20", rest: 60 },
        ],
      },
    ],
  },
  {
    name: "Haut du corps / Bas du corps",
    description: "Programme 4 jours H/B. Lundi/Jeudi Haut — Mardi/Vendredi Bas.",
    category: "Intermédiaire",
    weeksDuration: 8,
    sessions: [
      {
        name: "Haut du corps",
        dayOfWeek: 1, orderIndex: 0, durationMinutes: 60,
        exercises: [
          { name: "Développé couché haltères", sets: 4, reps: "10", rest: 90 },
          { name: "Tractions prise large", sets: 4, reps: "8", rest: 90 },
          { name: "Développé incliné haltères", sets: 3, reps: "12", rest: 90 },
          { name: "Rowing haltère unilatéral", sets: 3, reps: "12", rest: 90 },
          { name: "Développé militaire haltères", sets: 3, reps: "12", rest: 90 },
          { name: "Élévations latérales haltères", sets: 3, reps: "15", rest: 90 },
          { name: "Curl barre EZ", sets: 3, reps: "12", rest: 90 },
          { name: "Dips triceps aux barres", sets: 3, reps: "12", rest: 90 },
        ],
      },
      {
        name: "Bas du corps",
        dayOfWeek: 2, orderIndex: 1, durationMinutes: 65,
        exercises: [
          { name: "Squat barre", sets: 5, reps: "8", rest: 90 },
          { name: "Deadlift roumain barre", sets: 4, reps: "10", rest: 90 },
          { name: "Hip thrust barre", sets: 4, reps: "15", rest: 90 },
          { name: "Bulgarian split squat", sets: 3, reps: "12", rest: 90 },
          { name: "Leg curl couché machine", sets: 4, reps: "12", rest: 90 },
          { name: "Fentes latérales", sets: 3, reps: "12", rest: 90 },
          { name: "Mollets debout machine", sets: 4, reps: "20", rest: 60 },
        ],
      },
    ],
  },
  {
    name: "Full Body Débutant",
    description: "Programme 3 jours pour débutants. Alterne séance A et B. Repos entre chaque séance.",
    category: "Débutant",
    weeksDuration: 6,
    sessions: [
      {
        name: "Full Body A",
        orderIndex: 0, durationMinutes: 50,
        exercises: [
          { name: "Squat gobelet", sets: 4, reps: "12", rest: 90, notes: "Maîtriser la technique avant d'ajouter du poids" },
          { name: "Développé couché haltères", sets: 4, reps: "10", rest: 90 },
          { name: "Rowing haltère unilatéral", sets: 3, reps: "12", rest: 90 },
          { name: "Fentes avant haltères", sets: 3, reps: "12", rest: 90 },
          { name: "Développé militaire haltères", sets: 3, reps: "10", rest: 90 },
          { name: "Curl haltères alternés", sets: 3, reps: "12", rest: 90 },
          { name: "Planche", sets: 3, reps: "45s", rest: 60 },
        ],
      },
      {
        name: "Full Body B",
        orderIndex: 1, durationMinutes: 50,
        exercises: [
          { name: "Deadlift roumain haltères", sets: 4, reps: "12", rest: 90 },
          { name: "Pompes classiques", sets: 4, reps: "15", rest: 90 },
          { name: "Tirage vertical prise large", sets: 3, reps: "12", rest: 90 },
          { name: "Hip thrust haltère", sets: 4, reps: "15", rest: 90 },
          { name: "Arnold press", sets: 3, reps: "12", rest: 90 },
          { name: "Curl marteau", sets: 3, reps: "12", rest: 90 },
          { name: "Russian twist", sets: 3, reps: "20", rest: 60 },
        ],
      },
    ],
  },
  {
    name: "Programme Femme — Fessiers & Jambes",
    description: "Programme 2 jours ciblé fessiers, cuisses et galbe général. Alterne A et B, 2-3 fois par semaine.",
    category: "Femme",
    weeksDuration: 8,
    sessions: [
      {
        name: "Fessiers & Jambes A",
        orderIndex: 0, durationMinutes: 55,
        exercises: [
          { name: "Hip thrust barre", sets: 5, reps: "12", rest: 90, notes: "Mouvement principal, bien contracter en haut" },
          { name: "Squat gobelet", sets: 4, reps: "15", rest: 90 },
          { name: "Fentes marchées", sets: 3, reps: "12", rest: 90 },
          { name: "Glute bridge unilatéral", sets: 3, reps: "15", rest: 90 },
          { name: "Abduction machine", sets: 4, reps: "20", rest: 90 },
          { name: "Clamshell élastique", sets: 3, reps: "20", rest: 60 },
          { name: "Donkey kick", sets: 3, reps: "15", rest: 60 },
          { name: "Mollets debout haltères", sets: 3, reps: "20", rest: 60 },
        ],
      },
      {
        name: "Fessiers & Jambes B",
        orderIndex: 1, durationMinutes: 55,
        exercises: [
          { name: "Bulgarian split squat", sets: 4, reps: "10", rest: 90, notes: "Pied arrière sur le banc, descente contrôlée" },
          { name: "Deadlift roumain haltères", sets: 4, reps: "12", rest: 90 },
          { name: "Kickback câble", sets: 4, reps: "15", rest: 90 },
          { name: "Monster walk élastique", sets: 3, reps: "20", rest: 60 },
          { name: "Step-up latéral", sets: 3, reps: "15", rest: 90 },
          { name: "Fire hydrant", sets: 3, reps: "20", rest: 60 },
          { name: "Squat pulse", sets: 3, reps: "20", rest: 60 },
          { name: "Mollets unilateral", sets: 4, reps: "20", rest: 60 },
        ],
      },
    ],
  },
  {
    name: "Programme Femme — Corps Complet",
    description: "Programme 3 jours pour femmes. Travail complet avec accent sur fessiers et haut du corps gainé.",
    category: "Femme",
    weeksDuration: 8,
    sessions: [
      {
        name: "Bas du corps & Fessiers",
        dayOfWeek: 1, orderIndex: 0, durationMinutes: 55,
        exercises: [
          { name: "Hip thrust barre", sets: 4, reps: "12", rest: 90 },
          { name: "Squat sumo", sets: 4, reps: "15", rest: 90 },
          { name: "Fentes arrière haltères", sets: 3, reps: "12", rest: 90 },
          { name: "Leg curl couché machine", sets: 3, reps: "15", rest: 90 },
          { name: "Abduction machine", sets: 4, reps: "20", rest: 90 },
          { name: "Glute bridge", sets: 3, reps: "20", rest: 60 },
        ],
      },
      {
        name: "Haut du corps & Gainage",
        dayOfWeek: 3, orderIndex: 1, durationMinutes: 50,
        exercises: [
          { name: "Pompes classiques", sets: 4, reps: "12", rest: 90 },
          { name: "Rowing haltère unilatéral", sets: 3, reps: "12", rest: 90 },
          { name: "Développé militaire haltères", sets: 3, reps: "12", rest: 90 },
          { name: "Élévations latérales haltères", sets: 3, reps: "15", rest: 90 },
          { name: "Curl haltères alternés", sets: 3, reps: "12", rest: 90 },
          { name: "Planche", sets: 3, reps: "45s", rest: 60 },
          { name: "Crunch", sets: 3, reps: "20", rest: 60 },
        ],
      },
      {
        name: "Full Body Express",
        dayOfWeek: 5, orderIndex: 2, durationMinutes: 45,
        exercises: [
          { name: "Squat gobelet", sets: 3, reps: "15", rest: 90 },
          { name: "Pompes inclinées", sets: 3, reps: "12", rest: 90 },
          { name: "Hip thrust haltère", sets: 3, reps: "15", rest: 90 },
          { name: "Clamshell élastique", sets: 3, reps: "20", rest: 60 },
          { name: "Mountain climber", sets: 3, reps: "30s", rest: 60 },
          { name: "Crunch inversé", sets: 3, reps: "15", rest: 60 },
        ],
      },
    ],
  },
  {
    name: "Retour Blessure — Épaule",
    description: "Protocole progressif 4 semaines. Phase 1 : mobilité et activation. Phase 2 : renforcement progressif.",
    category: "Rééducation",
    weeksDuration: 4,
    sessions: [
      {
        name: "Phase 1 — Mobilité & Activation (sem. 1-2)",
        orderIndex: 0, durationMinutes: 30,
        notes: "Aucune douleur tolérée. Arrêter si douleur > 3/10.",
        exercises: [
          { name: "Pendule Codman", sets: 3, reps: "2 min", rest: 60, notes: "Laisser le bras pendre, gravité uniquement" },
          { name: "Rotation externe isométrique épaule", sets: 3, reps: "10x10s", rest: 60 },
          { name: "Scapular push-up", sets: 3, reps: "15", rest: 60 },
          { name: "Wall slide", sets: 3, reps: "15", rest: 60 },
          { name: "Prone Y T W", sets: 3, reps: "10", rest: 60 },
          { name: "Shoulder CARs", sets: 2, reps: "5", rest: 60, notes: "Amplitude maximale contrôlée sans douleur" },
        ],
      },
      {
        name: "Phase 2 — Renforcement Progressif (sem. 3-4)",
        orderIndex: 1, durationMinutes: 40,
        notes: "Reprendre les poids légers progressivement.",
        exercises: [
          { name: "Banded pull-apart", sets: 3, reps: "20", rest: 60 },
          { name: "Face pull léger élastique", sets: 4, reps: "20", rest: 90 },
          { name: "Élévation latérale légère", sets: 3, reps: "15", rest: 90, notes: "2-3kg max, amplitude sans douleur" },
          { name: "Rotation externe élastique", sets: 3, reps: "15", rest: 90 },
          { name: "Prone Y T W", sets: 3, reps: "12", rest: 90 },
          { name: "Scapular push-up", sets: 3, reps: "20", rest: 60 },
        ],
      },
    ],
  },
  {
    name: "Retour Blessure — Genou",
    description: "Protocole progressif 4 semaines. Phase 1 : activation musculaire. Phase 2 : renforcement fonctionnel.",
    category: "Rééducation",
    weeksDuration: 4,
    sessions: [
      {
        name: "Phase 1 — Activation (sem. 1-2)",
        orderIndex: 0, durationMinutes: 35,
        notes: "Pas de douleur au genou. Respecter les amplitudes indiquées.",
        exercises: [
          { name: "Quad set isométrique", sets: 3, reps: "10x10s", rest: 60 },
          { name: "Straight leg raise", sets: 3, reps: "15", rest: 60 },
          { name: "Clamshell rééducation", sets: 3, reps: "20", rest: 60 },
          { name: "Abduction couchée rééducation", sets: 3, reps: "15", rest: 60 },
          { name: "Vélo stationnaire", sets: 1, reps: "15 min", rest: 0, notes: "Résistance légère, cadence douce" },
        ],
      },
      {
        name: "Phase 2 — Renforcement Fonctionnel (sem. 3-4)",
        orderIndex: 1, durationMinutes: 45,
        exercises: [
          { name: "Terminal knee extension élastique", sets: 3, reps: "15", rest: 60 },
          { name: "Mini squat contrôlé", sets: 3, reps: "15", rest: 90, notes: "Flexion max 40°, arrêter si douleur" },
          { name: "Step-up bas", sets: 3, reps: "12", rest: 90, notes: "Marche de 10-15cm max" },
          { name: "Wall squat isométrique", sets: 3, reps: "30s", rest: 90 },
          { name: "Leg curl assis machine", sets: 3, reps: "15", rest: 90, notes: "Charge légère, amplitude complète" },
          { name: "Glute bridge", sets: 3, reps: "15", rest: 90 },
        ],
      },
    ],
  },
  {
    name: "Retour Blessure — Dos",
    description: "Protocole McGill + renforcement progressif. Phase 1 : stabilisation. Phase 2 : retour au mouvement.",
    category: "Rééducation",
    weeksDuration: 4,
    sessions: [
      {
        name: "Phase 1 — Stabilisation (sem. 1-2)",
        orderIndex: 0, durationMinutes: 30,
        notes: "Big 3 de McGill. Mouvements lents et contrôlés. Stopper si douleur irradiante.",
        exercises: [
          { name: "Cat-cow", sets: 3, reps: "10", rest: 60, notes: "Très lent, 2s dans chaque position" },
          { name: "McGill curl-up", sets: 3, reps: "10", rest: 60 },
          { name: "McGill side plank", sets: 3, reps: "20s", rest: 60 },
          { name: "McGill bird dog", sets: 3, reps: "10", rest: 60 },
          { name: "Genou poitrine allongé", sets: 3, reps: "30s", rest: 60 },
          { name: "Marche contrôlée", sets: 1, reps: "20 min", rest: 0 },
        ],
      },
      {
        name: "Phase 2 — Renforcement (sem. 3-4)",
        orderIndex: 1, durationMinutes: 45,
        exercises: [
          { name: "Dead bug", sets: 3, reps: "10", rest: 90 },
          { name: "Bird dog", sets: 4, reps: "10", rest: 90 },
          { name: "Glute bridge rééducation", sets: 3, reps: "15", rest: 90 },
          { name: "Pallof press", sets: 3, reps: "12", rest: 90 },
          { name: "Cobra stretch", sets: 3, reps: "30s", rest: 60 },
          { name: "Hyperextension", sets: 3, reps: "12", rest: 90, notes: "Charge légère, amplitude contrôlée" },
        ],
      },
    ],
  },
];

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Create tables
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS program_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'Général',
      weeks_duration INT DEFAULT 8,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS session_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      program_template_id UUID NOT NULL REFERENCES program_templates(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      day_of_week INT,
      order_index INT DEFAULT 0,
      duration_minutes INT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS exercise_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_template_id UUID NOT NULL REFERENCES session_templates(id) ON DELETE CASCADE,
      exercise_name TEXT NOT NULL,
      sets INT DEFAULT 3,
      reps TEXT DEFAULT '10',
      rest_seconds INT DEFAULT 90,
      order_index INT DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;

  let inserted = 0;

  for (const tpl of TEMPLATES) {
    // Skip if already exists
    const existing = await db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM program_templates WHERE name = ${tpl.name}
    `;
    if (Number(existing[0].count) > 0) continue;

    // Insert program template
    const prog = await db.$queryRaw<{ id: string }[]>`
      INSERT INTO program_templates (name, description, category, weeks_duration)
      VALUES (${tpl.name}, ${tpl.description}, ${tpl.category}, ${tpl.weeksDuration})
      RETURNING id::text
    `;
    const programId = prog[0].id;

    for (const sess of tpl.sessions) {
      const s = await db.$queryRaw<{ id: string }[]>`
        INSERT INTO session_templates (program_template_id, name, day_of_week, order_index, duration_minutes, notes)
        VALUES (${programId}::uuid, ${sess.name}, ${sess.dayOfWeek ?? null}, ${sess.orderIndex}, ${sess.durationMinutes ?? null}, ${sess.notes ?? null})
        RETURNING id::text
      `;
      const sessionId = s[0].id;

      for (let i = 0; i < sess.exercises.length; i++) {
        const ex = sess.exercises[i];
        await db.$executeRaw`
          INSERT INTO exercise_templates (session_template_id, exercise_name, sets, reps, rest_seconds, order_index, notes)
          VALUES (${sessionId}::uuid, ${ex.name}, ${ex.sets}, ${ex.reps}, ${ex.rest}, ${i}, ${ex.notes ?? null})
        `;
      }
    }
    inserted++;
  }

  return NextResponse.json({ message: "Templates seedés", inserted, total: TEMPLATES.length });
}
