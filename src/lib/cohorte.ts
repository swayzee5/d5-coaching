import { db } from "@/lib/db";

/**
 * Où en est chaque participant de la cohorte, aujourd'hui.
 *
 * Dix sur treize se sont arrêtés en route lors du premier REBOOT, et personne
 * ne l'a su avant la fin. C'est le trou le plus coûteux du parcours : un homme
 * qui décroche au troisième jour se rattrape le troisième jour, pas trois
 * semaines plus tard quand la cohorte est close et qu'il a désinstallé l'app.
 *
 * Le calcul ne demande aucune intelligence — des dates et des seuils. C'est
 * voulu : une comparaison de dates faite par un modèle coûte cher et peut se
 * tromper, là où une requête ne se trompe pas. L'interprétation viendra
 * ailleurs.
 */

export const ETAPES_TOTAL = 10;

/** Au-delà, on considère que la personne a lâché. */
export const JOURS_AVANT_DECROCHAGE = 2;

export type EtatParticipant =
  | "termine"
  | "jamais_commence"
  | "decroche"
  | "en_route";

export type Participant = {
  clientId: string;
  prenom: string;
  nom: string;
  telephone: string | null;
  depart: Date | null;
  /** Jour du challenge : 1 le jour du départ. Null si aucune date posée. */
  jour: number | null;
  etapes: number;
  seances: number;
  messages: number;
  modules: number;
  derniereAction: Date | null;
  joursSansAction: number | null;
  bilanFait: boolean;
  etat: EtatParticipant;
};

type Ligne = {
  client_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  reboot_start_date: Date | null;
  seances: number;
  messages: number;
  modules: number;
  derniere_action: Date | null;
  bilan_le: Date | null;
};

/** Jours écoulés entre deux dates, sans tenir compte de l'heure. */
function joursEcoules(depuis: Date, jusqua: Date): number {
  const a = Date.UTC(depuis.getUTCFullYear(), depuis.getUTCMonth(), depuis.getUTCDate());
  const b = Date.UTC(jusqua.getUTCFullYear(), jusqua.getUTCMonth(), jusqua.getUTCDate());
  return Math.round((b - a) / 86_400_000);
}

export async function cohorteEnCours(maintenant = new Date()): Promise<Participant[]> {
  // Les séances bonus sont exclues, comme le fait l'application cliente :
  // compter un échauffement comme une séance du challenge donnerait au coach
  // un chiffre différent de celui que le participant voit chez lui.
  const lignes = await db.$queryRaw<Ligne[]>`
    WITH participants AS (
      SELECT id, first_name, last_name, phone, reboot_start_date
        FROM clients
       WHERE is_reboot_only = true AND is_active = true AND is_blocked = false
    ),
    actions AS (
      SELECT client_id::text AS cid, completed_at AS quand FROM reboot_completions
      UNION ALL
      SELECT client_id::text, completed_at FROM reboot_task_completions
      UNION ALL
      SELECT client_id::text, sent_at FROM reboot_whatsapp_completions
      UNION ALL
      SELECT client_id::text, submitted_at FROM reboot_session_checkins
    )
    SELECT p.id::text AS client_id, p.first_name, p.last_name, p.phone,
           p.reboot_start_date,
           COALESCE((SELECT COUNT(DISTINCT rc.session_id)
                       FROM reboot_completions rc
                       JOIN reboot_sessions rs ON rs.id = rc.session_id
                      WHERE rc.client_id::text = p.id::text AND NOT rs.is_bonus), 0)::int AS seances,
           COALESCE((SELECT COUNT(*) FROM reboot_whatsapp_completions w
                      WHERE w.client_id::text = p.id::text), 0)::int AS messages,
           COALESCE((SELECT COUNT(*) FROM reboot_task_completions t
                      WHERE t.client_id::text = p.id::text), 0)::int AS modules,
           (SELECT MAX(a.quand) FROM actions a WHERE a.cid = p.id::text) AS derniere_action,
           (SELECT b.submitted_at FROM reboot_bilans b
             WHERE b.client_id::text = p.id::text LIMIT 1) AS bilan_le
      FROM participants p
     ORDER BY p.first_name
  `;

  return lignes.map((l) => {
    const seances = Math.min(Number(l.seances), 3);
    const messages = Math.min(Number(l.messages), 3);
    const modules = Math.min(Number(l.modules), 4);
    const etapes = seances + messages + modules;

    const depart = l.reboot_start_date ? new Date(l.reboot_start_date) : null;
    const jour = depart ? joursEcoules(depart, maintenant) + 1 : null;

    const derniereAction = l.derniere_action ? new Date(l.derniere_action) : null;
    const joursSansAction = derniereAction ? joursEcoules(derniereAction, maintenant) : null;

    // L'ordre des tests compte. Quelqu'un qui a tout fini n'est pas « en
    // retard » parce qu'il n'a rien touché depuis trois jours : il a fini.
    let etat: EtatParticipant;
    if (etapes >= ETAPES_TOTAL) {
      etat = "termine";
    } else if (etapes === 0) {
      etat = "jamais_commence";
    } else if ((joursSansAction ?? 0) > JOURS_AVANT_DECROCHAGE) {
      etat = "decroche";
    } else {
      etat = "en_route";
    }

    return {
      clientId: l.client_id,
      prenom: l.first_name,
      nom: l.last_name,
      telephone: l.phone,
      depart,
      jour,
      etapes,
      seances,
      messages,
      modules,
      derniereAction,
      joursSansAction,
      bilanFait: l.bilan_le !== null,
      etat,
    };
  });
}

/**
 * Ce qui reste à faire, en clair.
 *
 * Sert à la relance : « il te manque deux messages » est actionnable, « 8/10 »
 * ne l'est pas.
 */
export function cequiManque(p: Participant): string[] {
  const manque: string[] = [];
  if (p.seances < 3) manque.push(`${3 - p.seances} séance${3 - p.seances > 1 ? "s" : ""}`);
  if (p.messages < 3) manque.push(`${3 - p.messages} message${3 - p.messages > 1 ? "s" : ""}`);
  if (p.modules < 4) manque.push(`${4 - p.modules} module${4 - p.modules > 1 ? "s" : ""}`);
  return manque;
}

export const LIBELLES: Record<EtatParticipant, { texte: string; classe: string }> = {
  termine: { texte: "Terminé", classe: "border-green-500/30 bg-green-500/10 text-green-400" },
  en_route: { texte: "En route", classe: "border-blue-500/30 bg-blue-500/10 text-blue-400" },
  decroche: { texte: "Décroché", classe: "border-orange-500/40 bg-orange-500/10 text-orange-400" },
  jamais_commence: { texte: "Jamais commencé", classe: "border-red-500/40 bg-red-500/10 text-red-400" },
};
