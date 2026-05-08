import Link from "next/link";

const SQL = `-- ================================================================
-- Reboot 40 Challenge — Migration SQL à exécuter dans Neon
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

-- Séances template (6 sessions, insert uniquement si vide)
INSERT INTO reboot_sessions (name, muscle_group, location, order_index, description, duration_minutes)
SELECT * FROM (VALUES
  ('Pectoraux — Salle',  'pecs',   'salle',  1, 'Poitrine et triceps avec équipements de salle', 45),
  ('Pectoraux — Maison', 'pecs',   'maison', 2, 'Poitrine et triceps au poids du corps',         40),
  ('Dos — Salle',        'dos',    'salle',  3, 'Dos et biceps avec équipements de salle',        45),
  ('Dos — Maison',       'dos',    'maison', 4, 'Dos et biceps au poids du corps',                40),
  ('Jambes — Salle',     'jambes', 'salle',  5, 'Jambes et fessiers avec équipements de salle',  50),
  ('Jambes — Maison',    'jambes', 'maison', 6, 'Jambes et fessiers au poids du corps',           45)
) AS v(name, muscle_group, location, order_index, description, duration_minutes)
WHERE NOT EXISTS (SELECT 1 FROM reboot_sessions LIMIT 1);

-- Exercices par séance
DO $$
DECLARE
  s_pecs_salle    uuid;
  s_pecs_maison   uuid;
  s_dos_salle     uuid;
  s_dos_maison    uuid;
  s_jambes_salle  uuid;
  s_jambes_maison uuid;
BEGIN
  SELECT id INTO s_pecs_salle    FROM reboot_sessions WHERE muscle_group='pecs'   AND location='salle';
  SELECT id INTO s_pecs_maison   FROM reboot_sessions WHERE muscle_group='pecs'   AND location='maison';
  SELECT id INTO s_dos_salle     FROM reboot_sessions WHERE muscle_group='dos'    AND location='salle';
  SELECT id INTO s_dos_maison    FROM reboot_sessions WHERE muscle_group='dos'    AND location='maison';
  SELECT id INTO s_jambes_salle  FROM reboot_sessions WHERE muscle_group='jambes' AND location='salle';
  SELECT id INTO s_jambes_maison FROM reboot_sessions WHERE muscle_group='jambes' AND location='maison';

  IF NOT EXISTS (SELECT 1 FROM reboot_exercises WHERE session_id = s_pecs_salle) THEN
    INSERT INTO reboot_exercises (session_id, name, sets, reps, rest_seconds, order_index) VALUES
      (s_pecs_salle, 'Développé couché barre',      3, '12',  90, 0),
      (s_pecs_salle, 'Développé incliné haltères',  3, '10',  90, 1),
      (s_pecs_salle, 'Écartés haltères plat',       3, '12',  60, 2),
      (s_pecs_salle, 'Dips poitrine',               3, '10',  90, 3),
      (s_pecs_salle, 'Pompes — finisher',           2, 'max', 60, 4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM reboot_exercises WHERE session_id = s_pecs_maison) THEN
    INSERT INTO reboot_exercises (session_id, name, sets, reps, rest_seconds, order_index) VALUES
      (s_pecs_maison, 'Pompes standard',             4, '15',  60, 0),
      (s_pecs_maison, 'Pompes larges',               3, '12',  60, 1),
      (s_pecs_maison, 'Pompes inclinées (sur table)',3, '12',  60, 2),
      (s_pecs_maison, 'Pompes diamant',              3, '10',  60, 3),
      (s_pecs_maison, 'Planche',                     3, '45s', 45, 4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM reboot_exercises WHERE session_id = s_dos_salle) THEN
    INSERT INTO reboot_exercises (session_id, name, sets, reps, rest_seconds, order_index) VALUES
      (s_dos_salle, 'Tractions (ou tirage assisté)', 3, '8',   120, 0),
      (s_dos_salle, 'Rowing haltère unilatéral',     3, '12',   90, 1),
      (s_dos_salle, 'Tirage poulie haute pronation', 3, '12',   90, 2),
      (s_dos_salle, 'Rowing barre',                  3, '10',   90, 3),
      (s_dos_salle, 'Curl biceps haltères',          3, '12',   60, 4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM reboot_exercises WHERE session_id = s_dos_maison) THEN
    INSERT INTO reboot_exercises (session_id, name, sets, reps, rest_seconds, order_index) VALUES
      (s_dos_maison, 'Rowing sur table ou chaise',  3, '12',  90, 0),
      (s_dos_maison, 'Superman',                    3, '15',  60, 1),
      (s_dos_maison, 'Bon matin poids de corps',    3, '15',  60, 2),
      (s_dos_maison, 'Gainage planche',             3, '45s', 45, 3),
      (s_dos_maison, 'Curl biceps avec sac lest',   3, '15',  60, 4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM reboot_exercises WHERE session_id = s_jambes_salle) THEN
    INSERT INTO reboot_exercises (session_id, name, sets, reps, rest_seconds, order_index) VALUES
      (s_jambes_salle, 'Squats barre',            4, '12', 120, 0),
      (s_jambes_salle, 'Presse à jambes',         3, '15',  90, 1),
      (s_jambes_salle, 'Fentes haltères',         3, '12',  90, 2),
      (s_jambes_salle, 'Leg curl machine',        3, '12',  90, 3),
      (s_jambes_salle, 'Montées mollets debout',  4, '20',  45, 4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM reboot_exercises WHERE session_id = s_jambes_maison) THEN
    INSERT INTO reboot_exercises (session_id, name, sets, reps, rest_seconds, order_index) VALUES
      (s_jambes_maison, 'Squats poids de corps',   4, '20', 60, 0),
      (s_jambes_maison, 'Fentes avant alternées',  3, '15', 60, 1),
      (s_jambes_maison, 'Glute bridges',           3, '20', 45, 2),
      (s_jambes_maison, 'Squat sumo',              3, '15', 60, 3),
      (s_jambes_maison, 'Montées de genoux',       3, '30', 30, 4);
  END IF;
END $$;
`;

export default function RebootSQLPage() {
  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/reboot-sessions"
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          ← Retour
        </Link>
        <h1 className="text-2xl font-bold text-white">Migration SQL — Reboot 40</h1>
      </div>

      <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 text-sm">
        <p className="text-amber-400 font-semibold mb-2">Instructions</p>
        <ol className="list-decimal list-inside space-y-1 text-amber-200/80">
          <li>Copiez tout le SQL ci-dessous</li>
          <li>Ouvrez la console Neon → votre projet → SQL Editor</li>
          <li>Collez et cliquez Run</li>
          <li>
            Revenez sur{" "}
            <Link href="/reboot-sessions" className="underline text-amber-300">
              Séances Reboot 40
            </Link>{" "}
            pour vérifier que les 6 séances apparaissent
          </li>
        </ol>
      </div>

      <pre className="bg-gray-950 border border-gray-800 rounded-xl p-5 text-xs text-gray-300 overflow-x-auto whitespace-pre leading-relaxed max-h-[70vh] overflow-y-auto">
        {SQL}
      </pre>
    </div>
  );
}
