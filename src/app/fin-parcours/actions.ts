"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

/**
 * Le suivi des relances de fin de challenge.
 *
 * Deux marques, posées par le coach et par lui seul. L'application ne peut
 * pas savoir si un rendez-vous a été pris : la réservation se fait chez un
 * prestataire externe. Deviner à partir d'un clic ferait disparaître de la
 * liste des gens qu'il faut rappeler.
 */

/** Le rendez-vous est dans l'agenda — ou il n'y est plus. */
export async function basculerRdv(clientId: string, pris: boolean): Promise<void> {
  try {
    if (pris) {
      await db.$executeRaw`
        UPDATE reboot_bilans SET rdv_confirme_at = now() WHERE client_id = ${clientId}::uuid
      `;
    } else {
      // Décocher efface la date : la marque a été posée par erreur, et garder
      // une date « confirmée puis annulée » demanderait une colonne de plus
      // pour une information dont personne ne fait rien.
      await db.$executeRaw`
        UPDATE reboot_bilans SET rdv_confirme_at = NULL WHERE client_id = ${clientId}::uuid
      `;
    }
    revalidatePath("/fin-parcours");
    revalidatePath("/dashboard");
  } catch (err) {
    console.error("[fin-parcours/basculerRdv]", err);
  }
}

/**
 * Le coach a ouvert WhatsApp pour cette personne.
 *
 * `COALESCE` garde la première relance : c'est elle qui dit depuis combien de
 * temps on attend une réponse, et l'écraser à chaque ouverture ferait croire
 * à une relance d'aujourd'hui.
 */
export async function marquerRelance(clientId: string): Promise<void> {
  try {
    await db.$executeRaw`
      UPDATE reboot_bilans
         SET relance_at = COALESCE(relance_at, now())
       WHERE client_id = ${clientId}::uuid
    `;
    revalidatePath("/fin-parcours");
  } catch (err) {
    console.error("[fin-parcours/marquerRelance]", err);
  }
}
