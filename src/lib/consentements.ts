import { db } from "@/lib/db";

/**
 * Qui a accepté de recevoir quoi, et depuis quand.
 *
 * Rien n'est automatisable sans ça. Envoyer des messages commerciaux à des
 * particuliers français demande un consentement, et il doit pouvoir être
 * prouvé : pas « il était dans le groupe », mais une date, un canal, et le
 * texte exact qui lui a été présenté. Une case cochée dont on ne sait plus ce
 * qu'elle disait ne prouve rien.
 *
 * La table n'est jamais mise à jour, seulement complétée. Un refus qui
 * écraserait l'accord précédent effacerait justement ce qu'il faut garder :
 * qu'il avait accepté, puis changé d'avis, et quand. C'est la dernière ligne
 * par canal qui fait foi.
 *
 * Le défaut est le refus. Une personne sans ligne n'a rien accepté — et
 * surtout pas par omission.
 */

export const CANAUX = {
  whatsapp: "Messages WhatsApp",
  vocal: "Messages vocaux",
  push: "Notifications de l'application",
  email: "E-mails",
} as const;

export type Canal = keyof typeof CANAUX;

export type EtatConsentement = {
  canal: Canal;
  accorde: boolean;
  date: Date | null;
  source: string | null;
};

let pret = false;

/**
 * Crée la table si elle manque.
 *
 * Les deux applications partagent une base sans outil de migration : une
 * table attendue et absente fait échouer la requête entière, et la page
 * disparaît. L'ordre est idempotent et mémoïsé.
 */
async function assurerTable(): Promise<void> {
  if (pret) return;
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS consentements (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id   UUID NOT NULL,
      canal       TEXT NOT NULL,
      accorde     BOOLEAN NOT NULL,
      source      TEXT,
      texte       TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.catch(() => {});
  // La lecture courante cherche la dernière ligne d'un client pour un canal :
  // sans index, chaque envoi relirait toute la table.
  await db.$executeRaw`
    CREATE INDEX IF NOT EXISTS consentements_client_canal_idx
      ON consentements (client_id, canal, created_at DESC)
  `.catch(() => {});
  pret = true;
}

/** L'état courant des quatre canaux pour une personne. */
export async function consentements(clientId: string): Promise<EtatConsentement[]> {
  await assurerTable();
  const lignes = await db.$queryRaw<
    { canal: string; accorde: boolean; created_at: Date; source: string | null }[]
  >`
    SELECT DISTINCT ON (canal) canal, accorde, created_at, source
      FROM consentements
     WHERE client_id = ${clientId}::uuid
     ORDER BY canal, created_at DESC
  `.catch(() => []);

  return (Object.keys(CANAUX) as Canal[]).map((canal) => {
    const l = lignes.find((x) => x.canal === canal);
    return {
      canal,
      accorde: l?.accorde ?? false,
      date: l?.created_at ?? null,
      source: l?.source ?? null,
    };
  });
}

/**
 * Enregistre une réponse.
 *
 * `texte` est ce qui a été montré à la personne au moment où elle a répondu.
 * Le jour où quelqu'un conteste, c'est la seule chose qui compte — et elle ne
 * se reconstitue pas après coup, parce que la formulation aura changé.
 */
export async function enregistrerConsentement(
  clientId: string,
  canal: Canal,
  accorde: boolean,
  source: string,
  texte?: string
): Promise<void> {
  await assurerTable();
  await db.$executeRaw`
    INSERT INTO consentements (client_id, canal, accorde, source, texte)
    VALUES (${clientId}::uuid, ${canal}, ${accorde}, ${source}, ${texte ?? null})
  `;
}

/**
 * Le droit d'écrire à quelqu'un sur un canal.
 *
 * À appeler avant chaque envoi automatisé, sans exception. Une vérification
 * faite « à l'entrée du parcours » ne protège de rien : la personne a pu se
 * désinscrire entre-temps, et c'est précisément à ce moment-là qu'un envoi
 * fait du dégât.
 */
export async function peutRecevoir(clientId: string, canal: Canal): Promise<boolean> {
  const etat = await consentements(clientId);
  return etat.find((e) => e.canal === canal)?.accorde ?? false;
}

/** L'historique complet d'un canal, pour la preuve. */
export async function historique(
  clientId: string,
  canal: Canal
): Promise<{ accorde: boolean; created_at: Date; source: string | null; texte: string | null }[]> {
  await assurerTable();
  return db.$queryRaw<
    { accorde: boolean; created_at: Date; source: string | null; texte: string | null }[]
  >`
    SELECT accorde, created_at, source, texte
      FROM consentements
     WHERE client_id = ${clientId}::uuid AND canal = ${canal}
     ORDER BY created_at DESC
  `.catch(() => []);
}
