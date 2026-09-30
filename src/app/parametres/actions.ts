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
