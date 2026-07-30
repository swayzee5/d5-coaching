import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: string[] = [];

  try {
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS session_completions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
        client_id UUID NOT NULL,
        completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        duration_minutes INTEGER,
        notes TEXT,
        initiated_by TEXT NOT NULL DEFAULT 'client'
      )
    `;
    await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_sc_client ON session_completions(client_id)`;
    await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_sc_session ON session_completions(session_id)`;
    results.push("✅ session_completions OK");
  } catch (e: any) {
    results.push(`❌ session_completions: ${e.message}`);
  }

  try {
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS exercise_set_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        completion_id UUID NOT NULL REFERENCES session_completions(id) ON DELETE CASCADE,
        exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        set_number INTEGER NOT NULL,
        weight_actual TEXT,
        reps_actual TEXT,
        completed BOOLEAN NOT NULL DEFAULT true
      )
    `;
    await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_esr_completion ON exercise_set_results(completion_id)`;
    results.push("✅ exercise_set_results OK");
  } catch (e: any) {
    results.push(`❌ exercise_set_results: ${e.message}`);
  }

  return NextResponse.json({ results });
}
