"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Confirmation, useConfirmation } from "@/components/ui/Confirmation";
import { ConsignesSuggerees } from "@/components/templates/ConsignesSuggerees";
import {
  chercherDansBibliotheque,
  ajouterExerciceDepuisBibliotheque,
  type ExerciceBibliotheque,
} from "@/app/templates/seances/[id]/actions";

/**
 * Ajouter un exercice à une séance type, en le choisissant dans la
 * bibliothèque.
 *
 * Le nom était saisi à la main. Une faute de frappe, un accent écrit
 * autrement, une apostrophe typographique — et le rattachement échoue au
 * moment de l'attribution : le client voit un exercice sans vidéo ni
 * description, et rien n'explique pourquoi. Ces trois pièges ont déjà coûté
 * plusieurs jours sur ce projet.
 *
 * En choisissant dans la liste, le nom enregistré est exactement celui de la
 * bibliothèque. Le rattachement ne peut plus échouer.
 *
 * Les exercices sans vidéo restent proposés mais signalés : le coach doit voir
 * qu'il en manque une maintenant, pas le découvrir chez son client.
 */
export function AjouterDepuisBibliotheque({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<ExerciceBibliotheque[]>([]);
  const [cherche, setCherche] = useState(false);
  const [choisi, setChoisi] = useState<ExerciceBibliotheque | null>(null);

  const [series, setSeries] = useState("3");
  const [reps, setReps] = useState("12");
  const [repos, setRepos] = useState("90");
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const { message, confirmer } = useConfirmation();

  function chercher(valeur: string) {
    setRecherche(valeur);
    setErreur(null);
    if (valeur.trim().length < 2) {
      setResultats([]);
      return;
    }
    setCherche(true);
    startTransition(async () => {
      setResultats(await chercherDansBibliotheque(valeur));
      setCherche(false);
    });
  }

  function ajouter() {
    if (!choisi) return;
    setErreur(null);
    startTransition(async () => {
      const r = await ajouterExerciceDepuisBibliotheque(templateId, choisi.nom, {
        series: parseInt(series, 10) || 3,
        reps: reps.trim() || "12",
        repos: parseInt(repos, 10) || 90,
        note,
      });
      if (!r.ok) {
        setErreur(r.erreur ?? "Erreur");
        return;
      }
      const ajoute = choisi.nom;
      setChoisi(null);
      setRecherche("");
      setResultats([]);
      setNote("");
      // Le formulaire se vide après l'ajout : sans un mot, rien ne distingue
      // « ajouté » de « le clic n'a pas pris ».
      confirmer(`« ${ajoute} » ajouté à la séance`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-700 bg-gray-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-white">Ajouter un exercice</h2>
        <Confirmation message={message} />
      </div>

      {!choisi ? (
        <>
          <input
            value={recherche}
            onChange={(e) => chercher(e.target.value)}
            placeholder="Chercher dans la bibliothèque — ex : tirage, développé, leg…"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-brand-500 focus:outline-none"
          />

          {recherche.trim().length >= 2 && (
            <div className="max-h-72 space-y-1.5 overflow-y-auto">
              {cherche && <p className="text-xs text-gray-600">Recherche…</p>}
              {!cherche && resultats.length === 0 && (
                <p className="text-xs text-gray-600">
                  Aucun exercice trouvé. Il faut d&apos;abord le créer dans la bibliothèque.
                </p>
              )}
              {resultats.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => setChoisi(ex)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-800 px-3 py-2.5 text-left transition-colors hover:border-brand-500/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">{ex.nom}</span>
                    {ex.muscles.length > 0 && (
                      <span className="block truncate text-xs text-gray-600">
                        {ex.muscles.join(" · ")}
                      </span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 text-xs ${ex.aVideo ? "text-green-400" : "text-orange-400"}`}
                  >
                    {ex.aVideo ? "vidéo" : "sans vidéo"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-brand-500/40 bg-brand-500/5 px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
              {choisi.nom}
            </span>
            <button
              onClick={() => setChoisi(null)}
              className="shrink-0 text-xs text-gray-400 hover:text-white"
            >
              Changer
            </button>
          </div>

          {!choisi.aVideo && (
            /* Dit maintenant plutôt que découvert chez le client, où il n'y a
               plus rien à faire sinon s'excuser. */
            <p className="text-xs text-orange-400">
              Cet exercice n&apos;a pas de vidéo. Le client le verra sans démonstration.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-1.5 text-xs text-gray-400">
              Séries
              <input
                value={series}
                onChange={(e) => setSeries(e.target.value)}
                inputMode="numeric"
                className="w-14 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-center text-sm text-white focus:border-brand-500 focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-400">
              Reps
              <input
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="w-24 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-center text-sm text-white focus:border-brand-500 focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-400">
              Repos (s)
              <input
                value={repos}
                onChange={(e) => setRepos(e.target.value)}
                inputMode="numeric"
                className="w-16 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-center text-sm text-white focus:border-brand-500 focus:outline-none"
              />
            </label>
          </div>

          {/* Une zone et non une ligne : la consigne fait souvent trois
              phrases, et on ne relit pas ce qu'on ne voit pas. */}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Consigne affichée sous l'exercice (facultatif)"
            className="w-full resize-y rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-brand-500 focus:outline-none"
          />

          <ConsignesSuggerees valeur={note} onChoisir={setNote} />

          {erreur && <p className="text-sm text-red-400">{erreur}</p>}

          <button
            onClick={ajouter}
            disabled={isPending}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-50"
          >
            {isPending ? "Ajout…" : "Ajouter à la séance"}
          </button>
        </div>
      )}
    </div>
  );
}
