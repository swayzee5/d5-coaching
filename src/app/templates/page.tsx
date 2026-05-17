export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";

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
  "Dos": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "Épaules": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  "Bras": "bg-violet-500/10 text-violet-400 border-violet-500/20",
  "Jambes Homme": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Jambes Femme": "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "Full Body": "bg-green-500/10 text-green-400 border-green-500/20",
  "Gainage": "bg-red-500/10 text-red-400 border-red-500/20",
  "Cardio": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

const SEANCE_CATEGORY_ICONS: Record<string, string> = {
  "Pectoraux": "💪",
  "Dos": "🏋️",
  "Épaules": "🎯",
  "Bras": "💪",
  "Jambes Homme": "🦵",
  "Jambes Femme": "🦵",
  "Full Body": "⚡",
  "Gainage": "🔥",
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
  const seanceCategoryOrder = ["Pectoraux", "Dos", "Épaules", "Bras", "Jambes Homme", "Jambes Femme", "Full Body", "Gainage", "Cardio", "Général"];

  return (
    <div className="p-6 space-y-12 max-w-5xl">

      {/* ── PROGRAMMES TEMPLATES ── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Templates de programmes</h1>
            <p className="text-gray-500 text-sm mt-1">{programTemplates.length} programmes · Appliquer en 1 clic sur un client</p>
          </div>
          <a
            href={`/api/seed/templates?secret=${process.env.CRON_SECRET ?? ""}`}
            target="_blank"
            className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700 rounded-lg transition-colors"
          >
            + Charger les programmes
          </a>
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
                          ✦ Appliquer
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
          <a
            href={`/api/seed/seances?secret=${process.env.CRON_SECRET ?? ""}`}
            target="_blank"
            className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700 rounded-lg transition-colors"
          >
            + Charger les séances
          </a>
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
          seanceCategoryOrder.map((cat) => {
            const group = bySeanceCategory[cat];
            if (!group?.length) return null;
            return (
              <div key={cat}>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  {SEANCE_CATEGORY_ICONS[cat] ?? "📋"} {cat}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.map((s) => (
                    <Link
                      key={s.id}
                      href={`/templates/seances/${s.id}`}
                      className="bg-gray-900 border border-gray-800 hover:border-brand-500/40 rounded-xl p-4 flex items-center justify-between gap-3 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{s.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{Number(s.exercise_count)} exercices</span>
                          {s.duration_minutes && <span>⏱ {s.duration_minutes} min</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${SEANCE_CATEGORY_COLORS[s.category] ?? "bg-gray-700 text-gray-400 border-gray-600"}`}>
                          {s.category}
                        </span>
                        <span className="text-gray-600 group-hover:text-brand-400 text-xs transition-colors">Modifier →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
