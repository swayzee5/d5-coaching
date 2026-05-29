export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { mergeExercises } from "./actions";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Doublons exercices — D5 CRM" };

type ExRow = {
  id: string;
  name: string;
  description: string | null;
  muscles: string[];
  vimeo_video_id: string | null;
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 100;
  if (na.includes(nb) || nb.includes(na)) return 92;
  const wordsA = new Set(na.split(" ").filter((w) => w.length > 2));
  const wordsB = nb.split(" ").filter((w) => w.length > 2);
  if (wordsA.size === 0 || wordsB.length === 0) return 0;
  const common = wordsB.filter((w) => wordsA.has(w)).length;
  const total = Math.max(wordsA.size, wordsB.length);
  return Math.round((common / total) * 85);
}

type Pair = { a: ExRow; b: ExRow; score: number };

export default async function DoublonsPage({
  searchParams,
}: {
  searchParams: { merged?: string; threshold?: string };
}) {
  const exercises = await db.$queryRaw<ExRow[]>`
    SELECT id::text, name, description, muscles, vimeo_video_id
    FROM exercise_library WHERE is_active = true ORDER BY name ASC
  `.catch(() => [] as ExRow[]);

  const threshold = Math.max(55, Math.min(99, parseInt(searchParams.threshold ?? "65", 10)));

  // Find all pairs above threshold
  const pairs: Pair[] = [];
  for (let i = 0; i < exercises.length; i++) {
    for (let j = i + 1; j < exercises.length; j++) {
      const score = similarity(exercises[i].name, exercises[j].name);
      if (score >= threshold) {
        pairs.push({ a: exercises[i], b: exercises[j], score });
      }
    }
  }
  pairs.sort((x, y) => y.score - x.score);

  function scoreColor(score: number) {
    if (score >= 90) return "text-red-400 bg-red-500/10 border-red-500/30";
    if (score >= 75) return "text-orange-400 bg-orange-500/10 border-orange-500/30";
    return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/exercices" className="text-gray-500 hover:text-gray-300 text-sm">
            ← Bibliothèque
          </Link>
          <h1 className="text-xl font-bold text-white mt-1">Doublons potentiels</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {pairs.length} paire{pairs.length !== 1 ? "s" : ""} détectée{pairs.length !== 1 ? "s" : ""} · seuil {threshold}%
          </p>
        </div>
        <form method="GET" className="flex items-center gap-2">
          <label className="text-gray-400 text-sm">Seuil :</label>
          <select
            name="threshold"
            defaultValue={threshold}
            onChange={undefined}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
          >
            <option value="90">90% — quasi identiques</option>
            <option value="75">75% — très similaires</option>
            <option value="65">65% — similaires (défaut)</option>
            <option value="55">55% — proches</option>
          </select>
          <button
            type="submit"
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
          >
            Filtrer
          </button>
        </form>
      </div>

      {searchParams.merged && (
        <div className="px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
          ✓ Exercice supprimé avec succès
        </div>
      )}

      {pairs.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">Aucun doublon trouvé avec un seuil de {threshold}%.</p>
          <p className="text-gray-600 text-sm mt-1">Essaie un seuil plus bas pour voir plus de résultats.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pairs.map((pair, idx) => (
            <div key={idx} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${scoreColor(pair.score)}`}>
                  {pair.score}% similaires
                </span>
                {pair.score >= 90 && (
                  <span className="text-red-400 text-xs">⚠ Probablement le même exercice</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[pair.a, pair.b].map((ex, i) => (
                  <div
                    key={ex.id}
                    className="bg-gray-800 rounded-xl p-4 space-y-2"
                  >
                    <p className="text-white font-semibold text-sm">{ex.name}</p>
                    {ex.description && (
                      <p className="text-gray-500 text-xs line-clamp-2">{ex.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {ex.muscles.map((m) => (
                        <span key={m} className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full">
                          {m}
                        </span>
                      ))}
                    </div>
                    {ex.vimeo_video_id ? (
                      <span className="text-green-400 text-xs">▶ Vidéo Vimeo liée</span>
                    ) : (
                      <span className="text-gray-600 text-xs">Pas de vidéo</span>
                    )}
                    <form action={mergeExercises}>
                      <input type="hidden" name="keepId" value={ex.id} />
                      <input type="hidden" name="deleteId" value={i === 0 ? pair.b.id : pair.a.id} />
                      <button
                        type="submit"
                        className="w-full mt-1 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-lg text-xs font-medium transition-colors"
                      >
                        Garder celui-ci → supprimer l&apos;autre
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
