"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Confirmation, useConfirmation } from "@/components/ui/Confirmation";
import {
  ajouterSeanceAuProgramme,
  retirerSeanceDuProgramme,
  deplacerSeanceDuProgramme,
} from "@/app/templates/actions";

/**
 * Composer un programme type : y ajouter des séances, les ordonner, en retirer.
 *
 * La page d'un programme était en lecture seule. Le coach ne pouvait donc
 * utiliser que les programmes livrés tels quels — alors que son métier est
 * justement d'assembler des séances selon le client qu'il a en face.
 *
 * Les séances sont copiées à l'ajout, pas référencées : un programme doit
 * pouvoir ajuster une séance sans modifier le modèle ni les autres programmes
 * qui l'utilisent, et supprimer un modèle ne doit pas vider les programmes qui
 * le contenaient.
 */

export type SeanceDuProgramme = { id: string; nom: string; exercices: number };
export type SeanceDisponible = { id: string; nom: string; categorie: string; exercices: number };

export function ComposerProgramme({
  programmeId,
  seances,
  disponibles,
}: {
  programmeId: string;
  seances: SeanceDuProgramme[];
  disponibles: SeanceDisponible[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const { message, confirmer } = useConfirmation();
  const [erreur, setErreur] = useState<string | null>(null);

  /**
   * Chaque geste dit ce qu'il a fait, et dit aussi quand il a échoué.
   *
   * L'échec était avalé : le résultat de l'action n'était pas regardé, et un
   * retrait qui ne passait pas laissait la séance en place sans un mot. On
   * croyait avoir cliqué à côté.
   */
  function agir(action: () => Promise<{ ok: boolean; erreur?: string }>, fait: string) {
    setErreur(null);
    startTransition(async () => {
      const r = await action();
      if (!r.ok) {
        setErreur(r.erreur ?? "Action impossible.");
        return;
      }
      confirmer(fait);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {erreur && <p className="text-sm text-red-400">{erreur}</p>}
      <Confirmation message={message} />
      {seances.length === 0 ? (
        <p className="text-sm text-gray-500">
          Aucune séance dans ce programme. Ajoutes-en une ci-dessous.
        </p>
      ) : (
        seances.map((s, i) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-800 text-xs font-bold text-gray-500">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{s.nom}</p>
              <p className="text-xs text-gray-600">{s.exercices} exercices</p>
            </div>
            <button
              onClick={() => agir(() => deplacerSeanceDuProgramme(s.id, programmeId, "haut"), "Ordre enregistré")}
              disabled={i === 0 || isPending}
              title="Monter"
              className="px-1.5 py-1 text-gray-500 transition-colors hover:text-white disabled:opacity-20"
            >
              ↑
            </button>
            <button
              onClick={() => agir(() => deplacerSeanceDuProgramme(s.id, programmeId, "bas"), "Ordre enregistré")}
              disabled={i === seances.length - 1 || isPending}
              title="Descendre"
              className="px-1.5 py-1 text-gray-500 transition-colors hover:text-white disabled:opacity-20"
            >
              ↓
            </button>
            <button
              onClick={() => agir(() => retirerSeanceDuProgramme(s.id, programmeId), `« ${s.nom} » retirée du programme`)}
              disabled={isPending}
              className="px-2 py-1 text-xs text-red-400 transition-colors hover:text-red-300 disabled:opacity-40"
            >
              Retirer
            </button>
          </div>
        ))
      )}

      {!ouvert ? (
        <button
          onClick={() => setOuvert(true)}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
        >
          + Ajouter une séance
        </button>
      ) : (
        <div className="space-y-2 rounded-xl border border-gray-800 bg-gray-950 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">Quelle séance ?</p>
            <button
              onClick={() => setOuvert(false)}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Fermer
            </button>
          </div>
          {disponibles.length === 0 ? (
            <p className="text-xs text-gray-600">
              Aucune séance type. Crée-en une depuis la page Templates.
            </p>
          ) : (
            <div className="max-h-72 space-y-1.5 overflow-y-auto">
              {disponibles.map((d) => (
                <button
                  key={d.id}
                  onClick={() => agir(() => ajouterSeanceAuProgramme(programmeId, d.id), `« ${d.nom} » ajoutée au programme`)}
                  disabled={isPending}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-800 px-3 py-2.5 text-left transition-colors hover:border-brand-500/40 disabled:opacity-50"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-white">{d.nom}</span>
                  <span className="shrink-0 text-xs text-gray-500">
                    {d.categorie} · {d.exercices} exos
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
