import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  generateOnboardingSummary,
  generatePreCallSummary,
} from "@/lib/claude";
import { SummaryType } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const { prospectId, type = "ONBOARDING" } = await req.json();

    if (!prospectId) {
      return NextResponse.json({ error: "prospectId requis" }, { status: 400 });
    }

    const prospect = await db.prospect.findUnique({
      where: { id: prospectId },
      include: {
        challengeParticipants: {
          include: { group: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect non trouvé" }, { status: 404 });
    }

    let content: string;
    if (type === "PRE_CALL") {
      content = await generatePreCallSummary(prospect);
    } else {
      content = await generateOnboardingSummary(prospect);
    }

    const summary = await db.aISummary.create({
      data: {
        prospectId,
        type: type as SummaryType,
        content,
      },
    });

    return NextResponse.json(summary, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
