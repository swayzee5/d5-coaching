import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateChallengeWeekSummary } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const { groupId } = await req.json();

    if (!groupId) {
      return NextResponse.json({ error: "groupId requis" }, { status: 400 });
    }

    const group = await db.challengeGroup.findUnique({
      where: { id: groupId },
      include: {
        participants: { include: { prospect: true } },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Groupe non trouvé" }, { status: 404 });
    }

    const content = await generateChallengeWeekSummary(group);

    // Sauvegarder dans les notes du groupe
    await db.challengeGroup.update({
      where: { id: groupId },
      data: { coachNotes: content },
    });

    return NextResponse.json({ ok: true, content });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
