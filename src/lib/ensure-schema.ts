import { db } from "@/lib/db";

/**
 * Garantit les colonnes et tables que ce CRM attend.
 *
 * Pourquoi c'est nécessaire : les deux applications de ce projet se partagent
 * une base sans outil de migration commun. Les fichiers de `db/migrations`
 * côté app cliente ne sont exécutés par personne — ils documentent, ils
 * n'appliquent pas.
 *
 * Et ici le coût d'une colonne manquante est maximal : Prisma sélectionne
 * toutes les colonnes qu'il déclare, donc une seule absente fait échouer la
 * requête entière et la page ne montre plus rien du tout. C'est exactement ce
 * qui est arrivé deux fois — `video_fin_vue_at` a vidé la page de fin de
 * parcours, `manually_edited` a rendu les séances Reboot inaccessibles.
 *
 * Tout est idempotent et mémoïsé : un aller-retour au premier chargement,
 * rien ensuite. Un échec n'est pas mémoïsé, pour que la tentative suivante
 * puisse réussir.
 */

let pret: Promise<void> | null = null;

export function ensureSchemaReboot(): Promise<void> {
  pret ??= (async () => {
    // Les colonnes ajoutées au fil du temps aux séances et aux exercices.
    // `manually_edited` protège le travail du coach : sans elle, le seed de
    // l'app cliente reconstruirait les séances qu'il a modifiées à la main.
    await db.$executeRawUnsafe(`
      ALTER TABLE reboot_sessions
        ADD COLUMN IF NOT EXISTS slug            TEXT,
        ADD COLUMN IF NOT EXISTS tab             TEXT    NOT NULL DEFAULT 'salle',
        ADD COLUMN IF NOT EXISTS is_bonus        BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_active       BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS manually_edited BOOLEAN NOT NULL DEFAULT false
    `);
    await db.$executeRawUnsafe(`
      ALTER TABLE reboot_exercises
        ADD COLUMN IF NOT EXISTS library_exercise_id UUID,
        ADD COLUMN IF NOT EXISTS video_suppressed    BOOLEAN NOT NULL DEFAULT false
    `);

    // Les colonnes de suivi de fin de parcours.
    await db.$executeRawUnsafe(`
      ALTER TABLE reboot_bilans
        ADD COLUMN IF NOT EXISTS video_fin_vue_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS cta_clique_at    TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS rdv_confirme_at  TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS relance_at       TIMESTAMPTZ
    `);

    // Le journal de repas. La table est normalement créée par l'app cliente au
    // premier envoi de photo — mais la file du coach s'ouvre peut-être avant
    // que quiconque en ait envoyé une, et elle échouerait de la même façon.
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS meal_logs (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        photo_path       TEXT NOT NULL,
        note_client      TEXT,
        analyse_auto     JSONB,
        analyse_erreur   TEXT,
        coach_seen_at    TIMESTAMPTZ,
        coach_reply      TEXT,
        coach_replied_at TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  })().catch((err) => {
    console.error("[ensure-schema]", err);
    pret = null;
    throw err;
  });
  return pret;
}
