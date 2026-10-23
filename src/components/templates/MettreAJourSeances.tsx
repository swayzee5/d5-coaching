"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Confirmation, useConfirmation } from "@/components/ui/Confirmation";
import {
  resynchroniserSeances,
  type SeanceAttribuee,
} from "@/app/templates/actions";

/**
 * Pousser les corrections du modèle vers les séances déjà attribuées.
 *
 * L'attribution copie : c'est ce qui permet d'ajuster la séance d'un client
 * sans toucher à celle des autres. Mais corriger le modèle ne changeait rien
 * chez ceux qui l'avaient déjà reçu, et la seule façon de leur transmettre la
 * correction était de supprimer la séance et de la réattribuer — en perdant
 * sa place dans le programme.
 *
 * Le choix est explicite, client par client, et deux choses sont dites avant
 * de cliquer plutôt qu'après :
 *
 *   - ce qui sera écrasé : les ajustements faits pour ce client sur cette
 *     séance ;
 *   - ce qui ne l'est pas : l'historique des charges, rattaché à l'exercice
 *     de bibliothèque et non à la ligne de séance.
 */
export function MettreAJourSeances({
  templateId,
  seances,
}: {
  templateId: string;
  seances: SeanceAttribuee[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const [choisies, setChoisies] = useState<string[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const { message, confirmer } = useConfirmation();

  if (seances.length === 0) return null;

  function basculer(id: string) {
    setChoisies((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  function pousser() {
    setErreur(null);
    startTransition(async () => {
      const r = await resynchroniserSeances(templateId, choisies);
      if (!r.ok) {
        setErreur(r.erreur ?? "Erreur");
        return;
      }
      confirmer(
        `${r.faites} séance${(r.faites ?? 0) > 1 ? "s" : ""} mise${(r.faites ?? 0) > 1 ? "s" : ""} à jour`
      );
      setChoisies([]);
      setOuvert(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:border-gray-600 hover:text-white"
        >
          Mettre à jour {seances.length} séance{seances.length > 1 ? "s" : ""} attribuée
          {seances.length > 1 ? "s" : ""}
        </button>
        <Confirmation message={message} />
      </div>

      {erreur && <p className="text-sm text-red-400">{erreur}</p>}

      {ouvert && (
        <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-950 p-4">
          <p className="text-xs leading-relaxed text-gray-400">
            Le contenu de ces séances sera remplacé par celui de ce modèle. Les
            ajustements que tu aurais faits pour un client sur sa séance seront
            perdus.{" "}
            <span className="text-gray-300">
              L&apos;historique des charges, lui, est conservé
            </span>{" "}
            — il est rattaché à l&apos;exercice, pas à la ligne de séance.
          </p>

          <div className="space-y-1.5">
            {seances.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-800 px-3 py-2.5 transition-colors hover:border-gray-700"
              >
                <input
                  type="checkbox"
                  checked={choisies.includes(s.id)}
                  onChange={() => basculer(s.id)}
                  className="rounded border-gray-600 bg-gray-800 text-brand-500 focus:ring-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">{s.client}</span>
                  <span className="block truncate text-xs text-gray-600">
                    {s.programme} · {s.exercices} exercices
                    {s.parLeNom && " · rapprochée par le nom"}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {seances.some((s) => s.parLeNom) && (
            /* Un rapprochement par le nom peut se tromper : deux séances
               différentes peuvent porter le même. Il est montré, jamais
               présumé. */
            <p className="text-xs text-orange-400">
              Les séances « rapprochées par le nom » ont été attribuées avant que
              la provenance soit enregistrée. Vérifie qu&apos;il s&apos;agit bien de
              celle-ci avant de la cocher.
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={pousser}
              disabled={isPending || choisies.length === 0}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-40"
            >
              {isPending ? "Mise à jour…" : `Mettre à jour (${choisies.length})`}
            </button>
            <button
              type="button"
              onClick={() => setChoisies(seances.map((s) => s.id))}
              className="text-xs text-gray-500 transition-colors hover:text-white"
            >
              Tout cocher
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
