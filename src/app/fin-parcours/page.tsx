export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { LigneFinParcours, type FinParcoursLigne } from "@/components/reboot/LigneFinParcours";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Fin de parcours" };

/**
 * Qui relancer après le challenge.
 *
 * Le but du dispositif est que les participants prennent rendez-vous
 * d'eux-mêmes, et que le coach ne relance à la main que les autres. Sans
 * cette liste, il faudrait vérifier chaque fiche une par une — et tout ce
 * qu'on gagne en automatisant l'offre se reperdrait en vérifications.
 *
 * Trois colonnes de suivi, et la distinction entre elles est importante :
 *
 *   - « a vu la vidéo » : il est allé au bout de la vidéo de clôture.
 *   - « a cliqué » : il a ouvert le lien de réservation. Ce n'est PAS une
 *     réservation — elle a lieu chez un prestataire externe que cette
 *     application ne voit pas.
 *   - « RDV confirmé » : le coach l'a coché parce que le rendez-vous est dans
 *     son agenda. C'est la seule des trois qui dise la vérité.
 *
 * Les confondre ferait croire à des rendez-vous qui n'existent pas, et
 * supprimerait de la liste exactement les gens qu'il faut rappeler.
 */

type Ligne = {
  client_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  score_depart: number | null;
  score_fin: number;
  satisfaction: number | null;
  temoignage: string | null;
  submitted_at: Date;
  video_fin_vue_at: Date | null;
  cta_clique_at: Date | null;
  rdv_confirme_at: Date | null;
  relance_at: Date | null;
};

export default async function FinParcoursPage() {
  let lignes: Ligne[] = [];
  try {
    lignes = await db.$queryRaw<Ligne[]>`
      SELECT b.client_id::text AS client_id,
             c.first_name, c.last_name, c.phone,
             d.score_global AS score_depart,
             b.score_global AS score_fin,
             b.satisfaction, b.temoignage, b.submitted_at,
             b.video_fin_vue_at, b.cta_clique_at, b.rdv_confirme_at, b.relance_at
        FROM reboot_bilans b
        JOIN clients c ON c.id = b.client_id
        LEFT JOIN reboot_diagnostics d ON d.client_id = b.client_id
       ORDER BY b.submitted_at DESC
       LIMIT 200
    `;
  } catch (err) {
    console.error("[fin-parcours]", err);
  }

  const versLigne = (l: Ligne): FinParcoursLigne => ({
    clientId: l.client_id,
    nom: `${l.first_name} ${l.last_name}`.trim(),
    telephone: l.phone,
    prenom: l.first_name,
    scoreDepart: l.score_depart,
    scoreFin: l.score_fin,
    satisfaction: l.satisfaction,
    temoignage: l.temoignage,
    bilanLe: l.submitted_at.toISOString(),
    videoVue: l.video_fin_vue_at !== null,
    ctaClique: l.cta_clique_at !== null,
    rdvConfirme: l.rdv_confirme_at !== null,
    relance: l.relance_at !== null,
  });

  const aRelancer = lignes.filter((l) => !l.rdv_confirme_at).map(versLigne);
  const confirmes = lignes.filter((l) => l.rdv_confirme_at).map(versLigne);
  const ontClique = aRelancer.filter((l) => l.ctaClique).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fin de parcours</h1>
          <p className="mt-1 text-sm text-gray-400">
            {lignes.length === 0
              ? "Personne n'a encore terminé son bilan."
              : `${aRelancer.length} à traiter · ${confirmes.length} rendez-vous confirmés`}
          </p>
        </div>
        <Link href="/dashboard" className="text-xs text-gray-500 transition-colors hover:text-gray-300">
          ← Dashboard
        </Link>
      </div>

      {ontClique > 0 && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/5 p-4">
          <p className="text-sm font-semibold text-yellow-400">
            {ontClique} {ontClique > 1 ? "ont" : "a"} ouvert le lien de rendez-vous sans que tu
            l&apos;aies confirmé
          </p>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">
            Vérifie ton agenda : s&apos;ils ont réservé, coche-les pour les sortir de la liste.
            Sinon ce sont eux qu&apos;il faut rappeler en premier — ils étaient à un clic.
          </p>
        </div>
      )}

      {aRelancer.length > 0 ? (
        <section className="space-y-3">
          {aRelancer.map((l) => (
            <LigneFinParcours key={l.clientId} ligne={l} />
          ))}
        </section>
      ) : (
        lignes.length > 0 && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-10 text-center">
            <p className="text-3xl">✅</p>
            <p className="mt-2 font-semibold text-white">Tout le monde est traité</p>
          </div>
        )
      )}

      {confirmes.length > 0 && (
        <section className="space-y-3">
          <h2 className="pt-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Rendez-vous confirmés
          </h2>
          {confirmes.map((l) => (
            <LigneFinParcours key={l.clientId} ligne={l} />
          ))}
        </section>
      )}
    </div>
  );
}
