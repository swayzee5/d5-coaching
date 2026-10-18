import { NextRequest } from "next/server";
import { db } from "@/lib/db";

/**
 * Pourquoi la page « Fin de parcours » est vide.
 *
 * Elle est alimentée par une seule grande requête, et son échec est avalé :
 * une table absente, une colonne manquante, et la page affiche « personne n'a
 * terminé » au lieu d'une erreur. C'est le pire des deux mondes — le coach
 * conclut qu'aucun participant n'a fini, alors que son tableau de bord lui dit
 * le contraire.
 *
 * Cette route teste chaque morceau séparément et dit lequel casse. Elle
 * remplace une demi-heure de suppositions par une réponse.
 */

export const dynamic = "force-dynamic";

type Essai = { nom: string; ok: boolean; resultat?: unknown; erreur?: string };

async function essayer(nom: string, requete: () => Promise<unknown>): Promise<Essai> {
  try {
    return { nom, ok: true, resultat: await requete() };
  } catch (err) {
    return { nom, ok: false, erreur: String(err).slice(0, 200) };
  }
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Chaque table est interrogée seule : la première qui échoue est la cause.
  const essais = await Promise.all([
    essayer("clients", () =>
      db.$queryRaw`SELECT COUNT(*)::int AS total,
                          COUNT(*) FILTER (WHERE is_reboot_only)::int AS reboot_only,
                          COUNT(*) FILTER (WHERE is_reboot_only AND is_active)::int AS reboot_actifs
                     FROM clients`
    ),
    essayer("reboot_completions", () =>
      db.$queryRaw`SELECT COUNT(*)::int AS lignes, COUNT(DISTINCT client_id)::int AS clients
                     FROM reboot_completions`
    ),
    essayer("reboot_sessions.is_bonus", () =>
      db.$queryRaw`SELECT COUNT(*)::int AS total,
                          COUNT(*) FILTER (WHERE is_bonus)::int AS bonus
                     FROM reboot_sessions`
    ),
    essayer("reboot_whatsapp_completions", () =>
      db.$queryRaw`SELECT COUNT(*)::int AS lignes, COUNT(DISTINCT client_id)::int AS clients
                     FROM reboot_whatsapp_completions`
    ),
    essayer("reboot_task_completions", () =>
      db.$queryRaw`SELECT COUNT(*)::int AS lignes, COUNT(DISTINCT client_id)::int AS clients
                     FROM reboot_task_completions`
    ),
    essayer("reboot_diagnostics", () =>
      db.$queryRaw`SELECT COUNT(*)::int AS lignes FROM reboot_diagnostics`
    ),
    essayer("reboot_bilans", () =>
      db.$queryRaw`SELECT COUNT(*)::int AS lignes FROM reboot_bilans`
    ),
    essayer("reboot_bilans.colonnes_fin", () =>
      db.$queryRaw`SELECT COUNT(*)::int AS lignes FROM reboot_bilans
                    WHERE video_fin_vue_at IS NOT NULL OR cta_clique_at IS NOT NULL
                       OR rdv_confirme_at IS NOT NULL OR relance_at IS NOT NULL`
    ),
    essayer("coach_notifications (source du compteur du tableau de bord)", () =>
      db.$queryRaw`SELECT client_id::text AS client_id, created_at
                     FROM coach_notifications
                    WHERE type = 'reboot_completed' AND is_read = false
                    ORDER BY created_at DESC LIMIT 10`
    ),
    // La requête complète de la page, à l'identique.
    essayer("requête de la page", () =>
      db.$queryRaw`
        WITH participants AS (
          SELECT c.id, c.first_name, c.last_name, c.phone
            FROM clients c
           WHERE c.is_reboot_only = true AND c.is_active = true
        ),
        seances AS (
          SELECT rc.client_id::text AS cid, COUNT(DISTINCT rc.session_id) AS n
            FROM reboot_completions rc
            JOIN reboot_sessions rs ON rs.id = rc.session_id
           WHERE NOT rs.is_bonus
           GROUP BY rc.client_id::text
        ),
        messages AS (
          SELECT client_id::text AS cid, COUNT(*) AS n
            FROM reboot_whatsapp_completions GROUP BY client_id::text
        ),
        modules AS (
          SELECT client_id::text AS cid, COUNT(*) AS n
            FROM reboot_task_completions GROUP BY client_id::text
        )
        SELECT p.first_name, p.last_name, (p.phone IS NOT NULL) AS a_un_numero,
               (LEAST(COALESCE(s.n, 0), 3)
                + LEAST(COALESCE(m.n, 0), 3)
                + LEAST(COALESCE(mo.n, 0), 4))::int AS etapes,
               COALESCE(s.n, 0)::int AS seances,
               COALESCE(m.n, 0)::int AS messages,
               COALESCE(mo.n, 0)::int AS modules,
               (b.submitted_at IS NOT NULL) AS bilan_rempli
          FROM participants p
          LEFT JOIN seances  s  ON s.cid  = p.id::text
          LEFT JOIN messages m  ON m.cid  = p.id::text
          LEFT JOIN modules  mo ON mo.cid = p.id::text
          LEFT JOIN reboot_bilans b ON b.client_id::text = p.id::text
         ORDER BY etapes DESC
         LIMIT 50`
    ),
    // Au cas où les participants ne seraient pas marqués « Reboot only » :
    // les mêmes comptes, sans aucun filtre sur les clients.
    essayer("avancement SANS filtre reboot_only/actif", () =>
      db.$queryRaw`
        SELECT c.first_name, c.last_name, c.is_reboot_only, c.is_active,
               (SELECT COUNT(DISTINCT rc.session_id)::int FROM reboot_completions rc
                 WHERE rc.client_id::text = c.id::text) AS seances_toutes,
               (SELECT COUNT(*)::int FROM reboot_task_completions t
                 WHERE t.client_id::text = c.id::text) AS modules,
               (SELECT COUNT(*)::int FROM reboot_whatsapp_completions w
                 WHERE w.client_id::text = c.id::text) AS messages
          FROM clients c
         WHERE EXISTS (SELECT 1 FROM reboot_task_completions t WHERE t.client_id::text = c.id::text)
            OR EXISTS (SELECT 1 FROM reboot_completions rc WHERE rc.client_id::text = c.id::text)
         LIMIT 50`
    ),
  ]);

  const casse = essais.filter((e) => !e.ok).map((e) => e.nom);

  return Response.json(
    {
      diagnostic:
        casse.length > 0
          ? `Ces requêtes échouent, et c'est ce qui vide la page : ${casse.join(", ")}`
          : "Aucune requête n'échoue. Si la page est vide, c'est que personne ne remplit les critères — regarde « avancement SANS filtre » ci-dessous.",
      essais,
    },
    { headers: { "Content-Type": "application/json; charset=utf-8" } }
  );
}
