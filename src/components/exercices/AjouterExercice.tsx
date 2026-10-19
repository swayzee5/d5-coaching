"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExercise } from "@/app/exercices/actions";

/**
 * Le formulaire d'ajout d'un exercice.
 *
 * Il était un simple formulaire HTML pointant sur l'action serveur :
 * l'exercice était bien créé, mais rien ne le disait. La liste compte plus de
 * deux cents entrées et la nouvelle atterrissait hors de l'écran, souvent
 * dans une catégorie filtrée différente. Résultat : on ne savait pas si le
 * clic avait été pris en compte, et on ajoutait deux fois.
 *
 * Trois retours, qui règlent chacun un moment distinct : le bouton dit que
 * l'envoi est en cours, un bandeau nomme l'exercice créé, et le formulaire se
 * vide — un formulaire encore rempli après un envoi réussi est le signal le
 * plus trompeur qui soit.
 */
export function AjouterExercice({ muscleGroups }: { muscleGroups: string[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [ajoute, setAjoute] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  function envoyer(formData: FormData) {
    setErreur(null);
    setAjoute(null);
    startTransition(async () => {
      const r = await createExercise(formData);
      if (!r.ok) {
        setErreur(r.erreur);
        return;
      }
      setAjoute(r.nom);
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="font-semibold text-white mb-4">Ajouter un exercice</h2>

      {ajoute && (
        <div className="mb-4 rounded-lg border border-green-500/40 bg-green-500/5 px-4 py-3">
          <p className="text-sm font-medium text-green-400">
            « {ajoute} » ajouté à la bibliothèque
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            Il apparaît dans la liste ci-dessous, et dans toutes les séances Reboot où son
            nom figure.
          </p>
        </div>
      )}

      {erreur && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3">
          <p className="text-sm text-red-400">{erreur}</p>
        </div>
      )}

      <form ref={formRef} action={envoyer} className="space-y-4">
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
            placeholder="Instructions d'exécution..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors resize-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-2">Groupes musculaires</label>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {muscleGroups.map((m) => (
              <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  name="muscles"
                  value={m}
                  className="rounded border-gray-600 bg-gray-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
                />
                <span className="text-sm text-gray-300">{m}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isPending ? "Ajout en cours…" : "Ajouter l'exercice"}
          </button>
        </div>
      </form>
    </div>
  );
}
