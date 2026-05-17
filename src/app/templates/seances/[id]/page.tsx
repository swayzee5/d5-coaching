export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { addExerciseToSeanceTemplate, deleteExerciseFromSeanceTemplate, updateSeanceTemplateName } from "./actions";

type SeanceTemplate = {
  id: string;
  name: string;
  category: string;
  duration_minutes: number | null;
  notes: string | null;
};

type TemplateExercise = {
  id: string;
  exercise_name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  order_index: number;
  notes: string | null;
};

export default async function SeanceTemplateDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const rows = await db.$queryRaw<SeanceTemplate[]>`
    SELECT id::text, name, category, duration_minutes, notes
    FROM seance_templates WHERE id = ${params.id}::uuid
  `.catch(() => [] as SeanceTemplate[]);

  if (!rows.length) return notFound();
  const template = rows[0];

  const exercises = await db.$queryRaw<TemplateExercise[]>`
    SELECT id::text, exercise_name, sets, reps, rest_seconds, order_index, notes
    FROM seance_template_exercises
    WHERE seance_template_id = ${params.id}::uuid
    ORDER BY order_index ASC
  `.catch(() => [] as TemplateExercise[]);

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <Link
        href="/templates"
        className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
      >
        ← Templates
      </Link>

      {/* Header + edit name */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">{template.name}</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
            {template.category}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{exercises.length} exercices</span>
          {template.duration_minutes && <span>⏱ {template.duration_minutes} min</span>}
        </div>

        {/* Edit name / duration */}
        <form action={updateSeanceTemplateName} className="flex flex-wrap gap-2 pt-1">
          <input type="hidden" name="templateId" value={template.id} />
          <input
            name="name"
            defaultValue={template.name}
            required
            placeholder="Nom de la séance"
            className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
          />
          <input
            name="durationMinutes"
            type="number"
            defaultValue={template.duration_minutes ?? ""}
            placeholder="Durée (min)"
            className="w-32 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
          >
            Sauvegarder
          </button>
        </form>
      </div>

      {/* Exercises list */}
      <div className="space-y-3">
        <h2 className="text-white font-semibold">Exercices ({exercises.length})</h2>

        {exercises.length === 0 && (
          <p className="text-gray-500 text-sm">Aucun exercice. Ajoutez-en ci-dessous.</p>
        )}

        {exercises.map((ex, i) => {
          const deleteAction = deleteExerciseFromSeanceTemplate.bind(null, ex.id, params.id);
          return (
            <div key={ex.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center text-gray-500 text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-white font-medium text-sm">{ex.exercise_name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
                      <span className="text-brand-400 font-semibold">{ex.sets} × {ex.reps}</span>
                      <span className="text-gray-500">{ex.rest_seconds}s repos</span>
                      {ex.notes && <span className="text-gray-500 italic">{ex.notes}</span>}
                    </div>
                  </div>
                </div>
                <form action={deleteAction}>
                  <button
                    type="submit"
                    className="text-xs text-red-400 hover:text-red-300 shrink-0 transition-colors px-2 py-1"
                  >
                    Supprimer
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add exercise form */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
        <h2 className="text-white font-semibold">Ajouter un exercice</h2>
        <form action={addExerciseToSeanceTemplate} className="space-y-3">
          <input type="hidden" name="templateId" value={template.id} />
          <input type="hidden" name="orderIndex" value={exercises.length} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nom de l&apos;exercice *</label>
              <input
                name="exerciseName"
                required
                placeholder="ex: Développé couché haltères"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Séries</label>
                <input
                  name="sets"
                  type="number"
                  min="1"
                  defaultValue="3"
                  placeholder="3"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Reps</label>
                <input
                  name="reps"
                  defaultValue="12"
                  placeholder="12"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Repos (secondes)</label>
              <input
                name="restSeconds"
                type="number"
                defaultValue="90"
                placeholder="90"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Notes (optionnel)</label>
              <input
                name="notes"
                placeholder="ex: Descente lente en 3s"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            + Ajouter
          </button>
        </form>
      </div>
    </div>
  );
}
