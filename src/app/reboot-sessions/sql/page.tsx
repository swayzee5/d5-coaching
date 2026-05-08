import Link from "next/link";

const SQL = `-- ================================================================
-- Reboot 40 Challenge — Migration SQL
-- ================================================================

CREATE TABLE IF NOT EXISTS reboot_sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  muscle_group     text        NOT NULL,
  location         text        NOT NULL,
  order_index      int         NOT NULL DEFAULT 0,
  description      text,
  duration_minutes int,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reboot_exercises (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid        NOT NULL REFERENCES reboot_sessions(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  sets            int,
  reps            text,
  rest_seconds    int,
  vimeo_video_id  text,
  order_index     int         NOT NULL DEFAULT 0,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reboot_completions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  session_id   uuid        NOT NULL REFERENCES reboot_sessions(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  notes        text,
  UNIQUE(client_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_reboot_exercises_session  ON reboot_exercises(session_id);
CREATE INDEX IF NOT EXISTS idx_reboot_completions_client ON reboot_completions(client_id);
`;

export default function RebootSQLPage() {
  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/reboot-sessions" className="text-gray-400 hover:text-white text-sm">← Retour</Link>
        <h1 className="text-2xl font-bold text-white">Migration SQL — Reboot 40</h1>
      </div>
      <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 text-sm">
        <p className="text-amber-400 font-semibold mb-2">Instructions</p>
        <ol className="list-decimal list-inside space-y-1 text-amber-200/80">
          <li>Copiez le SQL ci-dessous</li>
          <li>Ouvrez Neon → SQL Editor</li>
          <li>Collez et cliquez Run</li>
        </ol>
      </div>
      <pre className="bg-gray-950 border border-gray-800 rounded-xl p-5 text-xs text-gray-300 overflow-x-auto whitespace-pre leading-relaxed max-h-[70vh] overflow-y-auto">{SQL}</pre>
    </div>
  );
}
