import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Zapier → POST /api/webhooks/facebook-lead
 *
 * Appelé par Zapier dès qu'un nouveau lead Facebook Lead Ads arrive.
 * Zapier doit aussi en parallèle : Google Sheets (add row) + ManyChat (create subscriber).
 *
 * Payload attendu :
 * {
 *   "secret": "...",
 *   "full_name": "Mohamed Benali",
 *   "phone": "+33612345678",       // format international obligatoire
 *   "email": "m@example.com",     // optionnel
 *   "situation_pro": "Cadre",     // champ Facebook custom
 *   "objectif": "Perdre du ventre",
 *   "motivation": "Mariage dans 6 mois",
 *   "budget": "Moins de 200€/mois"
 * }
 *
 * Réponse :
 * { "ok": true, "prospectId": "...", "isNew": true }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const secret = process.env.MANYCHAT_WEBHOOK_SECRET;
    if (secret && body.secret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!body.phone) {
      return NextResponse.json({ error: "phone requis" }, { status: 400 });
    }

    const phone = String(body.phone).trim();
    const name = body.full_name ? String(body.full_name).trim() : "Inconnu";

    // Enrichit les notes avec la situation pro si fournie
    const notes = body.situation_pro
      ? `Situation pro : ${body.situation_pro}`
      : undefined;

    const prospect = await db.prospect.upsert({
      where: { phone },
      create: {
        name,
        phone,
        email: body.email ? String(body.email).trim() : undefined,
        qualifObjectif: body.objectif ?? undefined,
        qualifMotivation: body.motivation ?? undefined,
        qualifBudget: body.budget ?? undefined,
        notes,
        status: "LEAD",
      },
      update: {
        // Met à jour uniquement les champs vides pour ne pas écraser l'onboarding
        name,
        email: body.email ? String(body.email).trim() : undefined,
        qualifObjectif: body.objectif ?? undefined,
        qualifMotivation: body.motivation ?? undefined,
        qualifBudget: body.budget ?? undefined,
        notes,
      },
    });

    const isNew = prospect.createdAt.getTime() === prospect.updatedAt.getTime();

    return NextResponse.json({ ok: true, prospectId: prospect.id, isNew });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    console.error("[Webhook Facebook Lead]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
