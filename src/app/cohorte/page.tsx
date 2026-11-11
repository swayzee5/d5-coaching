export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Metadata } from "next";
import {
  cohorteEnCours,
  cequiManque,
  LIBELLES,
  ETAPES_TOTAL,
  JOURS_AVANT_DECROCHAGE,
  type Participant,
} from "@/lib/cohorte";
import { pourWhatsapp } from "@/lib/telephone";

export const metadata: Metadata = { title: "Cohorte en cours" };

/**
 * Qui décroche, et depuis combien de jours.
 *
 * La page Fin de parcours regarde ceux qui ont terminé. Celle-ci regarde les
 * autres — ceux qu'on ne voit nulle part aujourd'hui, et qui sont pourtant
 * les plus nombreux : dix sur treize à la première cohorte.
 *
 * L'ordre n'est pas alphabétique. Ce sont les décrochés d'abord, puis ceux
 * qui n'ont jamais commencé, puis les autres. Une liste triée par prénom
 * oblige à chercher ; une liste triée par urgence se lit en trois secondes
 * entre deux rendez-vous.
 */

const ORDRE: Record<string, number> = {
  decroche: 0,
  jamais_commence: 1,
  en_route: 2,
  termine: 3,
};

export default async function CohortePage() {
  let participants: Participant[] = [];
  let panne: string | null = null;
  try {
    participants = await cohorteEnCours();
  } catch (err) {
    // L'erreur s'affiche. Avalée, elle donnerait une page vide — c'est-à-dire
    // « tout le monde va bien », le message le plus faux possible.
    panne = String(err).slice(0, 300);
  }

  const tries = [...participants].sort(
    (a, b) => (ORDRE[a.etat] ?? 9) - (ORDRE[b.etat] ?? 9) || (b.joursSansAction ?? 0) - (a.joursSansAction ?? 0)
  );

  const compte = (etat: string) => participants.filter((p) => p.etat === etat).length;
  const aRelancer = compte("decroche") + compte("jamais_commence");

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
        ← Dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">Cohorte en cours</h1>
        <p className="mt-1 text-sm text-gray-400">
          {aRelancer === 0
            ? "Personne n'a décroché. Rien à faire aujourd'hui."
            : `${aRelancer} personne${aRelancer > 1 ? "s" : ""} à relancer.`}
        </p>
      </div>

      {panne && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          La liste n&apos;a pas pu être calculée : {panne}
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {(["decroche", "jamais_commence", "en_route", "termine"] as const).map((etat) => (
          <div key={etat} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <p className="text-2xl font-black text-white">{compte(etat)}</p>
            <p className="mt-0.5 text-xs text-gray-500">{LIBELLES[etat].texte}</p>
          </div>
        ))}
      </div>

      {tries.length === 0 && !panne && (
        <p className="py-10 text-center text-sm text-gray-600">Aucun participant actif.</p>
      )}

      <div className="space-y-2">
        {tries.map((p) => {
          const manque = cequiManque(p);
          const tel = p.telephone ? pourWhatsapp(p.telephone) : null;
          return (
            <div
              key={p.clientId}
              className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/app-clients/${p.clientId}`}
                    className="text-sm font-semibold text-white hover:text-brand-400"
                  >
                    {p.prenom} {p.nom}
                  </Link>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {p.jour !== null ? `Jour ${p.jour} du challenge` : "Aucune date de départ posée"}
                    {" · "}
                    {p.etapes}/{ETAPES_TOTAL} étapes
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${LIBELLES[p.etat].classe}`}
                >
                  {LIBELLES[p.etat].texte}
                </span>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${Math.round((p.etapes / ETAPES_TOTAL) * 100)}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>
                  {p.derniereAction
                    ? p.joursSansAction === 0
                      ? "Actif aujourd'hui"
                      : `Rien depuis ${p.joursSansAction} jour${(p.joursSansAction ?? 0) > 1 ? "s" : ""}`
                    : "Aucune action enregistrée"}
                </span>
                {manque.length > 0 && <span>Il manque {manque.join(", ")}</span>}
                {p.bilanFait && <span className="text-green-500">Bilan rempli</span>}
              </div>

              {/* Le lien de relance est sur la ligne de la personne : chercher
                  son numéro ailleurs est précisément ce qui fait qu'on ne
                  relance pas. */}
              {(p.etat === "decroche" || p.etat === "jamais_commence") && (
                <div className="pt-1">
                  {tel ? (
                    <a
                      href={`https://wa.me/${tel}?text=${encodeURIComponent(
                        p.etat === "jamais_commence"
                          ? `Salut ${p.prenom}, je vois que tu n'as pas encore démarré. Qu'est-ce qui coince ?`
                          : `Salut ${p.prenom}, je vois que tu t'es arrêté. Qu'est-ce qui a coincé ?`
                      )}`}
                      target="_blank"
                      rel="noopener"
                      className="inline-block rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-400"
                    >
                      Relancer sur WhatsApp →
                    </a>
                  ) : (
                    <Link
                      href={`/app-clients/${p.clientId}`}
                      className="text-xs text-orange-400 hover:text-orange-300"
                    >
                      Aucun numéro enregistré — à renseigner sur sa fiche
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-600">
        « Décroché » veut dire : a commencé, n&apos;a pas fini, et n&apos;a rien
        fait depuis plus de {JOURS_AVANT_DECROCHAGE} jours. Les séances bonus ne
        comptent pas, comme dans l&apos;application.
      </p>
    </div>
  );
}
