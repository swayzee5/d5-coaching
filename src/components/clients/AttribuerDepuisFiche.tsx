"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { attribuerSeanceAClient, attribuerProgrammeAClient } from "@/app/templates/actions";

/**
 * Attribuer un programme ou une séance type, depuis la fiche d'un client.
 *
 * L'attribution n'existait que dans le sens inverse : choisir un modèle, puis
 * chercher le client. Or l'intention naît le plus souvent en regardant
 * quelqu'un — « lui, il lui faut un bloc jambes ». Obliger à repartir des
 * modèles fait perdre le fil, et c'est ce qui finit par ne plus être fait.
 *
 * Les deux listes sont côte à côte parce que le choix entre « un programme
 * complet » et « une séance de plus » est le vrai choix à faire ici.
 */

export type ModeleProgramme = { id: string; nom: string; semaines: number; seances: number };
export type ModeleSeance = { id: string; nom: string; categorie: string; exercices: number };

export function AttribuerDepuisFiche({
  clientId,
  programmes,
  seances,
  aUnProgramme,
}: {
  clientId: string;
  programmes: ModeleProgramme[];
  seances: ModeleSeance[];
  aUnProgramme: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [onglet, setOnglet] = useState<"programme" | "seance" | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  function poser(action: () => Promise<{ ok: boolean; erreur?: string }>, nom: string) {
    setErreur(null);
    startTransition(async () => {
      const r = await action();
      if (!r.ok) {
        setErreur(r.erreur ?? "Erreur");
        return;
      }
      setFait(nom);
      setOnglet(null);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-300">
        Attribuer un entraînement
      </h2>

      {fait && (
        <div className="mb-3 rounded-lg border border-green-500/40 bg-green-500/5 px-4 py-3">
          <p className="text-sm font-medium text-green-400">« {fait} » attribué</p>
          <p className="mt-0.5 text-xs text-gray-400">Le client le voit dès maintenant.</p>
        </div>
      )}

      {erreur && <p className="mb-3 text-sm text-red-400">{erreur}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setOnglet(onglet === "programme" ? null : "programme")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            onglet === "programme"
              ? "bg-brand-500 text-white"
              : "border border-gray-700 text-gray-300 hover:border-gray-600"
          }`}
        >
          Un programme complet
        </button>
        <button
          onClick={() => setOnglet(onglet === "seance" ? null : "seance")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            onglet === "seance"
              ? "bg-brand-500 text-white"
              : "border border-gray-700 text-gray-300 hover:border-gray-600"
          }`}
        >
          Une séance
        </button>
      </div>

      {onglet === "programme" && (
        <div className="mt-3 space-y-1.5">
          {programmes.length === 0 ? (
            <p className="text-xs text-gray-600">Aucun modèle de programme.</p>
          ) : (
            programmes.map((p) => (
              <button
                key={p.id}
                onClick={() =>
                  poser(() => attribuerProgrammeAClient(p.id, clientId), p.nom)
                }
                disabled={isPending}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-800 px-3 py-2.5 text-left transition-colors hover:border-brand-500/40 disabled:opacity-50"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-white">{p.nom}</span>
                <span className="shrink-0 text-xs text-gray-500">
                  {p.semaines} sem · {p.seances} séances
                </span>
              </button>
            ))
          )}
          {aUnProgramme && (
            /* Un programme de plus ne remplace pas l'ancien : le dire évite
               de croire qu'on a écrasé le travail en cours. */
            <p className="pt-1 text-xs text-gray-600">
              Ce client a déjà un programme actif. Le nouveau s&apos;ajoutera sans le remplacer.
            </p>
          )}
        </div>
      )}

      {onglet === "seance" && (
        <div className="mt-3 max-h-80 space-y-1.5 overflow-y-auto">
          {seances.length === 0 ? (
            <p className="text-xs text-gray-600">Aucune séance type.</p>
          ) : (
            seances.map((s) => (
              <button
                key={s.id}
                onClick={() => poser(() => attribuerSeanceAClient(s.id, clientId), s.nom)}
                disabled={isPending}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-800 px-3 py-2.5 text-left transition-colors hover:border-brand-500/40 disabled:opacity-50"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-white">{s.nom}</span>
                <span className="shrink-0 text-xs text-gray-500">
                  {s.categorie} · {s.exercices} exos
                </span>
              </button>
            ))
          )}
          <p className="pt-1 text-xs text-gray-600">
            {aUnProgramme
              ? "La séance rejoindra son programme actif."
              : "Un programme sera créé pour l'accueillir."}
          </p>
        </div>
      )}
    </div>
  );
}
