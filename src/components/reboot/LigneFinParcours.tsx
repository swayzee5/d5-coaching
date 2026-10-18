"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { basculerRdv, marquerRelance } from "@/app/fin-parcours/actions";

/**
 * Une personne à relancer après son challenge.
 *
 * Tout tient sur une ligne et deux gestes : ouvrir WhatsApp avec un message
 * déjà écrit, cocher quand le rendez-vous est pris. Un écran de relance qui
 * demande plus que ça ne sera pas utilisé les jours chargés — c'est-à-dire
 * précisément les jours où on oublie de relancer.
 *
 * Le message est prérempli avec ce qu'on sait d'elle. « Tu as repris 15
 * points en sept jours » n'est pas une formule de vente, c'est une phrase que
 * seul son coach peut écrire, et c'est pour ça qu'on y répond.
 */

export type FinParcoursLigne = {
  clientId: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  /** Étapes du challenge validées, sur `etapesTotal`. */
  etapes: number;
  etapesTotal: number;
  scoreDepart: number | null;
  /** Null tant que le bilan n'est pas rempli. */
  scoreFin: number | null;
  satisfaction: number | null;
  temoignage: string | null;
  bilanLe: string | null;
  videoVue: boolean;
  ctaClique: boolean;
  rdvConfirme: boolean;
  relance: boolean;
};

export function LigneFinParcours({
  ligne,
  compact = false,
}: {
  ligne: FinParcoursLigne;
  /** Participants encore en cours : avancement seulement, pas de relance. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rdv, setRdv] = useState(ligne.rdvConfirme);
  const [relance, setRelance] = useState(ligne.relance);

  const ecart =
    ligne.scoreDepart !== null && ligne.scoreFin !== null
      ? ligne.scoreFin - ligne.scoreDepart
      : null;

  const message = construireMessage(ligne.prenom, ecart, ligne.bilanLe !== null);
  const lienWhatsapp = ligne.telephone
    ? `https://wa.me/${ligne.telephone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
    : null;

  function cocher() {
    const nouveau = !rdv;
    setRdv(nouveau);
    startTransition(async () => {
      await basculerRdv(ligne.clientId, nouveau);
      router.refresh();
    });
  }

  function ouvrirWhatsapp() {
    setRelance(true);
    void marquerRelance(ligne.clientId);
  }

  if (compact) {
    return (
      <article className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
        <Link
          href={`/app-clients/${ligne.clientId}`}
          className="font-medium text-gray-300 hover:text-yellow-400"
        >
          {ligne.nom}
        </Link>
        <span className="text-sm text-gray-500">
          {ligne.etapes}/{ligne.etapesTotal} étapes
        </span>
      </article>
    );
  }

  return (
    <article
      className={`rounded-xl border bg-gray-900 p-4 ${
        rdv ? "border-green-500/30" : ligne.ctaClique ? "border-yellow-500/40" : "border-gray-800"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/app-clients/${ligne.clientId}`}
            className="font-semibold text-white hover:text-yellow-400"
          >
            {ligne.nom}
          </Link>
          <p className="mt-0.5 text-xs text-gray-500">
            {ligne.etapes}/{ligne.etapesTotal} étapes
            {ligne.bilanLe
              ? ` · bilan ${depuis(ligne.bilanLe)}`
              : " · bilan non rempli"}
            {ligne.satisfaction !== null && ` · satisfaction ${ligne.satisfaction}/5`}
          </p>
        </div>

        <div className="text-right">
          {ligne.scoreFin !== null ? (
            <>
              <p className="text-lg font-black text-white">
                {ligne.scoreDepart ?? "?"} <span className="text-gray-600">→</span> {ligne.scoreFin}
              </p>
              {ecart !== null && (
                <p
                  className={`text-xs font-semibold ${
                    ecart > 0 ? "text-green-400" : "text-gray-500"
                  }`}
                >
                  {ecart > 0 ? `+${ecart} points` : ecart === 0 ? "stable" : `${ecart} points`}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-lg font-black text-gray-500">{ligne.scoreDepart ?? "?"}</p>
              <p className="text-xs text-gray-600">score de départ</p>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Etat actif={ligne.bilanLe !== null} libelle="bilan rempli" />
        <Etat actif={ligne.videoVue} libelle="vidéo vue" />
        <Etat actif={ligne.ctaClique} libelle="a ouvert le lien RDV" />
        {relance && (
          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-400">
            relancé
          </span>
        )}
      </div>

      {ligne.temoignage && (
        <p className="mt-3 border-l-2 border-gray-700 pl-3 text-sm italic text-gray-400">
          « {ligne.temoignage} »
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {lienWhatsapp ? (
          <a
            href={lienWhatsapp}
            target="_blank"
            rel="noopener"
            onClick={ouvrirWhatsapp}
            className="rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-[#06311a] transition-opacity hover:opacity-90"
          >
            {ligne.bilanLe ? "Relancer sur WhatsApp" : "Lui demander son bilan"}
          </a>
        ) : (
          <span className="text-xs text-gray-600">Aucun numéro sur sa fiche</span>
        )}

        <button
          onClick={cocher}
          disabled={isPending}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
            rdv
              ? "bg-green-500/15 text-green-400"
              : "border border-gray-700 text-gray-300 hover:border-gray-600"
          }`}
        >
          {rdv ? "✓ Rendez-vous pris" : "Marquer rendez-vous pris"}
        </button>
      </div>
    </article>
  );
}

function Etat({ actif, libelle }: { actif: boolean; libelle: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] ${
        actif ? "bg-green-500/10 text-green-400" : "bg-gray-800 text-gray-500"
      }`}
    >
      {actif ? "✓" : "—"} {libelle}
    </span>
  );
}

function depuis(iso: string): string {
  const jours = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (jours <= 0) return "aujourd'hui";
  return `il y a ${jours} jour${jours > 1 ? "s" : ""}`;
}

/**
 * Le message de relance, préécrit.
 *
 * Trois cas, et les confondre coûterait cher. Sans bilan, on ne peut citer
 * aucun chiffre — on le ramène vers le bilan, qui est de toute façon ce qui
 * rendra l'appel utile. Avec un bilan en hausse, on cite ses points. Avec un
 * bilan à plat, surtout pas : lui écrire « tu as repris des points » lui
 * apprendrait que personne n'a regardé.
 */
function construireMessage(prenom: string, ecart: number | null, bilanFait: boolean): string {
  if (!bilanFait) {
    return (
      `Salut ${prenom}, bravo, tu es allé au bout des 7 jours — la plupart s'arrêtent avant. ` +
      `Il te reste le bilan dans l'app : les 6 mêmes notes qu'au départ, 5 minutes. ` +
      `C'est lui qui te dira noir sur blanc ce que cette semaine t'a apporté, et c'est de ça que j'aimerais qu'on parle.`
    );
  }
  if (ecart !== null && ecart > 0) {
    return (
      `Salut ${prenom}, j'ai regardé ton bilan : +${ecart} points en sept jours, c'est du concret. ` +
      `Ce qui m'intéresse maintenant, c'est ce que ça donne sur la durée. Tu as 20 minutes cette semaine pour qu'on en parle ?`
    );
  }
  if (ecart !== null) {
    return (
      `Salut ${prenom}, j'ai regardé ton bilan. Ton score n'a pas bougé, et je ne pense pas que ce soit toi le problème — ` +
      `sept jours c'est court, et il manquait sans doute une pièce. Tu as 20 minutes cette semaine pour qu'on regarde laquelle ?`
    );
  }
  return (
    `Salut ${prenom}, j'ai vu que tu avais terminé ton bilan. ` +
    `Tu as 20 minutes cette semaine pour qu'on fasse le point tous les deux ?`
  );
}
