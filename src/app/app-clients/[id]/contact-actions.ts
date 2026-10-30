"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { normaliserTelephone, type CodePays } from "@/lib/telephone";
import { enregistrerConsentement, type Canal, CANAUX } from "@/lib/consentements";
import {
  lierProspect as lier,
  delierProspect as delier,
  prospectsDisponibles,
  type ProspectLie,
} from "@/lib/personnes";

/**
 * Le contact et les consentements d'un participant, tenus par le coach.
 *
 * Première brique de l'automatisation : sans numéro normalisé et sans accord
 * tracé, aucun message ne part — ni légalement, ni techniquement.
 *
 * Tout passe par le CRM pour l'instant. La collecte côté participant, dans
 * l'application, viendra après le challenge en cours : on ne change pas un
 * parcours que treize personnes sont en train de suivre.
 */

export async function enregistrerTelephone(
  clientId: string,
  saisie: string,
  pays: CodePays
): Promise<{ ok: boolean; erreur?: string; affichage?: string }> {
  const r = normaliserTelephone(saisie, pays);
  if (!r.ok) return { ok: false, erreur: r.erreur };

  try {
    // Un même numéro sur deux comptes est presque toujours une erreur de
    // saisie, et c'est celle qui envoie le message de Marc à Olivier. On
    // avertit sans bloquer : un couple peut partager un téléphone.
    const autres = await db.$queryRaw<{ first_name: string; last_name: string }[]>`
      SELECT first_name, last_name FROM clients
       WHERE phone = ${r.e164} AND id <> ${clientId}::uuid
       LIMIT 1
    `.catch(() => []);

    await db.$executeRaw`
      UPDATE clients SET phone = ${r.e164}, updated_at = now()
       WHERE id = ${clientId}::uuid
    `;
    revalidatePath(`/app-clients/${clientId}`);

    if (autres.length > 0) {
      const a = autres[0];
      return {
        ok: true,
        affichage: r.affichage,
        erreur: `Enregistré, mais ce numéro est aussi celui de ${a.first_name} ${a.last_name}.`,
      };
    }
    return { ok: true, affichage: r.affichage };
  } catch (err) {
    console.error("[contact/telephone]", err);
    return { ok: false, erreur: "Enregistrement impossible." };
  }
}

/**
 * Enregistre un accord ou un refus.
 *
 * `source` dit d'où vient la réponse. « Saisi par le coach » n'a pas la même
 * valeur de preuve qu'une case cochée par la personne elle-même, et le jour
 * où ça compte, il faut pouvoir faire la différence.
 */
export async function basculerConsentement(
  clientId: string,
  canal: Canal,
  accorde: boolean
): Promise<{ ok: boolean; erreur?: string }> {
  if (!(canal in CANAUX)) return { ok: false, erreur: "Canal inconnu." };
  try {
    await enregistrerConsentement(
      clientId,
      canal,
      accorde,
      "Saisi par le coach",
      accorde
        ? `Accord recueilli oralement ou par écrit, consigné par le coach : ${CANAUX[canal]}.`
        : `Refus ou retrait consigné par le coach : ${CANAUX[canal]}.`
    );
    revalidatePath(`/app-clients/${clientId}`);
    return { ok: true };
  } catch (err) {
    console.error("[contact/consentement]", err);
    return { ok: false, erreur: "Enregistrement impossible." };
  }
}

export async function chercherProspects(recherche: string): Promise<ProspectLie[]> {
  if (recherche.trim().length < 2) return [];
  return prospectsDisponibles(recherche);
}

export async function relierProspect(
  clientId: string,
  prospectId: string
): Promise<{ ok: boolean; erreur?: string }> {
  const r = await lier(clientId, prospectId);
  if (r.ok) revalidatePath(`/app-clients/${clientId}`);
  return r;
}

export async function detacherProspect(
  clientId: string
): Promise<{ ok: boolean; erreur?: string }> {
  const r = await delier(clientId);
  if (r.ok) revalidatePath(`/app-clients/${clientId}`);
  return r;
}
