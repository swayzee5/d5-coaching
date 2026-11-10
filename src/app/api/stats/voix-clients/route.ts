import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Ce que les clients écrivent, rassemblé en un seul endroit.
 *
 * C'est la matière première du contenu, et elle est déjà là : les blocages
 * notés au diagnostic, ce qui a été difficile pendant la semaine, ce qui
 * freine ceux qui refusent, les ressentis tapés juste après une séance, les
 * questions posées dans la messagerie. Éparpillée sur six écrans, personne ne
 * la relit jamais.
 *
 * Rien n'est résumé ni reformulé ici. Une phrase de client vaut par ses mots
 * exacts — « j'arrive pas à m'y mettre le soir » ne se remplace pas par
 * « manque de motivation vespérale » sans perdre précisément ce qui la rend
 * utilisable dans une vidéo.
 *
 * Les prénoms sont conservés : le coach connaît ces hommes, et savoir qui a
 * dit quoi lui permet de vérifier avant de publier. Rien ne sort d'ici sans
 * le secret, et ce qui en sort ne doit jamais être publié sans l'accord de la
 * personne — un témoignage autorisé est marqué comme tel, les autres non.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Verbatim = { prenom: string; texte: string; quand: Date | null; source: string };

function nettoyer(rows: { prenom: string; texte: string | null; quand: Date | null }[], source: string): Verbatim[] {
  return rows
    .filter((r) => r.texte && r.texte.trim().length > 2)
    .map((r) => ({ prenom: r.prenom, texte: r.texte!.trim(), quand: r.quand, source }));
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Chaque source est interrogée séparément et tolère son propre échec : une
  // table absente sur un déploiement ne doit pas vider tout le reste.
  const vide = [] as { prenom: string; texte: string | null; quand: Date | null }[];

  const [diagnostics, bilans, freins, ressentis, messages, midpoints] = await Promise.all([
    db.$queryRaw<typeof vide>`
      SELECT c.first_name AS prenom, d.answers::text AS texte, d.submitted_at AS quand
        FROM reboot_diagnostics d JOIN clients c ON c.id::text = d.client_id::text
       ORDER BY d.submitted_at DESC LIMIT 100
    `.catch(() => vide),

    db.$queryRaw<typeof vide>`
      SELECT c.first_name AS prenom, b.temoignage AS texte, b.submitted_at AS quand
        FROM reboot_bilans b JOIN clients c ON c.id::text = b.client_id::text
       WHERE b.temoignage IS NOT NULL
       ORDER BY b.submitted_at DESC LIMIT 100
    `.catch(() => vide),

    db.$queryRaw<typeof vide>`
      SELECT c.first_name AS prenom, b.intention_texte AS texte, b.intention_at AS quand
        FROM reboot_bilans b JOIN clients c ON c.id::text = b.client_id::text
       WHERE b.intention_texte IS NOT NULL
       ORDER BY b.intention_at DESC LIMIT 100
    `.catch(() => vide),

    db.$queryRaw<typeof vide>`
      SELECT c.first_name AS prenom, k.feeling AS texte, k.submitted_at AS quand
        FROM reboot_session_checkins k JOIN clients c ON c.id::text = k.client_id::text
       WHERE k.feeling IS NOT NULL
       ORDER BY k.submitted_at DESC LIMIT 200
    `.catch(() => vide),

    db.$queryRaw<typeof vide>`
      SELECT c.first_name AS prenom, m.content AS texte, m.created_at AS quand
        FROM messages m JOIN clients c ON c.id = m.client_id
       WHERE m.sender_role = 'client'
       ORDER BY m.created_at DESC LIMIT 200
    `.catch(() => vide),

    // Deux champs libres au mi-parcours : le ressenti et, plus précieux
    // encore, ce dont la personne dit avoir besoin.
    db.$queryRaw<typeof vide>`
      SELECT c.first_name AS prenom,
             concat_ws(' — ', nullif(p.feeling,''), nullif(p.besoin_aide,'')) AS texte,
             p.submitted_at AS quand
        FROM reboot_mid_checkins p JOIN clients c ON c.id::text = p.client_id::text
       WHERE coalesce(p.feeling,'') <> '' OR coalesce(p.besoin_aide,'') <> ''
       ORDER BY p.submitted_at DESC LIMIT 100
    `.catch(() => vide),
  ]);

  // Les témoignages publiables sont signalés à part : ce sont les seuls qui
  // peuvent être cités tels quels, et les confondre avec les autres ferait
  // publier une phrase que personne n'a autorisée.
  const publiables = await db.$queryRaw<{ prenom: string; texte: string }[]>`
    SELECT c.first_name AS prenom, b.temoignage AS texte
      FROM reboot_bilans b JOIN clients c ON c.id::text = b.client_id::text
     WHERE b.temoignage IS NOT NULL AND b.temoignage_publiable = true
  `.catch(() => []);

  return NextResponse.json({
    avertissement:
      "Mots bruts de clients réels. Rien n'est publiable sans accord, sauf la section « témoignagesPubliables ».",
    diagnosticsDeDepart: nettoyer(diagnostics, "diagnostic"),
    temoignagesDeFin: nettoyer(bilans, "bilan"),
    cequiFreine: nettoyer(freins, "refus accompagnement"),
    ressentisApresSeance: nettoyer(ressentis, "après séance"),
    messagesAuCoach: nettoyer(messages, "messagerie"),
    miParcours: nettoyer(midpoints, "mi-parcours"),
    temoignagesPubliables: publiables,
  });
}
