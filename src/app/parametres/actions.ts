"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function saveRebootMessage(message: string) {
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `.catch(() => {});
  await db.$executeRaw`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('reboot_welcome_message', ${message}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
  revalidatePath("/parametres");
}

/**
 * Identifiant Vimeo de la vidéo d'explication du Reboot.
 *
 * Tant qu'il est vide, l'app n'impose aucune vidéo : le challenge reste
 * accessible. C'est volontaire — une clé vide ne doit pas fermer la porte.
 *
 * Le coach colle souvent l'adresse complète plutôt que l'identifiant. On ne
 * peut pas lui demander de savoir lequel des nombres d'une URL Vimeo est le
 * bon, donc on l'extrait.
 */
export async function saveRebootIntroVideo(valeur: string) {
  const identifiant = (valeur.match(/(\d{6,})/)?.[1] ?? "").trim();

  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `.catch(() => {});
  await db.$executeRaw`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('reboot_intro_video_id', ${identifiant}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
  revalidatePath("/parametres");
  return identifiant;
}

/**
 * Numéro WhatsApp du coach, pour la page d'invitation du Reboot.
 *
 * Format international sans le « + », comme l'attend wa.me : 33612345678.
 * Le coach colle en général le numéro avec des espaces, un plus ou des
 * points ; on ne garde que les chiffres plutôt que de lui demander un format
 * qu'il n'a aucune raison de connaître.
 *
 * Vide, la page d'invitation n'affiche aucun bouton WhatsApp : mieux vaut une
 * page sans bouton qu'un bouton qui mène à un numéro faux.
 */
export async function saveCoachWhatsapp(valeur: string) {
  const numero = valeur.replace(/\D/g, "");

  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `.catch(() => {});
  await db.$executeRaw`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('coach_whatsapp', ${numero}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
  revalidatePath("/parametres");
  return numero;
}

/**
 * Les réglages de la fin de parcours : vidéo de clôture, lien de rendez-vous,
 * prix affiché.
 *
 * Les trois sont enregistrés ensemble parce qu'ils ne servent qu'ensemble :
 * une vidéo de clôture sans bouton de réservation laisse le participant sur
 * un argumentaire sans porte de sortie, et un bouton sans prix l'oblige à
 * demander ce qu'il coûte avant de savoir s'il veut le demander.
 *
 * Le lien est validé, et c'est le seul des trois à l'être. Une adresse fausse
 * ne se verrait qu'au moment où quelqu'un vient de terminer son challenge et
 * décide de passer à la suite : le pire endroit du parcours pour une erreur
 * de frappe.
 */
export async function saveReglagesFin(valeurs: {
  videoFin: string;
  lienReservation: string;
  prix: string;
}): Promise<{ ok: boolean; erreur?: string; videoFin: string }> {
  const videoFin = (valeurs.videoFin.match(/(\d{6,})/)?.[1] ?? "").trim();
  const lien = valeurs.lienReservation.trim();

  if (lien) {
    try {
      const u = new URL(lien);
      if (u.protocol !== "https:" && u.protocol !== "http:") {
        return { ok: false, erreur: "Le lien doit commencer par https://", videoFin };
      }
    } catch {
      return { ok: false, erreur: "Ce lien n'est pas une adresse valide.", videoFin };
    }
  }

  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `.catch(() => {});

  for (const [cle, valeur] of [
    ["reboot_video_fin", videoFin],
    ["lien_reservation", lien],
    ["prix_accompagnement", valeurs.prix.trim()],
  ] as const) {
    await db.$executeRaw`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (${cle}, ${valeur}, now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;
  }

  revalidatePath("/parametres");
  revalidatePath("/fin-parcours");
  return { ok: true, videoFin };
}
