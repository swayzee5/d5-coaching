import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const group = await db.challengeGroup.findUnique({
    where: { id: params.id },
    include: {
      participants: { include: { prospect: true } },
    },
  });
  if (!group) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(group);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.status) data.status = body.status;
    if (body.name) data.name = String(body.name).trim();
    if (body.coachNotes !== undefined) data.coachNotes = body.coachNotes;
    if (body.startDate) data.startDate = new Date(body.startDate);
    if (body.endDate) data.endDate = new Date(body.endDate);
    if (body.maxSize) data.maxSize = Number(body.maxSize);

    const group = await db.challengeGroup.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(group);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
