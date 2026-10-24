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
  /** La date complète, pour une infobulle ou un affichage détaillé. */
  precis: string | null;
  jours: number | null;
  alerte: boolean;
  jamais: boolean;
};

/**
 * L'heure est donnée en heure suisse, pas en heure du serveur.
 *
 * Les serveurs tournent en UTC : sans cette précision, une connexion de 23 h
 * s'afficherait au lendemain pendant la moitié de l'année, et « hier »
 * deviendrait faux.
 */
const FUSEAU = "Europe/Zurich";

const HEURE = new Intl.DateTimeFormat("fr-CH", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: FUSEAU,
});

const JOUR_HEURE = new Intl.DateTimeFormat("fr-CH", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: FUSEAU,
});

/** Le quantième du jour dans le fuseau d'affichage, pour comparer des jours. */
function jourLocal(d: Date): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: FUSEAU }).format(d);
}

export function etatConnexion(date: Date | null): EtatConnexion {
  if (!date) {
    return { texte: "Jamais connecté", precis: null, jours: null, alerte: true, jamais: true };
  }

  const d = new Date(date);
  const maintenant = new Date();

  // Les jours sont comptés de minuit à minuit, et non par tranches de vingt-
  // quatre heures : une connexion à 23 h hier soir doit dire « hier », pas
  // « aujourd'hui » parce qu'il s'est écoulé moins d'un jour.
  const minuit = (x: Date) => new Date(`${jourLocal(x)}T00:00:00Z`).getTime();
  const jours = Math.round((minuit(maintenant) - minuit(d)) / 86_400_000);

  const heure = HEURE.format(d);
  const texte =
    jours <= 0
      ? `Aujourd'hui à ${heure}`
      : jours === 1
      ? `Hier à ${heure}`
      : `Il y a ${jours} jours — ${JOUR_HEURE.format(d)}`;

  return { texte, precis: JOUR_HEURE.format(d), jours, alerte: jours >= 7, jamais: false };
}
