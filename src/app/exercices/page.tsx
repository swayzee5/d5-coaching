export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { createExercise, deleteExercise, toggleFavorite } from "./actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Bibliothèque d'exercices — D5 CRM" };

const MUSCLE_GROUPS = [
  "Abdominaux", "Abdominaux obliques", "Abducteurs", "Adducteurs",
  "Avant-bras", "Biceps", "Dos", "Épaules", "Fessiers",
  "Ischio-jambiers", "Lombaire", "Mollets", "Pectoraux",
  "Quadriceps", "Trapèze", "Triceps",
];

const EQUIPMENT_LIST = [
  "Haltères", "Barre", "Machines", "Élastiques",
  "Sangles (TRX)", "Ballon suisse", "Roulette abdos",
  "Kettlebell", "Corde à sauter",
];

export default async function ExercicesPage() {
  const exercises = await db.exerciseLibrary.findMany({
    orderBy: [{ isFavorite: "desc" }, { name: "asc" }],
  });

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Bibliothèque d&apos;exercices</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {exercises.length} exercice{exercises.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Formulaire de création */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-4">Ajouter un exercice</h2>
        <form action={createExercise} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Nom *</label>
              <input
                name="name"
                required
                placeholder="ex: Développé couché"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Vidéo Vimeo (optionnel)</label>
              <input
                name="vimeoVideoId"
                placeholder="ID de la vidéo"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Description (optionnel)</label>
            <textarea
              name="description"
              rows={2}
              placeholder="Instructions d&apos;exécution..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Muscles sollicités</label>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {MUSCLE_GROUPS.map((m) => (
                <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" name="muscles" value={m}
                    className="rounded border-gray-600 bg-gray-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-0" />
                  <span className="text-sm text-gray-300">{m}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Équipement nécessaire <span className="text-gray-600">(laisser vide = sans équipement)</span></label>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {EQUIPMENT_LIST.map((e) => (
                <label key={e} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" name="equipment" value={e}
                    className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0" />
                  <span className="text-sm text-gray-300">{e}</span>
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
          <div className="py-16 text-center text-gray-600 text-sm">
            Aucun exercice dans la bibliothèque
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-5 py-3">Exercice</th>
                <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-5 py-3">Muscles</th>
                <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-5 py-3">Équipement</th>
                <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-5 py-3">Vidéo</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {exercises.map((ex) => (
                <tr key={ex.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <form action={toggleFavorite.bind(null, ex.id, ex.isFavorite)}>
                        <button type="submit" title={ex.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                          className="text-base hover:scale-110 transition-transform">
                          {ex.isFavorite ? "⭐" : "☆"}
                        </button>
                      </form>
                      <div>
                        <p className="font-medium text-white">{ex.name}</p>
                        {ex.description && (
                          <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{ex.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {ex.muscles.length === 0 ? (
                        <span className="text-gray-600 text-xs">—</span>
                      ) : ex.muscles.map((m) => (
                        <span key={m} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300">{m}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {ex.equipment.length === 0 ? (
                        <span className="px-2 py-0.5 bg-green-500/10 rounded text-xs text-green-400">Sans équipement</span>
                      ) : ex.equipment.map((e) => (
                        <span key={e} className="px-2 py-0.5 bg-blue-500/10 rounded text-xs text-blue-400 border border-blue-500/20">{e}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {ex.vimeoVideoId ? (
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">✓ Vimeo</span>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <ConfirmButton
                      action={deleteExercise.bind(null, ex.id)}
                      message={`Supprimer « ${ex.name} » ?`}
                      className="text-xs text-gray-600 hover:text-red-400 disabled:opacity-40 transition-colors">
                      Supprimer
                    </ConfirmButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
