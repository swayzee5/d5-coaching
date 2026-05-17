export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  weeks_duration: number;
  session_count: bigint;
};

const CATEGORY_COLORS: Record<string, string> = {
  "Débutant": "bg-green-500/10 text-green-400 border-green-500/20",
  "Intermédiaire": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Avancé": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Femme": "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "Rééducation": "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export default async function TemplatesPage() {
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

  const templates = await db.$queryRaw<Template[]>`
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
  `.catch(() => [] as Template[]);

  const byCategory = templates.reduce<Record<string, Template[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  const categoryOrder = ["Débutant", "Intermédiaire", "Avancé", "Femme", "Rééducation", "Général"];

  return (
    <div className="p-6 space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Templates de programmes</h1>
          <p className="text-gray-500 text-sm mt-1">{templates.length} templates · Appliquer en 1 clic sur un client</p>
        </div>
        <a
          href={`/api/seed/templates?secret=${process.env.CRON_SECRET ?? ""}`}
          target="_blank"
          className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700 rounded-lg transition-colors"
        >
          + Charger les templates
        </a>
      </div>

      {templates.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-400 mb-4">Aucun template chargé.</p>
          <a
            href={`/api/seed/templates?secret=${process.env.CRON_SECRET ?? ""}`}
            target="_blank"
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Charger les templates maintenant
          </a>
        </div>
      )}

      {categoryOrder.map((cat) => {
        const group = byCategory[cat];
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
      })}
    </div>
  );
}
