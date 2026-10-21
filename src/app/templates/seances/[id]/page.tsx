export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { deleteExerciseFromSeanceTemplate, updateSeanceTemplateName } from "./actions";
import { clientsAttribuables } from "@/app/templates/actions";
import { AttribuerSeance } from "@/components/templates/AttribuerSeance";
import { DeplacerExercice } from "@/components/templates/DeplacerExercice";
import { AjouterDepuisBibliotheque } from "@/components/templates/AjouterDepuisBibliotheque";
import { ApercuExercice } from "@/components/templates/ApercuExercice";
import { ModifierExercice } from "@/components/templates/ModifierExercice";

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

  const clients = await clientsAttribuables().catch(() => []);

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

        {/* L'attribution est ici, et non dans un écran séparé : c'est en
            regardant la séance qu'on décide à qui la donner. */}
        {exercises.length > 0 && (
          <div className="pt-2">
            <AttribuerSeance seanceTemplateId={template.id} clients={clients} />
          </div>
        )}

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
                <div className="flex shrink-0 items-center gap-1">
                  {/* L'ordre décide de ce qui est fait frais et de ce qui est
                      fait fatigué. Sans ces deux flèches, insérer un exercice
                      au bon endroit obligeait à tout supprimer. */}
                  <DeplacerExercice
                    exerciceId={ex.id}
                    templateId={params.id}
                    premier={i === 0}
                    dernier={i === exercises.length - 1}
                  />
                  <form action={deleteAction}>
                    <button
                      type="submit"
                      className="px-2 py-1 text-xs text-red-400 transition-colors hover:text-red-300"
                    >
                      Supprimer
                    </button>
                  </form>
                </div>
              </div>

              {/* Le template ne porte qu'un nom : la vidéo et la description
                  sont lues dans la bibliothèque quand le client ouvre sa
                  séance. Le dépliant montre ce rattachement avant
                  l'attribution, pendant qu'il est encore corrigeable. */}
              <ApercuExercice nom={ex.exercise_name} consigne={ex.notes} />

              {/* Corriger trois répétitions imposait de supprimer et de
                  rajouter : la ligne repartait en fin de séance et l'ordre
                  était à refaire. À ce prix-là, on laisse l'erreur. */}
              <ModifierExercice
                exerciceId={ex.id}
                templateId={params.id}
                nom={ex.exercise_name}
                series={ex.sets}
                reps={ex.reps}
                repos={ex.rest_seconds}
                note={ex.notes}
              />
            </div>
          );
        })}
      </div>

      <AjouterDepuisBibliotheque templateId={template.id} />

    </div>
  );
}
