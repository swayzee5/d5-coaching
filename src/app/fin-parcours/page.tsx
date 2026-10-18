export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { LigneFinParcours, type FinParcoursLigne } from "@/components/reboot/LigneFinParcours";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Fin de parcours" };

/**
 * Qui relancer après le challenge.
 *
 * La page listait les bilans. C'était le mauvais critère : elle affichait
 * « personne n'a encore terminé son bilan » alors que trois participants
 * avaient fini leurs dix étapes — exactement ceux qu'il fallait rappeler, et
 * les seuls que la page ne montrait pas. Quelqu'un qui finit le challenge
 * sans remplir son bilan n'est pas moins intéressant : il est juste passé à
 * côté d'un formulaire.
 *
 * On part donc des participants et de leur avancement, le bilan n'étant qu'une
 * information de plus.
 *
 * Trois états de suivi, et la distinction compte :
 *
 *   - « a vu la vidéo » et « a ouvert le lien RDV » sont mesurés.
 *   - « RDV confirmé » est coché par le coach, parce que la réservation a lieu
 *     chez un prestataire externe que cette application ne voit pas.
 *
 * Seul le troisième dit la vérité, et c'est lui qui sort quelqu'un de la
 * liste. Déduire un rendez-vous d'un clic ferait disparaître des gens qu'il
 * faut rappeler.
 */

const ETAPES_TOTAL = 10;

type Ligne = {
  client_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  actif: boolean;
  etapes: number;
  score_depart: number | null;
  score_fin: number | null;
  satisfaction: number | null;
  temoignage: string | null;
  bilan_le: Date | null;
  video_fin_vue_at: Date | null;
  cta_clique_at: Date | null;
  rdv_confirme_at: Date | null;
  relance_at: Date | null;
};

export default async function FinParcoursPage() {
  // Les colonnes de suivi sont ajoutées ici si elles manquent. Le fichier de
  // migration existe, mais rien ne l'exécute : ce projet n'a pas d'outil de
  // migration partagé entre ses deux applications, et une colonne absente
  // faisait échouer toute la page. Un ALTER idempotent coûte un aller-retour
  // et supprime la classe entière de ces pannes.
  await db.$executeRawUnsafe(`
    ALTER TABLE reboot_bilans
      ADD COLUMN IF NOT EXISTS video_fin_vue_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS cta_clique_at    TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS rdv_confirme_at  TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS relance_at       TIMESTAMPTZ
  `).catch(() => {});

  let lignes: Ligne[] = [];
  // L'erreur est retenue et affichée. Avalée, elle transformait une panne en
  // « personne n'a terminé » — un message faux, rassurant, et impossible à
  // distinguer de la vérité.
  let panne: string | null = null;
  try {
    // Les identifiants sont comparés en texte des deux côtés : l'app cliente
    // écrit certaines de ces tables avec un client_id en UUID et d'autres en
    // TEXT, selon celle qui a créé la table en premier. Caster évite d'en
    // dépendre.
    lignes = await db.$queryRaw<Ligne[]>`
      WITH participants AS (
        SELECT c.id, c.first_name, c.last_name, c.phone, c.is_active
          FROM clients c
         WHERE c.is_reboot_only = true AND c.is_active = true
      ),
      seances AS (
        SELECT rc.client_id::text AS cid, COUNT(DISTINCT rc.session_id) AS n
          FROM reboot_completions rc
          JOIN reboot_sessions rs ON rs.id = rc.session_id
         WHERE NOT rs.is_bonus
         GROUP BY rc.client_id::text
      ),
      messages AS (
        SELECT client_id::text AS cid, COUNT(*) AS n
          FROM reboot_whatsapp_completions GROUP BY client_id::text
      ),
      modules AS (
        SELECT client_id::text AS cid, COUNT(*) AS n
          FROM reboot_task_completions GROUP BY client_id::text
      )
      SELECT p.id::text AS client_id, p.first_name, p.last_name, p.phone,
             p.is_active AS actif,
             (LEAST(COALESCE(s.n, 0), 3)
              + LEAST(COALESCE(m.n, 0), 3)
              + LEAST(COALESCE(mo.n, 0), 4))::int AS etapes,
             d.score_global AS score_depart,
             b.score_global AS score_fin,
             b.satisfaction, b.temoignage,
             b.submitted_at AS bilan_le,
             b.video_fin_vue_at, b.cta_clique_at, b.rdv_confirme_at, b.relance_at
        FROM participants p
        LEFT JOIN seances  s  ON s.cid  = p.id::text
        LEFT JOIN messages m  ON m.cid  = p.id::text
        LEFT JOIN modules  mo ON mo.cid = p.id::text
        LEFT JOIN reboot_diagnostics d ON d.client_id::text = p.id::text
        LEFT JOIN reboot_bilans      b ON b.client_id::text = p.id::text
       ORDER BY etapes DESC, p.first_name
       LIMIT 200
    `;
  } catch (err) {
    console.error("[fin-parcours]", err);
    panne = String(err).slice(0, 300);
  }

  // Les participants archivés sont les cohortes précédentes, closes. Ils
  // n'ont rien à faire dans une liste de relance — mais les faire disparaître
  // sans rien dire est ce qui a fait croire que la page était vide.
  let archives = 0;
  try {
    const r = await db.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM clients
       WHERE is_reboot_only = true AND is_active = false
    `;
    archives = r[0]?.n ?? 0;
  } catch {}

  const versLigne = (l: Ligne): FinParcoursLigne => ({
    clientId: l.client_id,
    nom: `${l.first_name} ${l.last_name ?? ""}`.trim(),
    prenom: l.first_name,
    telephone: l.phone,
    actif: l.actif,
    etapes: l.etapes,
    etapesTotal: ETAPES_TOTAL,
    scoreDepart: l.score_depart,
    scoreFin: l.score_fin,
    satisfaction: l.satisfaction,
    temoignage: l.temoignage,
    bilanLe: l.bilan_le ? l.bilan_le.toISOString() : null,
    videoVue: l.video_fin_vue_at !== null,
    ctaClique: l.cta_clique_at !== null,
    rdvConfirme: l.rdv_confirme_at !== null,
    relance: l.relance_at !== null,
  });

  const termines = lignes.filter((l) => l.etapes >= ETAPES_TOTAL || l.bilan_le !== null);
  const aRelancer = termines.filter((l) => !l.rdv_confirme_at).map(versLigne);
  const confirmes = termines.filter((l) => l.rdv_confirme_at).map(versLigne);
  const enCours = lignes
    .filter((l) => l.etapes < ETAPES_TOTAL && l.bilan_le === null && l.etapes > 0)
    .map(versLigne);

  const sansBilan = aRelancer.filter((l) => l.bilanLe === null).length;
  const ontClique = aRelancer.filter((l) => l.ctaClique).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fin de parcours</h1>
          <p className="mt-1 text-sm text-gray-400">
            {panne
              ? "La liste n'a pas pu être chargée."
              : termines.length === 0
                ? "Personne n'a encore terminé ses 10 étapes."
                : `${aRelancer.length} à traiter · ${confirmes.length} rendez-vous confirmés`}
          </p>
        </div>
        <Link href="/dashboard" className="text-xs text-gray-500 transition-colors hover:text-gray-300">
          ← Dashboard
        </Link>
      </div>

      {panne && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4">
          <p className="text-sm font-semibold text-red-400">Cette page n&apos;a pas pu lire les données</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">
            Ce n&apos;est pas que personne n&apos;a terminé : la requête a échoué. Le diagnostic
            est sur <code className="text-gray-300">/api/stats/fin-parcours?secret=…</code>
          </p>
          <p className="mt-2 break-words font-mono text-[11px] text-gray-500">{panne}</p>
        </div>
      )}

      {ontClique > 0 && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/5 p-4">
          <p className="text-sm font-semibold text-yellow-400">
            {ontClique} {ontClique > 1 ? "ont" : "a"} ouvert le lien de rendez-vous sans que tu
            l&apos;aies confirmé
          </p>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">
            Vérifie ton agenda : s&apos;ils ont réservé, coche-les. Sinon ce sont eux qu&apos;il
            faut rappeler en premier — ils étaient à un clic.
          </p>
        </div>
      )}

      {sansBilan > 0 && (
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
          <p className="text-sm font-semibold text-white">
            {sansBilan} {sansBilan > 1 ? "ont terminé" : "a terminé"} le challenge sans remplir le
            bilan
          </p>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">
            Sans bilan, pas de progression chiffrée — ni pour eux, ni pour toi. Le message de
            relance préparé pour eux les y ramène.
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
        termines.length > 0 && (
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

      {archives > 0 && (
        <p className="pt-2 text-xs text-gray-600">
          {archives} participant{archives > 1 ? "s" : ""} de cohortes précédentes
          {archives > 1 ? " sont archivés" : " est archivé"} et n&apos;
          {archives > 1 ? "apparaissent" : "apparaît"} pas ici.
        </p>
      )}

      {/* Les participants encore en cours, pour voir qui cale avant la fin —
          un décrochage repéré au cinquième jour se rattrape, le même constaté
          au bilan ne se rattrape plus. */}
      {enCours.length > 0 && (
        <section className="space-y-3">
          <h2 className="pt-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Challenge en cours ({enCours.length})
          </h2>
          {enCours.map((l) => (
            <LigneFinParcours key={l.clientId} ligne={l} compact />
          ))}
        </section>
      )}
    </div>
  );
}
