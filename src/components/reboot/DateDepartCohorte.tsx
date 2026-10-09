"use client";

import { useState, useTransition } from "react";
import { setCohorteStartDate } from "@/app/app-clients/[id]/actions";

/**
 * Pose la date de départ du challenge sur toute la cohorte.
 *
 * C'est elle qui commande les relances. Le coach a treize participants et une
 * seule date : la régler une fois pour tout le groupe est le geste réel, et
 * treize réglages individuels un dimanche soir sont treize occasions de se
 * tromper.
 *
 * Un lundi est proposé par défaut, parce que c'est ainsi que les cohortes
 * démarrent et que le calendrier des relances y est calé : lundi, mercredi,
 * dimanche, lundi.
 */
export function DateDepartCohorte({ dateActuelle }: { dateActuelle: string | null }) {
  const [date, setDate] = useState(dateActuelle ?? prochainLundi());
  const [resultat, setResultat] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const jour = date ? new Date(`${date}T12:00:00Z`).getUTCDay() : 1;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-white">Départ du challenge</p>
        <p className="mt-0.5 text-xs text-gray-500">
          Commande les relances : première séance le jour même, mini-point à J+2,
          bilan à J+6, dernière relance à J+7.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => { setDate(e.target.value); setResultat(null); }}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
        />
        <button
          onClick={() =>
            startTransition(async () => {
              const r = await setCohorteStartDate(date);
              if ("ok" in r) {
                const n = r.participants ?? 0;
                setResultat(`Appliqué à ${n} participant${n > 1 ? "s" : ""}`);
              } else {
                setResultat(r.error ?? "Erreur");
              }
            })
          }
          disabled={!date || isPending}
          className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "…" : "Appliquer à toute la cohorte"}
        </button>
      </div>

      {jour !== 1 && (
        <p className="text-xs text-amber-400">
          Ce n&apos;est pas un lundi. Le calendrier fonctionne quand même, mais le
          bilan tombera un {["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"][(jour + 6) % 7]}.
        </p>
      )}

      {resultat && <p className="text-xs text-green-400">{resultat}</p>}
    </div>
  );
}

/** Le lundi à venir, ou aujourd'hui si on est lundi. */
function prochainLundi(): string {
  const d = new Date();
  const delta = (8 - d.getDay()) % 7;
  d.setDate(d.getDate() + (delta === 0 ? 0 : delta));
  return d.toISOString().slice(0, 10);
}
