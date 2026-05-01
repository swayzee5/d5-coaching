import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const allowed = [
      "day1Done", "day2Done", "day3Done", "day4Done",
      "day5Done", "day6Done", "day7Done",
      "engagementScore", "isSerious", "coachNotes",
    ];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }

    const participant = await db.challengeParticipant.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(participant);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
