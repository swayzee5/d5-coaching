import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const groups = await db.challengeGroup.findMany({
    orderBy: { startDate: "desc" },
    include: { _count: { select: { participants: true } } },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.name || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: "Nom, date de début et date de fin requis" },
        { status: 400 }
      );
    }

    const group = await db.challengeGroup.create({
      data: {
        name: String(body.name).trim(),
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        maxSize: body.maxSize ? Number(body.maxSize) : 10,
        status: body.status ?? "UPCOMING",
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
