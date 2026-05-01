import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prospect = await db.prospect.findUnique({
    where: { id: params.id },
    include: {
      summaries: { orderBy: { createdAt: "desc" } },
      challengeParticipants: { include: { group: true } },
      coachingClient: true,
    },
  });
  if (!prospect) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(prospect);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const allowed = [
      "name", "phone", "email", "age", "weight", "height",
      "availableDays", "nutritionInfo", "photosReceived", "onboardingDone",
      "manychatId", "notes", "status",
      "qualifObjectif", "qualifDelai", "qualifFrein", "qualifExperience",
      "qualifDisponible", "qualifSante", "qualifMotivation", "qualifBudget",
    ];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }

    const prospect = await db.prospect.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(prospect);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await db.prospect.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
