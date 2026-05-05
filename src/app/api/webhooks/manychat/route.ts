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

    if (!body.phone) {
      return NextResponse.json({ error: "phone requis" }, { status: 400 });
    }

    const phone = String(body.phone).trim();
    const name = body.name ? String(body.name).trim() : "Inconnu";

    const safeInt = (v: unknown) => {
      const n = Number(v);
      return v && !isNaN(n) ? n : undefined;
    };
    const safeFloat = (v: unknown) => {
      const n = Number(v);
      return v && !isNaN(n) ? n : undefined;
    };

    const data = {
      name,
      phone,
      email: body.email ? String(body.email) : undefined,
      age: safeInt(body.age),
      weight: safeFloat(body.weight),
      height: safeFloat(body.height),
      availableDays: body.available_days
        ? JSON.stringify(body.available_days)
        : undefined,
      nutritionInfo: body.nutrition_info ? String(body.nutrition_info) : undefined,
      photosReceived: Boolean(body.photos_received),
      onboardingDone: true,
      manychatId: body.manychat_id ? String(body.manychat_id) : undefined,
      status: "ONBOARDING" as const,
      qualifObjectif: body.qualif_objectif ? String(body.qualif_objectif) : undefined,
      qualifDelai: body.qualif_delai ? String(body.qualif_delai) : undefined,
      qualifFrein: body.qualif_frein ? String(body.qualif_frein) : undefined,
      qualifExperience: body.qualif_experience ? String(body.qualif_experience) : undefined,
      qualifDisponible: body.qualif_disponible ? String(body.qualif_disponible) : undefined,
      qualifSante: body.qualif_sante ? String(body.qualif_sante) : undefined,
      qualifMotivation: body.qualif_motivation ? String(body.qualif_motivation) : undefined,
      qualifBudget: body.qualif_budget ? String(body.qualif_budget) : undefined,
    };

    const existing = await db.prospect.findUnique({ where: { phone } });
    let prospect;
    if (existing) {
      prospect = await db.prospect.update({
        where: { phone },
        data: { ...data, status: undefined, onboardingDone: true },
      });
    } else {
      prospect = await db.prospect.create({ data });
    }

    if (prospect.onboardingDone) {
      try {
        const content = await generateOnboardingSummary(prospect);
        await db.aISummary.create({
          data: { prospectId: prospect.id, type: "ONBOARDING", content },
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
