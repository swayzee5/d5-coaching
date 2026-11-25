import { NextRequest } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { jsonUtf8 } from "@/lib/json-utf8";
import { cohorteEnCours, cequiManque, type Participant } from "@/lib/cohorte";

/**
 * Ce qui attend une action de Daye, une fois par jour, sans qu'il ouvre rien.
 *
 * C'est le point du système qui n'attend aucun geste du coach. Une requête,
 * un seuil, un e-mail — pas d'intelligence, et c'est voulu : comparer des
 * dates ne demande pas un modèle, et en mettre un là ajouterait un endroit
 * où ça peut se tromper.
 *
 * Deux choses y figurent : les participants qui ont décroché, et les
 * demandes de programme sans réponse. Un seul e-mail par jour plutôt que
 * deux alertes séparées — deux messages quotidiens finissent par n'en valoir
 * aucun.
 *
 * Une seule alerte par personne et par décrochage. Sans ce verrou, un
 * participant arrêté depuis six jours produirait six e-mails identiques, et
 * au troisième le coach cesserait de les lire — ce qui reviendrait à ne pas
 * les envoyer.
 *
 * La clé contient la date du jour où le décrochage a été constaté : quelqu'un
 * qui repart puis s'arrête à nouveau déclenche une nouvelle alerte, alors
 * qu'une clé réduite au prénom le lui interdirait pour toujours.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DESTINATAIRE = process.env.COACH_EMAIL ?? "d5fitnesstraining@gmail.com";
const FROM = "D5 Coaching <noreply@d5coaching-distance.com>";
const CRM = "https://crm.d5coaching-distance.com";

async function assurerJournal(): Promise<void> {
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS coach_alertes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cle TEXT NOT NULL UNIQUE,
      envoyee_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.catch(() => {});
}

/** Pose le verrou. `false` si l'alerte est déjà partie. */
async function verrou(cle: string): Promise<boolean> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    INSERT INTO coach_alertes (cle) VALUES (${cle})
    ON CONFLICT (cle) DO NOTHING RETURNING id
  `.catch(() => [] as { id: string }[]);
  return rows.length > 0;
}

function ligne(p: Participant): string {
  const manque = cequiManque(p);
  const detail =
    p.etat === "jamais_commence"
      ? "n'a jamais commencé"
      : `arrêté depuis ${p.joursSansAction} jours à ${p.etapes}/10`;
  return `
  <tr><td style="padding:12px 0;border-bottom:1px solid #1f1f1f;">
    <p style="margin:0;font-size:15px;font-weight:700;color:#fff;">${p.prenom} ${p.nom}</p>
    <p style="margin:4px 0 0;font-size:13px;color:#888;">
      Jour ${p.jour ?? "?"} — ${detail}${manque.length ? ` · il manque ${manque.join(", ")}` : ""}
    </p>
  </td></tr>`;
}

/** Une demande dans l'e-mail. L'attente est dite en jours, pas en date. */
function ligneDemande(d: {
  prenom: string;
  objectif: string;
  blessures: string | null;
  jours: number;
}): string {
  const attente =
    d.jours === 0 ? "aujourd'hui" : `il y a ${d.jours} jour${d.jours > 1 ? "s" : ""}`;
  return `
  <tr><td style="padding:12px 0;border-bottom:1px solid #1f1f1f;">
    <p style="margin:0;font-size:15px;font-weight:700;color:#fff;">${d.prenom}</p>
    <p style="margin:4px 0 0;font-size:13px;color:#888;">
      ${d.objectif} — demandé ${attente}
    </p>
    ${d.blessures ? `<p style="margin:4px 0 0;font-size:13px;color:#ff9f45;">⚠ ${d.blessures}</p>` : ""}
  </td></tr>`;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const parUrl = req.nextUrl.searchParams.get("secret");
  const autorise =
    !secret || req.headers.get("authorization") === `Bearer ${secret}` || parUrl === secret;
  if (!autorise) return jsonUtf8({ error: "Non autorisé" }, { status: 401 });

  // Permet d'essayer sans rien envoyer. Une alerte qu'on ne peut pas tester
  // sans la déclencher pour de vrai finit par n'être testée qu'en production.
  const essai = req.nextUrl.searchParams.get("essai") === "1";

  try {
    await assurerJournal();
    const participants = await cohorteEnCours();
    const aRelancer = participants.filter(
      (p) => p.etat === "decroche" || p.etat === "jamais_commence"
    );

    // Les demandes de programme sans programme actif. Annoncées une fois à
    // leur arrivée, puis une seconde fois au troisième jour d'attente : une
    // alerte unique se perd si elle tombe un jour chargé, et trois jours de
    // silence après un paiement se voient.
    type Demande = { client_id: string; prenom: string; objectif: string; blessures: string | null; submitted_at: Date };
    const demandes = await db.$queryRaw<Demande[]>`
      SELECT d.client_id::text AS client_id, c.first_name AS prenom,
             d.objectif, d.blessures, d.submitted_at
        FROM programme_demandes d
        JOIN clients c ON c.id::text = d.client_id::text
       WHERE c.is_active = true
         AND NOT EXISTS (
           SELECT 1 FROM training_programs p
            WHERE p.client_id::text = d.client_id::text AND p.is_active = true
         )
       ORDER BY d.submitted_at ASC
    `.catch(() => [] as Demande[]);

    const demandesASignaler: (Demande & { jours: number })[] = [];
    for (const d of demandes) {
      const jours = Math.floor((Date.now() - new Date(d.submitted_at).getTime()) / 86_400_000);
      const envoye = new Date(d.submitted_at).toISOString().slice(0, 10);
      const cle = jours >= 3 ? `demande_relance_${d.client_id}_${envoye}` : `demande_${d.client_id}_${envoye}`;
      if (essai) {
        demandesASignaler.push({ ...d, jours });
        continue;
      }
      if (await verrou(cle)) demandesASignaler.push({ ...d, jours });
    }

    const jour = new Date().toISOString().slice(0, 10);
    const nouveaux: Participant[] = [];
    const deja: string[] = [];

    for (const p of aRelancer) {
      // Le verrou porte sur la personne et sur le jour où son décrochage a
      // commencé, pas sur aujourd'hui : sinon l'alerte repartirait chaque
      // matin tant qu'il n'a rien fait.
      const debut = p.derniereAction
        ? new Date(p.derniereAction).toISOString().slice(0, 10)
        : "jamais";
      const cle = `decrochage_${p.clientId}_${debut}`;
      if (essai) {
        nouveaux.push(p);
        continue;
      }
      if (await verrou(cle)) nouveaux.push(p);
      else deja.push(p.prenom);
    }

    if (nouveaux.length === 0 && demandesASignaler.length === 0) {
      return jsonUtf8({
        jour,
        aRelancer: aRelancer.length,
        demandesEnAttente: demandes.length,
        nouvelles: 0,
        déjàSignalés: deja,
        message: "Rien de neuf, aucun e-mail envoyé.",
      });
    }

    const html = `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#111;border-radius:16px;border:1px solid #222;overflow:hidden;">
  <tr><td style="padding:28px 36px 20px;border-bottom:1px solid #1a1a1a;">
    <p style="margin:0;font-size:20px;font-weight:900;color:#ff6a00;">D5 COACHING</p>
  </td></tr>
  <tr><td style="padding:28px 36px;">
    ${demandesASignaler.length > 0 ? `
    <h1 style="margin:0 0 6px;font-size:21px;font-weight:800;color:#fff;">
      ${demandesASignaler.length} programme${demandesASignaler.length > 1 ? "s" : ""} à construire
    </h1>
    <p style="margin:0 0 16px;font-size:14px;color:#888;line-height:1.6;">
      Ils ont rempli leur formulaire et attendent.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">${demandesASignaler.map(ligneDemande).join("")}</table>
    <a href="${CRM}/dashboard"
       style="display:inline-block;margin:20px 0 28px;padding:13px 22px;background:#ff6a00;border-radius:10px;
              color:#fff;font-size:14px;font-weight:700;text-decoration:none;">
      Ouvrir le tableau de bord →
    </a>` : ""}

    ${nouveaux.length > 0 ? `
    <h1 style="margin:0 0 6px;font-size:21px;font-weight:800;color:#fff;">
      ${nouveaux.length} participant${nouveaux.length > 1 ? "s" : ""} à relancer
    </h1>
    <p style="margin:0 0 16px;font-size:14px;color:#888;line-height:1.6;">
      Un message aujourd'hui vaut mieux qu'un bilan dans six jours.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">${nouveaux.map(ligne).join("")}</table>
    <a href="${CRM}/cohorte"
       style="display:inline-block;margin-top:20px;padding:13px 22px;background:#ff6a00;border-radius:10px;
              color:#fff;font-size:14px;font-weight:700;text-decoration:none;">
      Ouvrir la cohorte →
    </a>` : ""}
  </td></tr>
</table>
</td></tr></table></body></html>`;

    if (!process.env.RESEND_API_KEY) {
      return jsonUtf8({
        jour,
        envoyé: false,
        raison: "RESEND_API_KEY absent : l'e-mail n'est pas parti.",
        auraitSignalé: nouveaux.map((p) => p.prenom),
      });
    }

    if (!essai) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: FROM,
        to: DESTINATAIRE,
        // Le sujet dit ce qu'il y a dedans : un objet toujours identique
        // finit par ne plus être ouvert.
        subject: [
          demandesASignaler.length > 0
            ? `${demandesASignaler.length} programme${demandesASignaler.length > 1 ? "s" : ""} à construire`
            : null,
          nouveaux.length > 0
            ? `${nouveaux.length} participant${nouveaux.length > 1 ? "s" : ""} à relancer`
            : null,
        ]
          .filter(Boolean)
          .join(" · ") + " — D5",
        html,
      });
    }

    return jsonUtf8({
      jour,
      essai,
      envoyé: !essai,
      destinataire: DESTINATAIRE,
      programmesÀConstruire: demandesASignaler.map((d) => `${d.prenom} (${d.jours} j)`),
      signalés: nouveaux.map((p) => `${p.prenom} (${p.etapes}/10)`),
      déjàSignalés: deja,
    });
  } catch (err) {
    console.error("[cron/cohorte-alerte]", err);
    return jsonUtf8({ error: String(err).slice(0, 300) }, { status: 500 });
  }
}
