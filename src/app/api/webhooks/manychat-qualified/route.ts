import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateCoachNotificationSummary } from "@/lib/claude";
import { normalizePhone } from "@/lib/utils";

/**
 * Zapier → POST /api/webhooks/manychat-qualified
 *
 * Appelé par Zapier quand ManyChat ajoute le tag "Qualifié" au subscriber.
 * Ce webhook :
 *   1. Retrouve le prospect par téléphone ou manychat_id
 *   2. Met à jour les données collectées par la séquence Sheed
 *   3. Génère une phrase de notification pour le coach (Claude Haiku)
 *   4. Envoie la notification sur le WhatsApp personnel du coach via CallMeBot (si configuré)
 *   5. Retourne { ok, summary } → Zapier peut aussi s'en servir comme fallback
 *
 * Payload attendu :
 * {
 *   "secret": "...",
 *   "phone": "+33612345678",
 *   "manychat_id": "12345",        // optionnel mais recommandé
 *   "qualif_experience": "Non inscrit en salle",
 *   "qualif_disponible": "Matin en semaine",
 *   "qualif_frein": "Manque de temps",
 *   "qualif_motivation": "9"       // sur 10, réponse ManyChat
 * }
 *
 * Variables d'environnement pour la notification CallMeBot :
 *   CALLMEBOT_PHONE    → numéro WhatsApp du coach (format international sans +, ex: 33612345678)
 *   CALLMEBOT_API_KEY  → clé API CallMeBot (activation via WhatsApp : wa.me/34644 + "I allow callmebot to send me messages")
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const secret = process.env.MANYCHAT_WEBHOOK_SECRET;
    if (secret && body.secret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!body.phone && !body.manychat_id) {
      return NextResponse.json(
        { error: "phone ou manychat_id requis" },
        { status: 400 }
      );
    }

    const phone = body.phone ? normalizePhone(String(body.phone).trim()) : undefined;
    const manychatId = body.manychat_id ? String(body.manychat_id) : undefined;

    // Recherche du prospect par téléphone en priorité, sinon par manychatId
    const prospect = phone
      ? await db.prospect.findUnique({ where: { phone } })
      : manychatId
      ? await db.prospect.findFirst({ where: { manychatId } })
      : null;

    if (!prospect) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
    }

    // Met à jour les données collectées pendant la séquence Sheed
    const updated = await db.prospect.update({
      where: { id: prospect.id },
      data: {
        manychatId: manychatId ?? prospect.manychatId,
        qualifExperience: body.qualif_experience ?? prospect.qualifExperience,
        qualifDisponible: body.qualif_disponible ?? prospect.qualifDisponible,
        qualifFrein: body.qualif_frein ?? prospect.qualifFrein,
        qualifMotivation: body.qualif_motivation ?? prospect.qualifMotivation,
        // Ne rétrograde pas le statut si déjà plus avancé
        status:
          prospect.status === "LEAD" ? "ONBOARDING" : prospect.status,
      },
    });

    // Génère la phrase de notification pour le coach
    let summary = "";
    try {
      summary = await generateCoachNotificationSummary(updated);
    } catch {
      // Non bloquant : on continue même si Claude échoue
      summary = `${updated.name} — ${updated.qualifObjectif ?? "objectif non renseigné"} — ${updated.qualifDisponible ?? "dispo inconnue"}`;
    }

    // Notification CallMeBot sur le WhatsApp personnel du coach
    const callmebotPhone = process.env.CALLMEBOT_PHONE;
    const callmebotApiKey = process.env.CALLMEBOT_API_KEY;

    if (callmebotPhone && callmebotApiKey) {
      try {
        const message = encodeURIComponent(`🔔 Nouveau prospect qualifié\n${summary}\n\nFiche : ${process.env.NEXT_PUBLIC_APP_URL}/prospects/${updated.id}`);
        const url = `https://api.callmebot.com/whatsapp.php?phone=${callmebotPhone}&text=${message}&apikey=${callmebotApiKey}`;
        await fetch(url);
      } catch {
        // Non bloquant
      }
    }

    return NextResponse.json({ ok: true, summary, prospectId: updated.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    console.error("[Webhook ManyChat Qualifié]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
