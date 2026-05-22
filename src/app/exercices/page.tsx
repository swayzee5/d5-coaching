export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { createExercise, deleteExercise } from "./actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import ExerciseRow from "@/components/exercices/ExerciseRow";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Bibliothèque d'exercices — D5 CRM" };

const MUSCLE_GROUPS = [
  "Pectoraux", "Dos", "Épaules", "Biceps", "Triceps", "Abdominaux",
  "Quadriceps", "Ischio-jambiers", "Fessiers", "Mollets", "Cardio / Mobilité",
  "Retour blessure - Épaule", "Retour blessure - Genou",
  "Retour blessure - Dos", "Retour blessure - Cheville",
];

const FILTER_GROUPS = ["Tous", ...MUSCLE_GROUPS];

type ExerciseRow = {
  id: string;
  name: string;
  description: string | null;
  muscles: string[];
  vimeo_video_id: string | null;
  generated_video_url: string | null;
  is_active: boolean;
};

export default async function ExercicesPage({
  searchParams,
}: {
  searchParams: { cat?: string };
}) {
  await db.$executeRaw`
    ALTER TABLE exercise_library ADD COLUMN IF NOT EXISTS generated_video_url TEXT
  `.catch(() => {});

  const cat = searchParams.cat;

  const exercises =
    cat && cat !== "Tous"
      ? await db.$queryRaw<ExerciseRow[]>`
          SELECT id::text, name, description, muscles, vimeo_video_id, generated_video_url, is_active
          FROM exercise_library WHERE is_active = true AND ${cat} = ANY(muscles)
          ORDER BY name ASC
        `.catch(() => [] as ExerciseRow[])
      : await db.$queryRaw<ExerciseRow[]>`
          SELECT id::text, name, description, muscles, vimeo_video_id, generated_video_url, is_active
          FROM exercise_library WHERE is_active = true
          ORDER BY name ASC
        `.catch(() => [] as ExerciseRow[]);

  const withVideo = exercises.filter((e) => e.vimeo_video_id).length;
  const withoutVideo = exercises.length - withVideo;

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Bibliothèque d&apos;exercices</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {exercises.length} exercices · {withVideo} avec vidéo · {withoutVideo} sans
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/exercices/import-vimeo"
            className="text-sm px-4 py-2 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-lg transition-colors font-medium"
          >
            📥 Import Vimeo
          </Link>
          <a
            href={`/api/seed/exercises?secret=${process.env.CRON_SECRET ?? ""}`}
            target="_blank"
            className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700 rounded-lg transition-colors"
          >
            + Alimenter
          </a>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {FILTER_GROUPS.map((g) => (
          <Link
            key={g}
            href={g === "Tous" ? "/exercices" : `/exercices?cat=${encodeURIComponent(g)}`}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              (g === "Tous" && !cat) || cat === g
                ? "bg-brand-500/10 text-brand-400 border-brand-500/30"
                : "bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200"
            }`}
          >
            {g}
          </Link>
        ))}
      </div>

      {/* Formulaire ajout */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-4">Ajouter un exercice</h2>
        <form action={createExercise} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Nom *</label>
              <input name="name" required placeholder="ex: Développé couché"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Vidéo Vimeo (optionnel)</label>
              <input name="vimeoVideoId" placeholder="ID de la vidéo"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Description (optionnel)</label>
            <textarea name="description" rows={2} placeholder="Instructions d'exécution..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors resize-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-2">Groupes musculaires</label>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {MUSCLE_GROUPS.map((m) => (
                <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" name="muscles" value={m}
                    className="rounded border-gray-600 bg-gray-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-0" />
                  <span className="text-sm text-gray-300">{m}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit"
              className="px-5 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors">
              Ajouter l&apos;exercice
            </button>
          </div>
        </form>
      </div>

      {/* Liste */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {exercises.length === 0 ? (
          <div className="py-16 text-center text-gray-600 text-sm">Aucun exercice dans cette catégorie</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-5 py-3">Exercice</th>
                <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-5 py-3">Muscles</th>
                <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-5 py-3">Vidéo</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {exercises.map((ex) => (
                <ExerciseRow key={ex.id} ex={ex} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
