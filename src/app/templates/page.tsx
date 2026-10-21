export const dynamic = "force-dynamic";

import { BoutonSauvegarde } from "@/components/ui/Confirmation";
import { db } from "@/lib/db";
import Link from "next/link";
import { creerSeanceType, creerProgrammeType } from "./actions";

type ProgramTemplate = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  weeks_duration: number;
  session_count: bigint;
};

type SeanceTemplate = {
  id: string;
  name: string;
  category: string;
  duration_minutes: number | null;
  exercise_count: bigint;
};

const CATEGORY_COLORS: Record<string, string> = {
  "Débutant": "bg-green-500/10 text-green-400 border-green-500/20",
  "Intermédiaire": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Avancé": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Femme": "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "Rééducation": "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const SEANCE_CATEGORY_COLORS: Record<string, string> = {
  "Pectoraux": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Pecs": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Pecs / Triceps": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Dos": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "Dos / Biceps": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "Épaules": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  "Bras": "bg-violet-500/10 text-violet-400 border-violet-500/20",
  "Jambes": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Jambes Femme": "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "Fessiers": "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "Push / Pull / Legs": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Full Body": "bg-green-500/10 text-green-400 border-green-500/20",
  "Gainage": "bg-red-500/10 text-red-400 border-red-500/20",
  "Abdominaux": "bg-red-500/10 text-red-400 border-red-500/20",
  "Cardio": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

/** Les catégories proposées à la création d'une séance type. */
const MUSCLE_CATEGORIES = [
  // Les découpes réellement utilisées pour composer une semaine : un muscle
  // seul, ou la paire qui se travaille dans la même séance. « Pectoraux »
  // reste dans la liste pour les séances déjà rangées sous ce nom.
  "Pecs", "Pecs / Triceps", "Dos", "Dos / Biceps", "Bras",
  "Épaules", "Jambes", "Push / Pull / Legs", "Full Body",
  "Abdominaux", "Gainage", "Cardio", "Pectoraux",
];

const SEANCE_CATEGORY_ICONS: Record<string, string> = {
  "Pectoraux": "💪",
  "Pecs": "💪",
  "Pecs / Triceps": "💪",
  "Dos": "🏋️",
  "Dos / Biceps": "🏋️",
  "Épaules": "🎯",
  "Bras": "💪",
  "Jambes": "🦵",
  "Jambes Femme": "🦵",
  "Fessiers": "🦵",
  "Push / Pull / Legs": "⚡",
  "Full Body": "⚡",
  "Gainage": "🔥",
  "Abdominaux": "🔥",
  "Cardio": "🏃",
};

export default async function TemplatesPage() {
  // Ensure tables exist
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS program_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'Général',
      weeks_duration INT DEFAULT 8,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `.catch(() => {});

  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS session_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      program_template_id UUID NOT NULL,
      name TEXT NOT NULL,
      day_of_week INT,
      order_index INT DEFAULT 0,
      duration_minutes INT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `.catch(() => {});

  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS seance_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      category TEXT DEFAULT 'Général',
      duration_minutes INT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `.catch(() => {});

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
  `.catch(() => {});

  const [programTemplates, seanceTemplates] = await Promise.all([
    db.$queryRaw<ProgramTemplate[]>`
      SELECT
        pt.id::text,
        pt.name,
        pt.description,
        pt.category,
        pt.weeks_duration,
        COUNT(st.id) AS session_count
      FROM program_templates pt
      LEFT JOIN session_templates st ON st.program_template_id = pt.id
      GROUP BY pt.id
      ORDER BY pt.category, pt.name
    `.catch(() => [] as ProgramTemplate[]),

    db.$queryRaw<SeanceTemplate[]>`
      SELECT
        st.id::text,
        st.name,
        st.category,
        st.duration_minutes,
        COUNT(ste.id) AS exercise_count
      FROM seance_templates st
      LEFT JOIN seance_template_exercises ste ON ste.seance_template_id = st.id
      GROUP BY st.id
      ORDER BY st.category, st.name
    `.catch(() => [] as SeanceTemplate[]),
  ]);

  const byProgramCategory = programTemplates.reduce<Record<string, ProgramTemplate[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  const bySeanceCategory = seanceTemplates.reduce<Record<string, SeanceTemplate[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  const programCategoryOrder = ["Débutant", "Intermédiaire", "Avancé", "Femme", "Rééducation", "Général"];
  const seanceCategoryOrder = [
    "Pecs", "Pecs / Triceps", "Pectoraux",
    "Dos", "Dos / Biceps", "Bras", "Épaules",
    "Jambes", "Fessiers", "Jambes Femme",
    "Push / Pull / Legs", "Full Body",
    "Gainage", "Abdominaux", "Cardio", "Général",
  ];

  // Une catégorie créée à la main et absente de cet ordre n'apparaissait
  // nulle part : la séance existait, mais restait introuvable.
  const categoriesAffichees = [
    ...seanceCategoryOrder.filter((c) => bySeanceCategory[c]?.length),
    ...Object.keys(bySeanceCategory)
      .filter((c) => !seanceCategoryOrder.includes(c))
      .sort(),
  ];

  return (
    <div className="p-6 space-y-12 max-w-5xl">

      {/* ── PROGRAMMES TEMPLATES ── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Templates de programmes</h1>
            <p className="text-gray-500 text-sm mt-1">{programTemplates.length} programmes · Appliquer en 1 clic sur un client</p>
          </div>
          {/* Un formulaire plutôt qu'un bouton de chargement : le coach
              compose ses propres blocs, il n'installe pas ceux d'un autre. */}
          <form action={creerProgrammeType} className="flex flex-wrap items-center gap-2">
            <input
              name="nom"
              required
              placeholder="Nom du programme"
              className="w-48 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-brand-500 focus:outline-none"
            />
            <input
              name="semaines"
              type="number"
              min={1}
              defaultValue={6}
              title="Durée en semaines"
              className="w-16 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-center text-sm text-white focus:border-brand-500 focus:outline-none"
            />
            <BoutonSauvegarde
              confirmation="Programme créé"
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-50"
            >
              + Créer
            </BoutonSauvegarde>
          </form>
        </div>

        {programTemplates.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
            <p className="text-gray-400 mb-4">Aucun template de programme chargé.</p>
            <a
              href={`/api/seed/templates?secret=${process.env.CRON_SECRET ?? ""}`}
              target="_blank"
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Charger maintenant
            </a>
          </div>
        ) : (
          programCategoryOrder.map((cat) => {
            const group = byProgramCategory[cat];
            if (!group?.length) return null;
            return (
              <div key={cat}>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">{cat}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.map((t) => (
                    <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-white font-semibold text-base">{t.name}</h3>
                        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[t.category] ?? "bg-gray-700 text-gray-400 border-gray-600"}`}>
                          {t.category}
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-gray-400 text-sm leading-relaxed">{t.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>📋 {Number(t.session_count)} séance{Number(t.session_count) > 1 ? "s" : ""}</span>
                        <span>📅 {t.weeks_duration} semaines</span>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Link
                          href={`/templates/${t.id}`}
                          className="flex-1 text-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
                        >
                          Voir le détail
                        </Link>
                        <Link
                          href={`/templates/${t.id}/apply`}
                          className="flex-1 text-center px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          ✶ Appliquer
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Divider */}
      <hr className="border-gray-800" />

      {/* ── SÉANCES TEMPLATES ── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Templates de séances</h2>
            <p className="text-gray-500 text-sm mt-1">{seanceTemplates.length} séances · Cliquer pour modifier</p>
          </div>
          <form action={creerSeanceType} className="flex flex-wrap items-center gap-2">
            <input
              name="nom"
              required
              placeholder="Nom de la séance"
              className="w-48 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-brand-500 focus:outline-none"
            />
            <select
              name="categorie"
              defaultValue="Dos"
              className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-white focus:border-brand-500 focus:outline-none"
            >
              {MUSCLE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <BoutonSauvegarde
              confirmation="Séance créée"
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-50"
            >
              + Créer
            </BoutonSauvegarde>
          </form>
        </div>

        {seanceTemplates.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
            <p className="text-gray-400 mb-4">Aucun template de séance chargé.</p>
            <a
              href={`/api/seed/seances?secret=${process.env.CRON_SECRET ?? ""}`}
              target="_blank"
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Charger maintenant
            </a>
          </div>
        ) : (
          categoriesAffichees.map((cat) => {
            const group = bySeanceCategory[cat];
            if (!group?.length) return null;
            return (
              <div key={cat}>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  {SEANCE_CATEGORY_ICONS[cat] ?? "📋"} {cat}
                </h3>
                {/* Salle à gauche, maison à droite. Les séances de salle sont
                    celles qui portent l'accompagnement : elles doivent tomber
                    sous les yeux en premier, pas se mélanger à l'ordre
                    alphabétique où « Maison » passe avant « Salle ». */}
                {(() => {
                  const maison = group.filter((s) => estMaison(s.name));
                  const salle = group.filter((s) => !estMaison(s.name));
                  if (maison.length === 0 || salle.length === 0) {
                    return (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {group.map((s) => (
                          <CarteSeance key={s.id} seance={s} />
                        ))}
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-600">Salle</p>
                        {salle.map((s) => (
                          <CarteSeance key={s.id} seance={s} />
                        ))}
                      </div>
                      <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-600">Maison</p>
                        {maison.map((s) => (
                          <CarteSeance key={s.id} seance={s} />
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

/**
 * Une séance se fait-elle à la maison ?
 *
 * Lu dans le nom, faute de colonne : c'est ainsi que les séances sont
 * nommées depuis le début (« Dos Salle B », « Dos — Maison »). Une séance
 * qui ne dit rien est rangée côté salle — c'est le cas courant, et c'est le
 * côté qu'on regarde en premier.
 */
function estMaison(nom: string): boolean {
  return /\bmaison\b|\bdomicile\b/i.test(nom);
}

function CarteSeance({ seance }: { seance: SeanceTemplate }) {
  return (
    <Link
      href={`/templates/seances/${seance.id}`}
      className="group flex items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-brand-500/40"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{seance.name}</p>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
          <span>{Number(seance.exercise_count)} exercices</span>
          {seance.duration_minutes && <span>⏱ {seance.duration_minutes} min</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-xs ${
            SEANCE_CATEGORY_COLORS[seance.category] ??
            "border-gray-600 bg-gray-700 text-gray-400"
          }`}
        >
          {seance.category}
        </span>
        <span className="text-xs text-gray-600 transition-colors group-hover:text-brand-400">
          Modifier →
        </span>
      </div>
    </Link>
  );
}
