import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") as string | null;

  const prospects = await db.prospect.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      summaries: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { challengeParticipants: true } },
    },
  });

  return NextResponse.json(prospects);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.name || !body.phone) {
      return NextResponse.json(
        { error: "Nom et téléphone requis" },
        { status: 400 }
      );
    }

    const prospect = await db.prospect.create({
      data: {
        name: String(body.name).trim(),
        phone: String(body.phone).trim(),
        email: body.email ? String(body.email).trim() : undefined,
        age: body.age ? Number(body.age) : undefined,
        weight: body.weight ? Number(body.weight) : undefined,
        height: body.height ? Number(body.height) : undefined,
        availableDays: body.availableDays ?? undefined,
        nutritionInfo: body.nutritionInfo ?? undefined,
        photosReceived: Boolean(body.photosReceived),
        manychatId: body.manychatId ?? undefined,
        notes: body.notes ?? undefined,
        qualifObjectif: body.qualifObjectif ?? undefined,
        qualifDelai: body.qualifDelai ?? undefined,
        qualifFrein: body.qualifFrein ?? undefined,
        qualifExperience: body.qualifExperience ?? undefined,
        qualifDisponible: body.qualifDisponible ?? undefined,
        qualifSante: body.qualifSante ?? undefined,
        qualifMotivation: body.qualifMotivation ?? undefined,
        qualifBudget: body.qualifBudget ?? undefined,
        status: body.status ?? "LEAD",
      },
    });

    return NextResponse.json(prospect, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Ce numéro de téléphone est déjà enregistré" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
