import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    if (!body.prospectId) {
      return NextResponse.json(
        { error: "prospectId requis" },
        { status: 400 }
      );
    }

    const group = await db.challengeGroup.findUnique({
      where: { id: params.id },
      include: { _count: { select: { participants: true } } },
    });

    if (!group) {
      return NextResponse.json({ error: "Groupe non trouvé" }, { status: 404 });
    }

    if (group._count.participants >= group.maxSize) {
      return NextResponse.json(
        { error: "Le groupe est complet" },
        { status: 409 }
      );
    }

    const participant = await db.challengeParticipant.create({
      data: {
        groupId: params.id,
        prospectId: body.prospectId,
      },
    });

    // Mettre à jour le statut du prospect
    await db.prospect.update({
      where: { id: body.prospectId },
      data: { status: "CHALLENGE" },
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Ce prospect est déjà dans ce groupe" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
