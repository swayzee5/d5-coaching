import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/utils";

/**
 * POST /api/session
 *
 * Appelé par la page de confirmation WordPress au chargement (fetch côté client).
 * Crée immédiatement le prospect en DB avec toutes les données Facebook,
 * et génère un sessionToken court que la page glisse dans le bouton WhatsApp.
 *
 * Le prospect envoie ensuite "D5-{token}" à Sheed.
 * ManyChat résout le token via GET /api/session/lookup pour récupérer les données.
 *
 * Payload (envoyé par la page de confirmation via les params URL Facebook) :
 * {
 *   "full_name": "Mohamed Benali",
 *   "phone": "+33612345678",
 *   "email": "m@example.com",
 *   "situation_pro": "Cadre supérieur",
 *   "objectif": "Perdre du ventre",
 *   "motivation": "Mariage dans 6 mois",
 *   "budget": "300-500€/mois"
 * }
 *
 * Réponse :
 * { "token": "A3F9KZ", "whatsappUrl": "https://wa.me/33XXXXXXXXX?text=D5-A3F9KZ" }
 */

const WHATSAPP_NUMBER = process.env.WHATSAPP_SHEED_NUMBER ?? "";

function generateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < 6; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.phone || !body.full_name) {
      return NextResponse.json(
        { error: "phone et full_name requis" },
        { status: 400 }
      );
    }

    const phone = normalizePhone(String(body.phone).trim());
    const name = String(body.full_name).trim();

    // Génère un token unique (retry si collision)
    let token: string = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateToken();
      const exists = await db.prospect.findFirst({
        where: { sessionToken: candidate },
        select: { id: true },
      });
      if (!exists) {
        token = candidate;
        break;
      }
    }
    if (!token) {
      return NextResponse.json(
        { error: "Impossible de générer un token" },
        { status: 500 }
      );
    }

    const notes = body.situation_pro
      ? `Situation pro : ${body.situation_pro}`
      : undefined;

    await db.prospect.upsert({
      where: { phone },
      create: {
        name,
        phone,
        email: body.email ? String(body.email).trim() : undefined,
        qualifObjectif: body.objectif ?? undefined,
        qualifMotivation: body.motivation ?? undefined,
        qualifBudget: body.budget ?? undefined,
        notes,
        sessionToken: token,
        status: "LEAD",
      },
      update: {
        name,
        email: body.email ? String(body.email).trim() : undefined,
        qualifObjectif: body.objectif ?? undefined,
        qualifMotivation: body.motivation ?? undefined,
        qualifBudget: body.budget ?? undefined,
        notes,
        sessionToken: token,
      },
    });

    const whatsappUrl = WHATSAPP_NUMBER
      ? `https://wa.me/${WHATSAPP_NUMBER.replace(/\+/g, "")}?text=${encodeURIComponent(`D5-${token}`)}`
      : null;

    return NextResponse.json({ token, whatsappUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    console.error("[POST /api/session]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
