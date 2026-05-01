import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateOnboardingSummary } from "@/lib/claude";

/**
 * Webhook ManyChat → reçoit les données onboarding collectées par Sheed.
 *
 * ManyChat envoie un POST vers cette URL quand un flux se termine.
 * Configurer dans ManyChat : Actions → External Request → POST vers /api/webhooks/manychat
 *
 * Payload attendu :
 * {
 *   "secret": "votre_secret",
 *   "manychat_id": "12345",
 *   "name": "Jean Dupont",
 *   "phone": "+33612345678",
 *   "email": "jean@...",          // optionnel
 *   "age": 47,                    // optionnel
 *   "weight": 92.5,               // optionnel
 *   "height": 178,                // optionnel
 *   "available_days": ["Lundi","Mercredi","Vendredi"],
 *   "nutrition_info": "...",
 *   "photos_received": true,
 *   "qualif_objectif": "...",
 *   "qualif_frein": "...",
 *   ... (les 8 questions)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Vérification du secret
    const secret = process.env.MANYCHAT_WEBHOOK_SECRET;
    if (secret && body.secret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!body.phone) {
      return NextResponse.json({ error: "phone requis" }, { status: 400 });
    }

    const phone = String(body.phone).trim();
    const name = body.name ? String(body.name).trim() : "Inconnu";

    const data = {
      name,
      phone,
      email: body.email ?? undefined,
      age: body.age ? Number(body.age) : undefined,
      weight: body.weight ? Number(body.weight) : undefined,
      height: body.height ? Number(body.height) : undefined,
      availableDays: body.available_days
        ? JSON.stringify(body.available_days)
        : undefined,
      nutritionInfo: body.nutrition_info ?? undefined,
      photosReceived: Boolean(body.photos_received),
      onboardingDone: true,
      manychatId: body.manychat_id ? String(body.manychat_id) : undefined,
      status: "ONBOARDING" as const,
      qualifObjectif: body.qualif_objectif ?? undefined,
      qualifDelai: body.qualif_delai ?? undefined,
      qualifFrein: body.qualif_frein ?? undefined,
      qualifExperience: body.qualif_experience ?? undefined,
      qualifDisponible: body.qualif_disponible ?? undefined,
      qualifSante: body.qualif_sante ?? undefined,
      qualifMotivation: body.qualif_motivation ?? undefined,
      qualifBudget: body.qualif_budget ?? undefined,
    };

    // Upsert : crée si nouveau, met à jour si déjà connu
    const prospect = await db.prospect.upsert({
      where: { phone },
      create: data,
      update: {
        ...data,
        // Ne pas rétrograder le statut si déjà plus avancé
        status: undefined,
        onboardingDone: true,
        photosReceived: data.photosReceived || undefined,
      },
    });

    // Génération automatique du résumé IA si onboarding complet
    if (prospect.onboardingDone) {
      try {
        const content = await generateOnboardingSummary(prospect);
        await db.aISummary.create({
          data: {
            prospectId: prospect.id,
            type: "ONBOARDING",
            content,
          },
        });
      } catch {
        // Résumé IA non bloquant
      }
    }

    return NextResponse.json({
      ok: true,
      prospectId: prospect.id,
      isNew: prospect.createdAt === prospect.updatedAt,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    console.error("[Webhook ManyChat]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
