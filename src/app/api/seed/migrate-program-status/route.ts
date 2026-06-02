import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== "d5") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.$executeRaw`
    ALTER TABLE training_programs
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'DRAFT'
  `;

  return NextResponse.json({ ok: true, message: "Migration done: training_programs.status column added" });
}
