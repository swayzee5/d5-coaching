export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";

type SessionTpl = {
  id: string;
  name: string;
  day_of_week: number | null;
  duration_minutes: number | null;
  notes: string | null;
  order_index: number;
};

type ExerciseTpl = {
  id: string;
  session_template_id: string;
  exercise_name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  order_index: number;
  notes: string | null;
};

type ProgramTpl = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  weeks_duration: number;
};

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default async function TemplatePage({ params }: { params: { id: string } }) {
  const { id } = params;

  const templates = await db.$queryRaw<ProgramTpl[]>`
    SELECT id::text, name, description, category, weeks_duration
    FROM program_templates WHERE id = ${id}::uuid
  `.catch(() => [] as ProgramTpl[]);

  if (!templates.length) notFound();
  const tpl = templates[0];

  const sessions = await db.$queryRaw<SessionTpl[]>`
    SELECT id::text, name, day_of_week, duration_minutes, notes, order_index
    FROM session_templates WHERE program_template_id = ${id}::uuid
    ORDER BY order_index ASC
  `.catch(() => [] as SessionTpl[]);

  const exercises = sessions.length
    ? await db.$queryRaw<ExerciseTpl[]>`
        SELECT id::text, session_template_id::text, exercise_name, sets, reps, rest_seconds, order_index, notes
        FROM exercise_templates
        WHERE session_template_id = ANY(${sessions.map((s) => s.id)}::uuid[])
        ORDER BY order_index ASC
      `.catch(() => [] as ExerciseTpl[])
    : [];

  const exBySession = exercises.reduce<Record<string, ExerciseTpl[]>>((acc, ex) => {
    if (!acc[ex.session_template_id]) acc[ex.session_template_id] = [];
    acc[ex.session_template_id].push(ex);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/templates" className="text-gray-400 hover:text-white text-sm">← Templates</Link>
        <span className="text-gray-700">/</span>
        <h1 className="text-xl font-bold text-white">{tpl.name}</h1>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            {tpl.description && <p className="text-gray-400 text-sm mb-3">{tpl.description}</p>}
            <div className="flex gap-4 text-xs text-gray-500">
              <span>📋 {sessions.length} séance{sessions.length > 1 ? "s" : ""}</span>
              <span>📅 {tpl.weeks_duration} semaines</span>
              <span>⏱ 90s repos</span>
            </div>
          </div>
          <Link
            href={`/templates/${id}/apply`}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
          >
            ✦ Appliquer à un client
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {sessions.map((sess) => (
          <div key={sess.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">{sess.name}</h3>
                <div className="flex gap-3 mt-0.5 text-xs text-gray-500">
                  {sess.day_of_week != null && <span>{DAYS[sess.day_of_week - 1]}</span>}
                  {sess.duration_minutes && <span>{sess.duration_minutes} min</span>}
                  {sess.notes && <span className="text-yellow-500">{sess.notes}</span>}
                </div>
              </div>
              <span className="text-xs text-gray-500">{(exBySession[sess.id] ?? []).length} exercices</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800/50">
                  <th className="text-left text-xs text-gray-600 px-5 py-2">Exercice</th>
                  <th className="text-center text-xs text-gray-600 px-3 py-2">Séries</th>
                  <th className="text-center text-xs text-gray-600 px-3 py-2">Reps</th>
                  <th className="text-center text-xs text-gray-600 px-3 py-2">Repos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/30">
                {(exBySession[sess.id] ?? []).map((ex) => (
                  <tr key={ex.id} className="hover:bg-gray-800/20">
                    <td className="px-5 py-3">
                      <p className="text-white">{ex.exercise_name}</p>
                      {ex.notes && <p className="text-xs text-gray-500 mt-0.5">{ex.notes}</p>}
                    </td>
                    <td className="px-3 py-3 text-center text-gray-300">{ex.sets}</td>
                    <td className="px-3 py-3 text-center text-gray-300">{ex.reps}</td>
                    <td className="px-3 py-3 text-center text-gray-500 text-xs">{ex.rest_seconds}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
