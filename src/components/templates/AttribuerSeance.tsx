"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { attribuerSeanceAClient } from "@/app/templates/actions";

/**
 * Attribuer une séance type à un client, depuis la séance elle-même.
 *
 * Les séances types étaient une bibliothèque morte : composables, mais
 * impossibles à donner à quiconque. Le coach recomposait à la main, exercice
 * par exercice, ce qu'il avait déjà écrit.
 *
 * Le geste est là où naît l'intention — en regardant la séance, pas dans un
 * écran d'attribution séparé où il faudrait la retrouver dans une liste.
 */

export type ClientAttribuable = { id: string; nom: string; aUnProgramme: boolean };

export function AttribuerSeance({
  seanceTemplateId,
  clients,
}: {
  seanceTemplateId: string;
  clients: ClientAttribuable[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const [fait, setFait] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  function attribuer(client: ClientAttribuable) {
    setErreur(null);
    startTransition(async () => {
      const r = await attribuerSeanceAClient(seanceTemplateId, client.id);
      if (!r.ok) {
        setErreur(r.erreur ?? "Erreur");
        return;
      }
      setFait(client.nom);
      setOuvert(false);
      router.refresh();
    });
  }

  if (clients.length === 0) {
    return (
      <p className="text-xs text-gray-600">
        Aucun client actif à qui attribuer cette séance.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {fait && (
        <div className="rounded-lg border border-green-500/40 bg-green-500/5 px-4 py-3">
          <p className="text-sm font-medium text-green-400">Séance attribuée à {fait}</p>
          <p className="mt-0.5 text-xs text-gray-400">
            Elle a rejoint son programme actif. Il la voit dès maintenant dans l&apos;app.
          </p>
        </div>
      )}

      {erreur && <p className="text-sm text-red-400">{erreur}</p>}

      {!ouvert ? (
        <button
          onClick={() => setOuvert(true)}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
        >
          Attribuer à un client
        </button>
      ) : (
        <div className="space-y-2 rounded-xl border border-gray-800 bg-gray-950 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">À qui ?</p>
            <button
              onClick={() => setOuvert(false)}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Annuler
            </button>
          </div>
          <div className="space-y-1.5">
            {clients.map((c) => (
              <button
                key={c.id}
                onClick={() => attribuer(c)}
                disabled={isPending}
                className="flex w-full items-center justify-between rounded-lg border border-gray-800 px-3 py-2.5 text-left transition-colors hover:border-brand-500/40 disabled:opacity-50"
              >
                <span className="text-sm text-white">{c.nom}</span>
                {/* Dire ce qui va se passer : sans programme, on en crée un.
                    Le coach doit le savoir avant de cliquer, pas après. */}
                <span className="text-xs text-gray-500">
                  {c.aUnProgramme ? "→ programme actif" : "→ nouveau programme"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
