"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Les participants qui viennent de terminer le challenge.
 *
 * C'est la liste d'appels à passer, et elle est en haut du tableau de bord
 * pour cette raison. Mais six entrées pliées sur trois lignes chacune
 * occupaient tout l'écran d'un téléphone, et repoussaient hors de vue les
 * repas en attente — qui, eux, concernent des clients payants.
 *
 * Trois visibles, le reste sous un bouton. La limite est volontairement basse :
 * ce bloc doit signaler, pas se substituer à la page des participants.
 */

const VISIBLES = 3;

export type RebootTermine = {
  client_id: string;
  clientName: string;
};

export function RebootTermines({ entrees }: { entrees: RebootTermine[] }) {
  const [tout, setTout] = useState(false);
  const affichees = tout ? entrees : entrees.slice(0, VISIBLES);
  const reste = entrees.length - affichees.length;

  return (
    <div className="bg-gray-900 rounded-xl border border-yellow-500/30 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400" />
        </span>
        <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wide">
          🏆 Challenge Reboot terminé ({entrees.length})
        </h2>
      </div>

      <div className="space-y-2">
        {affichees.map((n) => (
          <Link
            key={n.client_id}
            href={`/app-clients/${n.client_id}`}
            className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3 hover:bg-gray-750 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
              <span className="text-yellow-400 font-bold text-xs">
                {n.clientName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium">{n.clientName}</p>
              <p className="text-xs text-gray-500">
                A terminé le Reboot 40+ — moment idéal pour l&apos;appel 🎯
              </p>
            </div>
            <span className="text-xs text-yellow-400 font-semibold shrink-0">Contacter →</span>
          </Link>
        ))}
      </div>

      {entrees.length > VISIBLES && (
        <button
          type="button"
          onClick={() => setTout((v) => !v)}
          className="mt-3 w-full rounded-lg border border-gray-800 py-2 text-xs font-semibold text-gray-400 transition-colors hover:border-yellow-500/30 hover:text-yellow-400"
        >
          {tout ? "Réduire" : `Voir les ${reste} autres`}
        </button>
      )}
    </div>
  );
}
