"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Confirmation, useConfirmation } from "@/components/ui/Confirmation";
import {
  modifierExerciceTemplate,
  chercherDansBibliotheque,
  type ExerciceBibliotheque,
} from "@/app/templates/seances/[id]/actions";

/**
 * Modifier un exercice déjà posé dans une séance type.
 *
 * Jusqu'ici il fallait supprimer et rajouter pour corriger trois répétitions.
 * La ligne repartait en fin de séance, et l'ordre — ce qui est fait frais, ce
 * qui est fait fatigué — était à refaire à la main. Personne ne corrige à ce
 * prix-là : on laisse l'erreur.
 *
 * Le remplacement de l'exercice est ici plutôt que dans un bouton séparé pour
 * la même raison : changer un exercice sans perdre sa place est le geste
 * courant quand une machine est prise ou qu'une vidéo manque. Le nouveau nom
 * vient de la bibliothèque, jamais d'une saisie — c'est lui qui garantit la
 * vidéo chez le client.
 */
export function ModifierExercice({
  exerciceId,
  templateId,
  nom,
  series,
  reps,
  repos,
  note,
}: {
  exerciceId: string;
  templateId: string;
  nom: string;
  series: number;
  reps: string;
  repos: number;
  note: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [ouvert, setOuvert] = useState(false);
  const [vNom, setVNom] = useState(nom);
  const [vSeries, setVSeries] = useState(String(series));
  const [vReps, setVReps] = useState(reps);
  const [vRepos, setVRepos] = useState(String(repos));
  const [vNote, setVNote] = useState(note ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const { message, confirmer } = useConfirmation();

  const [remplace, setRemplace] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<ExerciceBibliotheque[]>([]);

  function annuler() {
    // Les valeurs reviennent à ce qui est enregistré : fermer après avoir
    // tapé ne doit pas laisser croire que c'est sauvegardé.
    setVNom(nom);
    setVSeries(String(series));
    setVReps(reps);
    setVRepos(String(repos));
    setVNote(note ?? "");
    setRemplace(false);
    setRecherche("");
    setResultats([]);
    setErreur(null);
    setOuvert(false);
  }

  function chercher(valeur: string) {
    setRecherche(valeur);
    if (valeur.trim().length < 2) {
      setResultats([]);
      return;
    }
    startTransition(async () => setResultats(await chercherDansBibliotheque(valeur)));
  }

  function enregistrer() {
    setErreur(null);
    startTransition(async () => {
      const r = await modifierExerciceTemplate(exerciceId, templateId, {
        nom: vNom,
        series: parseInt(vSeries, 10) || 1,
        reps: vReps.trim() || "12",
        repos: parseInt(vRepos, 10) || 0,
        note: vNote,
      });
      if (!r.ok) {
        setErreur(r.erreur ?? "Erreur");
        return;
      }
      setOuvert(false);
      setRemplace(false);
      setRecherche("");
      setResultats([]);
      // Dite après la fermeture, donc à côté du bouton « Modifier » : c'est
      // là que les yeux reviennent, et une confirmation qu'on ne voit pas ne
      // confirme rien.
      confirmer("Exercice enregistré");
      router.refresh();
    });
  }

  if (!ouvert) {
    return (
      <div className="mt-1.5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="inline-flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-brand-400"
        >
          <span>✎</span> Modifier
        </button>
        <Confirmation message={message} />
      </div>
    );
  }

  return (
    <div className="mt-3 w-full space-y-3 rounded-lg border border-brand-500/30 bg-gray-950/60 p-3">
      {remplace ? (
        <div className="space-y-2">
          <input
            autoFocus
            value={recherche}
            onChange={(e) => chercher(e.target.value)}
            placeholder="Chercher le remplaçant dans la bibliothèque…"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-brand-500 focus:outline-none"
          />
          <div className="max-h-56 space-y-1.5 overflow-y-auto">
            {recherche.trim().length >= 2 && resultats.length === 0 && (
              <p className="text-xs text-gray-600">Aucun exercice trouvé.</p>
            )}
            {resultats.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => {
                  setVNom(ex.nom);
                  setRemplace(false);
                  setRecherche("");
                  setResultats([]);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-800 px-3 py-2 text-left transition-colors hover:border-brand-500/40"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-white">{ex.nom}</span>
                <span
                  className={`shrink-0 text-xs ${ex.aVideo ? "text-green-400" : "text-orange-400"}`}
                >
                  {ex.aVideo ? "vidéo" : "sans vidéo"}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRemplace(false)}
            className="text-xs text-gray-500 hover:text-white"
          >
            Garder « {vNom} »
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{vNom}</span>
          <button
            type="button"
            onClick={() => setRemplace(true)}
            className="shrink-0 text-xs text-gray-400 hover:text-white"
          >
            Remplacer l&apos;exercice
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-1.5 text-xs text-gray-400">
          Séries
          <input
            value={vSeries}
            onChange={(e) => setVSeries(e.target.value)}
            inputMode="numeric"
            className="w-14 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-center text-sm text-white focus:border-brand-500 focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-400">
          Reps
          <input
            value={vReps}
            onChange={(e) => setVReps(e.target.value)}
            className="w-24 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-center text-sm text-white focus:border-brand-500 focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-400">
          Repos (s)
          <input
            value={vRepos}
            onChange={(e) => setVRepos(e.target.value)}
            inputMode="numeric"
            className="w-16 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-center text-sm text-white focus:border-brand-500 focus:outline-none"
          />
        </label>
      </div>

      <textarea
        value={vNote}
        onChange={(e) => setVNote(e.target.value)}
        rows={2}
        placeholder="Consigne affichée sous l'exercice (vide : la description de la bibliothèque)"
        className="w-full resize-y rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-brand-500 focus:outline-none"
      />

      {erreur && <p className="text-sm text-red-400">{erreur}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={enregistrer}
          disabled={isPending}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-50"
        >
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={annuler}
          className="text-xs text-gray-500 transition-colors hover:text-white"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
