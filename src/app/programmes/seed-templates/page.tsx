import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

const TEMPLATES = [
  {
    name: "Séance Dos",
    description: "Renforcement du dos — tirage vertical et horizontal",
    session: "Dos",
    exercises: [
      { name: "Traction prise large", sets: 4 },
      { name: "Rowing barre", sets: 4 },
      { name: "Tirage vertical prise large", sets: 3 },
      { name: "Tirage horizontal câble", sets: 3 },
      { name: "Rowing haltère unilatéral", sets: 3 },
    ],
  },
  {
    name: "Séance Pecs",
    description: "Renforcement des pectoraux — développé et isolation",
    session: "Pecs",
    exercises: [
      { name: "Développé couché barre", sets: 4 },
      { name: "Développé incliné", sets: 3 },
      { name: "Écarté couché", sets: 3 },
      { name: "Pec deck / butterfly", sets: 3 },
      { name: "Dips pectoraux", sets: 3 },
    ],
  },
  {
    name: "Séance Push",
    description: "Pectoraux + épaules + triceps",
    session: "Push",
    exercises: [
      { name: "Développé couché haltères", sets: 4 },
      { name: "Développé militaire haltères", sets: 3 },
      { name: "Élévation latérale", sets: 3 },
      { name: "Pushdown câble corde", sets: 3 },
      { name: "Dips triceps", sets: 3 },
    ],
  },
  {
    name: "Séance Pull",
    description: "Dos + biceps",
    session: "Pull",
    exercises: [
      { name: "Traction prise large", sets: 4 },
      { name: "Rowing barre", sets: 4 },
      { name: "Tirage vertical prise serrée", sets: 3 },
      { name: "Curl barre EZ", sets: 3 },
      { name: "Curl haltères alternés", sets: 3 },
    ],
  },
  {
    name: "Séance Legs",
    description: "Quadriceps, ischio-jambiers, mollets",
    session: "Legs",
    exercises: [
      { name: "Squat barre", sets: 4 },
      { name: "Fentes avant", sets: 3 },
      { name: "Leg extension", sets: 3 },
      { name: "Hip thrust", sets: 4 },
      { name: "Leg curl couché", sets: 3 },
      { name: "Mollets debout", sets: 4 },
    ],
  },
  {
    name: "Séance Haut du corps",
    description: "Pecs + dos + épaules — séance complète haut",
    session: "Haut du corps",
    exercises: [
      { name: "Développé couché haltères", sets: 4 },
      { name: "Rowing haltère unilatéral", sets: 4 },
      { name: "Développé militaire haltères", sets: 3 },
      { name: "Tirage horizontal câble", sets: 3 },
      { name: "Élévation latérale", sets: 3 },
    ],
  },
  {
    name: "Séance Bas du corps",
    description: "Cuisses + fessiers + mollets — séance complète bas",
    session: "Bas du corps",
    exercises: [
      { name: "Squat barre", sets: 4 },
      { name: "Hip thrust", sets: 4 },
      { name: "Fentes arrière", sets: 3 },
      { name: "Leg extension", sets: 3 },
      { name: "Leg curl couché", sets: 3 },
      { name: "Mollets debout", sets: 3 },
    ],
  },
  {
    name: "Séance Cardio",
    description: "Circuit cardio — intensité modérée à élevée",
    session: "Cardio",
    exercises: [
      { name: "Burpees", sets: 4 },
      { name: "Mountain climbers", sets: 4 },
      { name: "Squat sauté", sets: 3 },
      { name: "Box jump", sets: 3 },
      { name: "Jumping jacks", sets: 3 },
    ],
  },
  {
    name: "Séance Renfo + Mobilité",
    description: "Renforcement musculaire profond et mobilité",
    session: "Renfo + Mobilité",
    exercises: [
      { name: "Planche", sets: 4 },
      { name: "Superman", sets: 3 },
      { name: "Glute bridge", sets: 3 },
      { name: "Good morning", sets: 3 },
      { name: "Face pull", sets: 3 },
      { name: "Hollow body", sets: 3 },
    ],
  },
  {
    name: "Séance Fessiers",
    description: "Focus fessiers — hip thrust, abduction, kickback",
    session: "Fessiers",
    exercises: [
      { name: "Hip thrust", sets: 4 },
      { name: "Glute bridge", sets: 3 },
      { name: "Donkey kick", sets: 3 },
      { name: "Kickback fessier", sets: 3 },
      { name: "Abduction hanche", sets: 3 },
      { name: "Leg press pieds hauts", sets: 3 },
    ],
  },
  {
    name: "Séance Abdos",
    description: "Renforcement abdominal complet",
    session: "Abdos",
    exercises: [
      { name: "Planche", sets: 4 },
      { name: "Crunch bicycle", sets: 3 },
      { name: "Leg raise", sets: 3 },
      { name: "Russian twist", sets: 3 },
      { name: "Mountain climbers", sets: 3 },
      { name: "Hollow body", sets: 3 },
    ],
  },
  {
    name: "Séance Épaules",
    description: "Deltroïdes antérieurs, latéraux et postérieurs",
    session: "Épaules",
    exercises: [
      { name: "Développé militaire haltères", sets: 4 },
      { name: "Élévation latérale", sets: 4 },
      { name: "Oiseau / élévation arrière", sets: 3 },
      { name: "Arnold press", sets: 3 },
      { name: "Face pull", sets: 3 },
      { name: "Shrugs", sets: 3 },
    ],
  },
  {
    name: "Séance Bras",
    description: "Biceps + triceps",
    session: "Bras",
    exercises: [
      { name: "Curl barre EZ", sets: 4 },
      { name: "Dips triceps", sets: 4 },
      { name: "Curl haltères alternés", sets: 3 },
      { name: "Extension nuque haltère", sets: 3 },
      { name: "Curl marteau", sets: 3 },
      { name: "Pushdown câble corde", sets: 3 },
    ],
  },
  {
    name: "Full Body",
    description: "Séance corps entier — exercices polyarticulaires",
    session: "Full Body",
    exercises: [
      { name: "Squat barre", sets: 4 },
      { name: "Développé couché barre", sets: 4 },
      { name: "Rowing barre", sets: 4 },
      { name: "Développé militaire haltères", sets: 3 },
      { name: "Hip thrust", sets: 3 },
      { name: "Planche", sets: 3 },
    ],
  },
];

async function doSeed() {
  "use server";
  const library = await db.exerciseLibrary.findMany({ select: { id: true, name: true } });
  const byName = new Map(library.map((e) => [e.name.toLowerCase(), e.id]));

  for (const tmpl of TEMPLATES) {
    const exists = await db.trainingProgram.findFirst({
      where: { isTemplate: true, name: tmpl.name },
      select: { id: true },
    });
    if (exists) continue;

    const program = await db.trainingProgram.create({
      data: { clientId: null, isTemplate: true, name: tmpl.name, description: tmpl.description },
    });

    const session = await db.trainingSession.create({
      data: { programId: program.id, name: tmpl.session, orderIndex: 0 },
    });

    let order = 0;
    for (const ex of tmpl.exercises) {
      const libId = byName.get(ex.name.toLowerCase()) ?? null;
      await db.sessionExercise.create({
        data: {
          sessionId: session.id,
          name: ex.name,
          libraryExerciseId: libId,
          sets: ex.sets,
          reps: "10",
          restSeconds: 60,
          orderIndex: order++,
        },
      });
    }
  }

  redirect("/programmes");
}

export default async function SeedTemplatesPage() {
  const count = await db.trainingProgram.count({ where: { isTemplate: true } });

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div>
        <Link href="/programmes" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← Bibliothèque de programmes
        </Link>
        <h1 className="text-xl font-bold text-white mt-4">Générer les templates de base</h1>
        <p className="text-gray-400 text-sm mt-1">
          Crée automatiquement {TEMPLATES.length} templates pré-construits avec leurs exercices. Les templates déjà existants sont ignorés.
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <p className="text-sm text-gray-400">
          Templates déjà créés : <span className="text-white font-bold">{count}</span>
        </p>
        <div className="space-y-1.5">
          {TEMPLATES.map((t) => (
            <div key={t.name} className="flex items-center justify-between text-sm">
              <span className="text-gray-300">{t.name}</span>
              <span className="text-gray-600">{t.exercises.length} exercices · 3-4 séries · 10 reps</span>
            </div>
          ))}
        </div>
        <form action={doSeed} className="pt-2">
          <button
            type="submit"
            className="px-6 py-3 bg-brand-500 hover:bg-brand-400 text-white rounded-lg font-semibold transition-colors"
          >
            Générer les {TEMPLATES.length} templates →
          </button>
        </form>
      </div>
    </div>
  );
}
