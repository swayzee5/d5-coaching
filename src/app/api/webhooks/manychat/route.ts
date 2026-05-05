import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateOnboardingSummary } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const secret = process.env.MANYCHAT_WEBHOOK_SECRET;
    if (secret && body.secret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const phone = body.phone ? String(body.phone).trim() : null;
    const name = body.name ? String(body.name).trim() : "Inconnu";
    const manychatId = body.manychat_id ? String(body.manychat_id) : null;

    if (!phone && !manychatId) {
      return NextResponse.json({ error: "phone ou manychat_id requis" }, { status: 400 });
    }

    const data = {
      name,
      phone: phone ?? undefined,
      email: body.email ? String(body.email) : undefined,
      age: body.age ? Number(body.age) : undefined,
      weight: body.weight ? Number(body.weight) : undefined,
      height: body.height ? Number(body.height) : undefined,
      availableDays: body.available_days
        ? JSON.stringify(body.available_days)
        : undefined,
      nutritionInfo: body.nutrition_info ?? undefined,
      photosReceived: Boolean(body.photos_received),
      onboardingDone: true,
      manychatId: manychatId ?? undefined,
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

    let prospect;

    // Cherche d'abord par téléphone, puis par manychat_id
    if (phone) {
      const existing = await db.prospect.findUnique({ where: { phone } });
      if (existing) {
        prospect = await db.prospect.update({
          where: { phone },
          data: { ...data, status: undefined, onboardingDone: true },
        });
      } else {
        prospect = await db.prospect.create({ data });
      }
    } else if (manychatId) {
      const existing = await db.prospect.findFirst({ where: { manychatId } });
      if (existing) {
        prospect = await db.prospect.update({
          where: { id: existing.id },
          data: { ...data, status: undefined, onboardingDone: true },
        });
      } else {
        prospect = await db.prospect.create({ data });
      }
    } else {
      prospect = await db.prospect.create({ data });
    }

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

    return NextResponse.json({ ok: true, prospectId: prospect.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    console.error("[Webhook ManyChat]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
