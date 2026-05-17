import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, number | string> = {};

  // 1. Raw SQL tables (no Prisma FK cascade)
  try {
    const r1 = await db.$executeRaw`DELETE FROM reboot_completions`;
    results.reboot_completions = r1;
  } catch (e) { results.reboot_completions = "skipped (table may not exist)"; }

  try {
    const r2 = await db.$executeRaw`DELETE FROM reboot_mid_checkins`;
    results.reboot_mid_checkins = r2;
  } catch (e) { results.reboot_mid_checkins = "skipped"; }

  try {
    const r3 = await db.$executeRaw`DELETE FROM weekly_checkins`;
    results.weekly_checkins = r3;
  } catch (e) { results.weekly_checkins = "skipped"; }

  try {
    const r4 = await db.$executeRaw`DELETE FROM messages`;
    results.messages = r4;
  } catch (e) { results.messages = "skipped"; }

  // 2. AppClient — cascade deletes: progress_entries, nutrition_files,
  //    training_programs → training_sessions → exercises → set_results
  //                                          → session_completions → set_results
  const deleted = await db.appClient.deleteMany({});
  results.clients = deleted.count;

  return NextResponse.json({
    ok: true,
    message: `Reset complet — ${deleted.count} client(s) supprimé(s)`,
    details: results,
  });
}
