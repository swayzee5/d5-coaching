"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

/**
 * La file des repas, côté coach.
 *
 * Le client voit l'état de son repas — envoyé, vu, répondu. Ces deux actions
 * sont donc visibles de l'autre côté, et ce n'est pas un détail d'affichage :
 * marquer « vu » est une promesse de réponse, pas un accusé de réception.
 */

const URL_APP_CLIENTE =
  process.env.APP_CLIENTE_URL ?? "https://app.d5coaching-distance.com";

/**
 * Marque des repas comme vus.
 *
 * Appelée à l'ouverture de la file, pour tous les repas affichés d'un coup :
 * marquer repas par repas obligerait le coach à un geste par ligne, qu'il
 * finirait par ne plus faire — et le client verrait « envoyé » indéfiniment
 * alors que son coach regarde ses photos tous les jours.
 */
export async function marquerVus(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.mealLog.updateMany({
    where: { id: { in: ids }, coachSeenAt: null },
    data: { coachSeenAt: new Date() },
  });
  revalidatePath("/repas");
}

/**
 * Enregistre la réponse du coach et prévient le client.
 *
 * La notification part après l'écriture, et son échec n'annule rien : une
 * réponse enregistrée sans notification reste lisible dans l'app, alors qu'une
 * réponse perdue parce que OneSignal était indisponible serait à réécrire.
 */
export async function repondre(
  id: string,
  texte: string
): Promise<{ ok: boolean; erreur?: string; notifié?: boolean }> {
  const reponse = texte.trim();
  if (!reponse) return { ok: false, erreur: "La réponse est vide." };

  try {
    await db.mealLog.update({
      where: { id },
      data: { coachReply: reponse, coachRepliedAt: new Date(), coachSeenAt: new Date() },
    });
  } catch (err) {
    console.error("[repas/repondre]", err);
    return { ok: false, erreur: "Enregistrement impossible." };
  }

  let notifié = false;
  try {
    const res = await fetch(`${URL_APP_CLIENTE}/api/repas/notifier`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}`,
      },
      body: JSON.stringify({ repasId: id }),
      cache: "no-store",
    });
    notifié = res.ok;
  } catch {
    // Le client verra la réponse à sa prochaine ouverture.
  }

  revalidatePath("/repas");
  revalidatePath("/dashboard");
  return { ok: true, notifié };
}
