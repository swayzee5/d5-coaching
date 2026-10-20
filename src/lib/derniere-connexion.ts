import { db } from "@/lib/db";

/**
 * La dernière connexion des clients à l'application.
 *
 * Pourquoi c'est le signal qui compte le plus : quelqu'un qui décroche cesse
 * d'ouvrir l'app avant de cesser de s'entraîner. Attendre de voir des séances
 * manquées, c'est découvrir le décrochage deux semaines après qu'il a
 * commencé — et deux semaines, sur un accompagnement de six mois, c'est
 * souvent trop tard pour le rattraper.
 *
 * Lu en SQL direct, et non déclaré dans le schéma Prisma : Prisma sélectionne
 * toutes les colonnes qu'il connaît, donc une colonne absente ferait échouer
 * toutes les requêtes sur les clients. Cette panne-là s'est déjà produite deux
 * fois sur ce projet, et elle vide des pages entières.
 */

let pret = false;

async function ensureColonne(): Promise<void> {
  if (pret) return;
  await db
    .$executeRawUnsafe(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ`)
    .catch(() => {});
  pret = true;
}

/** La dernière connexion de chaque client, par identifiant. */
export async function dernieresConnexions(): Promise<Map<string, Date | null>> {
  await ensureColonne();
  try {
    const rows = await db.$queryRaw<{ id: string; last_login_at: Date | null }[]>`
      SELECT id::text, last_login_at FROM clients
    `;
    return new Map(rows.map((r) => [r.id, r.last_login_at]));
  } catch {
    return new Map();
  }
}

/** La dernière connexion d'un client. */
export async function derniereConnexion(clientId: string): Promise<Date | null> {
  await ensureColonne();
  try {
    const rows = await db.$queryRaw<{ last_login_at: Date | null }[]>`
      SELECT last_login_at FROM clients WHERE id = ${clientId}::uuid
    `;
    return rows[0]?.last_login_at ?? null;
  } catch {
    return null;
  }
}

/**
 * Comment présenter une dernière connexion.
 *
 * Le seuil d'alerte est à sept jours, et il est volontairement bas. Sur un
 * accompagnement à quinze cents euros, quelqu'un qui n'a pas ouvert l'app
 * depuis une semaine mérite un message — pas un mois plus tard, quand il aura
 * déjà décidé d'arrêter.
 *
 * « Jamais connecté » est traité à part : ce n'est pas un décrochage, c'est un
 * démarrage raté, et il appelle un autre geste — vérifier que le compte
 * fonctionne, pas relancer sur la motivation.
 */
export type EtatConnexion = {
  texte: string;
  jours: number | null;
  alerte: boolean;
  jamais: boolean;
};

export function etatConnexion(date: Date | null): EtatConnexion {
  if (!date) {
    return { texte: "Jamais connecté", jours: null, alerte: true, jamais: true };
  }
  const jours = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  const texte =
    jours <= 0 ? "Aujourd'hui" : jours === 1 ? "Hier" : `Il y a ${jours} jours`;
  return { texte, jours, alerte: jours >= 7, jamais: false };
}
