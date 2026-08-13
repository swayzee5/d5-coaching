"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExercise } from "@/app/exercices/actions";

export type ExerciseForEdit = {
  id: string;
  name: string;
  description: string | null;
  muscles: string[];
  vimeo_video_id: string | null;
  generated_video_url: string | null;
};

// Le nom devient un bouton qui deplie, sous lui, la description, la video et le
// formulaire d'edition. Tout tient dans la premiere cellule : pas de seconde
// <tr> a inserer dans le <tbody> de la page serveur.
export function ExerciseDetails({
  ex,
  muscleGroups,
}: {
  ex: ExerciseForEdit;
  muscleGroups: string[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function save(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateExercise(formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-start gap-2 text-left w-full group"
      >
        <span
          className={`text-gray-600 text-xs mt-1 transition-transform ${open ? "rotate-90" : ""}`}
        >
          ▶
        </span>
        <span className="min-w-0">
          <span className="block font-medium text-white group-hover:text-brand-400 transition-colors">
            {ex.name}
          </span>
          {ex.description && !open && (
            <span className="block text-gray-500 text-xs mt-0.5 line-clamp-1">
              {ex.description}
            </span>
          )}
        </span>
      </button>

      {open && (
        <div className="mt-3 pl-5 space-y-3">
          {editing ? (
            <form action={save} className="space-y-3">
              <input type="hidden" name="id" value={ex.id} />
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nom</label>
                <input
                  name="name"
                  defaultValue={ex.name}
                  required
                  autoFocus
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea
                  name="description"
                  defaultValue={ex.description ?? ""}
                  rows={3}
                  placeholder="Instructions d'exécution..."
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Groupes musculaires</label>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {muscleGroups.map((m) => (
                    <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        name="muscles"
                        value={m}
                        defaultChecked={ex.muscles.includes(m)}
                        className="rounded border-gray-600 bg-gray-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
                      />
                      <span className="text-xs text-gray-300">{m}</span>
                    </label>
                  ))}
                </div>
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {isPending ? "Enregistrement..." : "✓ Enregistrer"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 rounded-lg transition-colors"
              >
                ✏ Modifier les infos
              </button>

              {ex.description ? (
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {ex.description}
                </p>
              ) : (
                <p className="text-gray-600 text-xs">Aucune description.</p>
              )}

              {ex.vimeo_video_id && (
                <div className="rounded-xl overflow-hidden" style={{ maxWidth: 420 }}>
                  <div style={{ padding: "56.25% 0 0 0", position: "relative" }}>
                    <iframe
                      src={`https://player.vimeo.com/video/${ex.vimeo_video_id}?badge=0&autopause=0`}
                      allow="autoplay; fullscreen; picture-in-picture"
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                      title={ex.name}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
