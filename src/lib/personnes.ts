import { db } from "@/lib/db";

/**
 * Une personne, une fiche.
 *
 * Le CRM tient des « prospects », l'application tient des « clients », et
 * rien ne dit que Marc le prospect et Marc le participant sont le même homme.
 * Résultat : une double saisie, un statut commercial qui ignore ce que la
 * personne fait vraiment, et aucune base pour automatiser quoi que ce soit —
 * un automate qui ne sait pas à qui il parle ne doit parler à personne.
 *
 * Le lien est posé ici, dans un sens unique : le prospect porte
 * l'identifiant du compte applicatif. Ce choix a une raison pratique — la
 * table `clients` est celle de l'application cliente, en service, et il vaut
 * mieux ne pas y toucher pour établir une relation qui regarde le CRM.
 *
 * Le lien reste facultatif des deux côtés. Un prospect peut exister sans
 * avoir jamais ouvert l'application, et un participant peut avoir été créé
 * directement — c'est même le cas de tous aujourd'hui.
 */

let pret = false;

async function assurerColonnes(): Promise<void> {
  if (pret) return;
  await db.$executeRaw`
    ALTER TABLE prospects
      ADD COLUMN IF NOT EXISTS app_client_id UUID,
      ADD COLUMN IF NOT EXISTS lie_le        TIMESTAMPTZ
  `.catch(() => {});
  // Un compte applicatif ne peut appartenir qu'à un prospect. Sans cette
  // contrainte, deux fiches commerciales pourraient suivre le même homme et
  // lui envoyer deux fois chaque message.
  await db.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS prospects_app_client_unique
      ON prospects (app_client_id) WHERE app_client_id IS NOT NULL
  `.catch(() => {});
  pret = true;
}

export type ProspectLie = {
  id: string;
  name: string;
  phone: string;
  status: string;
};

/** Le prospect relié à un participant, s'il y en a un. */
export async function prospectDuParticipant(clientId: string): Promise<ProspectLie | null> {
  await assurerColonnes();
  const rows = await db.$queryRaw<ProspectLie[]>`
    SELECT id, name, phone, status
      FROM prospects
     WHERE app_client_id = ${clientId}::uuid
     LIMIT 1
  `.catch(() => []);
  return rows[0] ?? null;
}

/**
 * Les prospects candidats au rattachement.
 *
 * Ceux qui sont déjà reliés à quelqu'un d'autre sont écartés : les proposer
 * revient à proposer une erreur, et la contrainte les refuserait de toute
 * façon — mais après le clic, ce qui est la pire façon de l'apprendre.
 */
export async function prospectsDisponibles(recherche: string): Promise<ProspectLie[]> {
  await assurerColonnes();
  const motif = `%${recherche.trim().toLowerCase()}%`;
  return db.$queryRaw<ProspectLie[]>`
    SELECT id, name, phone, status
      FROM prospects
     WHERE app_client_id IS NULL
       AND (lower(name) LIKE ${motif} OR phone LIKE ${motif} OR lower(coalesce(email,'')) LIKE ${motif})
     ORDER BY created_at DESC
     LIMIT 20
  `.catch(() => []);
}

/**
 * Relie un prospect à un compte applicatif.
 *
 * Refuse si l'un des deux est déjà pris. Un rattachement fautif se répare,
 * mais il faut d'abord s'apercevoir qu'il a eu lieu — et une fiche mélangeant
 * deux personnes ne se remarque qu'au moment où le mauvais reçoit le message.
 */
export async function lierProspect(
  clientId: string,
  prospectId: string
): Promise<{ ok: boolean; erreur?: string }> {
  await assurerColonnes();
  try {
    const existant = await prospectDuParticipant(clientId);
    if (existant) {
      return { ok: false, erreur: `Ce participant est déjà relié à ${existant.name}.` };
    }
    const deja = await db.$queryRaw<{ app_client_id: string | null }[]>`
      SELECT app_client_id FROM prospects WHERE id = ${prospectId} LIMIT 1
    `;
    if (deja.length === 0) return { ok: false, erreur: "Prospect introuvable." };
    if (deja[0].app_client_id) {
      return { ok: false, erreur: "Ce prospect est déjà relié à un autre participant." };
    }

    await db.$executeRaw`
      UPDATE prospects
         SET app_client_id = ${clientId}::uuid, lie_le = now()
       WHERE id = ${prospectId}
    `;
    return { ok: true };
  } catch (err) {
    console.error("[personnes/lier]", err);
    return { ok: false, erreur: String(err).slice(0, 200) };
  }
}

/** Défait le lien. Les deux fiches restent, seule la relation disparaît. */
export async function delierProspect(clientId: string): Promise<{ ok: boolean; erreur?: string }> {
  await assurerColonnes();
  try {
    await db.$executeRaw`
      UPDATE prospects
         SET app_client_id = NULL, lie_le = NULL
       WHERE app_client_id = ${clientId}::uuid
    `;
    return { ok: true };
  } catch (err) {
    console.error("[personnes/delier]", err);
    return { ok: false, erreur: String(err).slice(0, 200) };
  }
}

/**
 * Ce qu'il manque à une personne pour être joignable automatiquement.
 *
 * Sert à la fiche, et servira à l'automate : un parcours qui démarre sans
 * numéro ni consentement produit des envois qui échouent en silence, et
 * personne ne s'en aperçoit avant la fin de la cohorte.
 */
export function manquePour(
  telephone: string | null,
  whatsappAccorde: boolean
): string[] {
  const manques: string[] = [];
  if (!telephone) manques.push("numéro de téléphone");
  if (!whatsappAccorde) manques.push("consentement WhatsApp");
  return manques;
}
