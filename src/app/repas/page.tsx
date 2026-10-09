export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { CarteRepasCoach, type RepasCoach } from "@/components/repas/CarteRepasCoach";
import { MarquerVus } from "@/components/repas/MarquerVus";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Repas" };

/**
 * La file des repas photographiés.
 *
 * Elle existe pour une raison précise : l'app cliente affiche « Vu par Daye »
 * puis « Répondu ». Sans un endroit où ces repas s'empilent visiblement, cette
 * promesse se retournerait contre le coach — un client verrait que sa photo a
 * été vue et jamais commentée, ce qui est pire que l'absence de suivi.
 *
 * Les repas en attente d'abord, les plus anciens en haut : ce sont eux qui
 * coûtent un client. Les repas déjà traités restent consultables en dessous,
 * parce que la réponse donnée hier est le contexte de celle d'aujourd'hui.
 */
export default async function RepasPage() {
  const lignes = await db.mealLog
    .findMany({
      orderBy: { createdAt: "asc" },
      take: 200,
      include: { client: { select: { id: true, firstName: true, lastName: true } } },
    })
    .catch(() => []);

  const maintenant = Date.now();
  const versCarte = (l: (typeof lignes)[number]): RepasCoach => ({
    id: l.id,
    clientId: l.client.id,
    clientNom: `${l.client.firstName} ${l.client.lastName}`.trim(),
    photoUrl: `/api/repas/photo/${l.id}`,
    noteClient: l.noteClient,
    // Le JSON de la base n'est pas typé : il vient d'une colonne JSONB écrite
    // par l'autre application, et son contenu peut dater d'une version
    // antérieure du schéma d'analyse.
    analyse: (l.analyseAuto as RepasCoach["analyse"]) ?? null,
    analyseErreur: l.analyseErreur,
    coachReply: l.coachReply,
    createdAt: l.createdAt.toISOString(),
    heures: Math.floor((maintenant - l.createdAt.getTime()) / 3_600_000),
  });

  const enAttente = lignes.filter((l) => !l.coachRepliedAt).map(versCarte);
  const traites = lignes
    .filter((l) => l.coachRepliedAt)
    .reverse()
    .slice(0, 20)
    .map(versCarte);

  const enRetard = enAttente.filter((r) => r.heures >= 24).length;
  const aMarquer = lignes.filter((l) => !l.coachSeenAt).map((l) => l.id);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Repas</h1>
          <p className="mt-1 text-sm text-gray-400">
            {enAttente.length === 0
              ? "Tout est traité."
              : `${enAttente.length} repas en attente de ta réponse` +
                (enRetard > 0 ? `, dont ${enRetard} depuis plus de 24 h` : "")}
          </p>
        </div>
        <Link href="/dashboard" className="text-xs text-gray-500 transition-colors hover:text-gray-300">
          ← Dashboard
        </Link>
      </div>

      {/* L'ouverture de la page vaut lecture : le client voit « Vu » dès que
          son coach a ouvert la file, sans geste supplémentaire. */}
      <MarquerVus ids={aMarquer} />

      {enRetard > 0 && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4">
          <p className="text-sm font-semibold text-red-400">
            {enRetard} repas {enRetard > 1 ? "attendent" : "attend"} depuis plus de 24 heures
          </p>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">
            Le client voit que sa photo a été vue. Un silence prolongé après un « Vu » se
            remarque davantage qu&apos;une absence de suivi.
          </p>
        </div>
      )}

      {enAttente.length > 0 ? (
        <section className="space-y-3">
          {enAttente.map((r) => (
            <CarteRepasCoach key={r.id} repas={r} />
          ))}
        </section>
      ) : (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-10 text-center">
          <p className="text-3xl">🍽️</p>
          <p className="mt-2 font-semibold text-white">Aucun repas en attente</p>
          <p className="mt-1 text-sm text-gray-500">
            Tes clients n&apos;ont rien envoyé depuis ta dernière réponse.
          </p>
        </div>
      )}

      {traites.length > 0 && (
        <section className="space-y-3">
          <h2 className="pt-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Derniers repas traités
          </h2>
          {traites.map((r) => (
            <CarteRepasCoach key={r.id} repas={r} />
          ))}
        </section>
      )}
    </div>
  );
}
