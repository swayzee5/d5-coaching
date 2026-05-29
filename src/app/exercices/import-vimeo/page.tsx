export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { assignVimeoToExercise, autoMatchAndAssign } from "./actions";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Import Vimeo — D5 CRM" };

type VimeoVideo = {
  uri: string;
  name: string;
  pictures?: { sizes: { width: number; link: string }[] };
  duration: number;
};

type ExerciseRow = { id: string; name: string; vimeo_video_id: string | null };

async function fetchAllVimeoVideos(): Promise<VimeoVideo[]> {
  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) return [];
  const videos: VimeoVideo[] = [];
  let url: string | null =
    "https://api.vimeo.com/me/videos?per_page=100&fields=uri,name,pictures,duration";
  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: `bearer ${token}`,
        Accept: "application/vnd.vimeo.*+json;version=3.4",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) break;
    const data = await res.json();
    videos.push(...(data.data ?? []));
    url = data.paging?.next ? `https://api.vimeo.com${data.paging.next}` : null;
  }
  return videos;
}

const NON_EXERCISE_BLOCKLIST = [
  "témoignage", "temoignage", "testimonial",
  "smoothie", "recette", "cuisine", "repas", "nutrition",
  "alimentaire", "petit dejeuner", "déjeuner", "diner", "snack",
  "boisson", "shake", "protéine poudre", "complement", "supplément",
  "transformation", "avant apres", "avant après", "before after",
  "résultat", "resultat", "success story",
  "interview", "podcast", "webinar", "webinaire",
  "motivation", "présentation", "presentation",
  "bienvenue", "welcome", "intro", "trailer",
  "vente", "offre", "promo", "réduction", "reduction",
  "inscription", "rejoindre", "consultation", "appel stratégique",
  "publicité", "publicite", "annonce",
  "avis client", "avis de",
];

const EXERCISE_KEYWORDS = [
  "squat", "fente", "lunge", "deadlift", "soulev", "tirage", "rowing",
  "row", "traction", "dips", "pompe", "push", "pull", "press", "developp",
  "curl", "extension", "kickback", "hip thrust", "hip hinge", "gainage",
  "planche", "crunch", "burpee", "jumping", "saut", "step", "swing",
  "snatch", "clean", "thruster", "overhead", "rdl", "nordic",
  "glute bridge", "mountain climber", "russian twist", "bicycle",
  "leg raise", "knee raise", "bird dog", "dead bug", "hollow", "superman",
  "face pull", "upright row", "lateral raise", "front raise", "shrug",
  "hyperextension", "good morning",
  "pectoral", "pecto", "biceps", "triceps", "epaule", "shoulder",
  "fessier", "glute", "quadriceps", "quad", "ischios", "mollet", "calf",
  "abdominaux", "abdo", "core", "lombaire", "haltere", "kettlebell",
  "elastique", "resistance band", "barbell", "dumbbell", "cable", "trx",
  "exercice", "exercise", "mouvement", "workout", "cardio", "mobilit",
  "etirement", "stretching", "echauffement", "entrainement", "seance",
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isBlocklisted(name: string): boolean {
  const n = normalize(name);
  return NON_EXERCISE_BLOCKLIST.some((kw) => n.includes(normalize(kw)));
}

function looksLikeExercise(name: string): boolean {
  const n = normalize(name);
  return EXERCISE_KEYWORDS.some((kw) => n.includes(normalize(kw)));
}

function score(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 100;
  if (na.includes(nb) || nb.includes(na)) return 90;
  const wordsA = new Set(na.split(" "));
  const wordsB = nb.split(" ");
  const common = wordsB.filter((w) => w.length > 2 && wordsA.has(w)).length;
  const total = Math.max(wordsA.size, wordsB.length);
  return total > 0 ? Math.round((common / total) * 80) : 0;
}

export default async function ImportVimeoPage({
  searchParams,
}: {
  searchParams: { q?: string; matched?: string; created?: string; skipped?: string };
}) {
  const [videos, exercises] = await Promise.all([
    fetchAllVimeoVideos(),
    db.$queryRaw<ExerciseRow[]>`
      SELECT id::text, name, vimeo_video_id
      FROM exercise_library WHERE is_active = true ORDER BY name ASC
    `.catch(() => [] as ExerciseRow[]),
  ]);

  const q = searchParams.q?.toLowerCase() ?? "";
  const filtered = q ? videos.filter((v) => v.name.toLowerCase().includes(q)) : videos;

  const linkedCount = exercises.filter((e) => e.vimeo_video_id).length;
  const totalExercises = exercises.length;

  const THRESHOLD = 60;
  const previews = videos.map((video) => {
    const vimeoId = video.uri.split("/").pop() ?? "";
    const blocked = isBlocklisted(video.name);
    const isExercise = looksLikeExercise(video.name);
    let bestEx: ExerciseRow | null = null;
    let bestScore = 0;
    if (!blocked) {
      for (const ex of exercises) {
        const s = score(video.name, ex.name);
        if (s > bestScore) { bestScore = s; bestEx = ex; }
      }
    }
    return { video, vimeoId, bestEx, bestScore, blocked, isExercise };
  });

  const willMatchCount = previews.filter(
    (p) => !p.blocked && p.bestScore >= THRESHOLD && !p.bestEx?.vimeo_video_id
  ).length;
  const willCreateCount = previews.filter(
    (p) => !p.blocked && p.bestScore < THRESHOLD && p.isExercise
  ).length;
  const willSkipCount = previews.filter(
    (p) => p.blocked || (!p.isExercise && p.bestScore < THRESHOLD)
  ).length;

  function thumbUrl(v: VimeoVideo): string {
    const sizes = v.pictures?.sizes ?? [];
    return sizes.find((s) => s.width >= 200)?.link || sizes[sizes.length - 1]?.link || "";
  }

  function formatDuration(s: number): string {
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  }

  const didRun = searchParams.matched !== undefined;

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/exercices" className="text-gray-500 hover:text-gray-300 text-sm">← Bibliothèque</Link>
          <h1 className="text-xl font-bold text-white mt-1">Import Vimeo</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {videos.length} vidéos · {linkedCount}/{totalExercises} exercices avec vidéo
          </p>
        </div>
      </div>

      {/* Bloc auto-match */}
      <div className="bg-brand-500/10 border border-brand-500/30 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-white font-semibold">🤖 Matching automatique</p>
            <p className="text-gray-400 text-sm mt-1">
              Associe automatiquement les vidéos aux exercices par nom. Les témoignages, recettes et pubs sont ignorés.
            </p>
            <div className="flex gap-4 mt-3 text-sm flex-wrap">
              <span className="text-green-400">✓ {willMatchCount} associations trouvées</span>
              <span className="text-blue-400">+ {willCreateCount} nouveaux exercices</span>
              <span className="text-gray-500">◌ {willSkipCount} vidéos ignorées</span>
            </div>
          </div>
          <form action={autoMatchAndAssign}>
            <button
              type="submit"
              className="px-5 py-3 bg-brand-500 hover:bg-brand-400 text-white rounded-xl font-bold text-sm transition-colors whitespace-nowrap"
            >
              ⚡ Tout matcher
            </button>
          </form>
        </div>
        {didRun && (
          <div className="mt-3 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
            ✓ Terminé — {searchParams.matched} associations · {searchParams.created} créés · {searchParams.skipped} ignorés
          </div>
        )}
      </div>

      {/* Recherche */}
      <form method="GET">
        <input
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Rechercher une vidéo..."
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
        />
      </form>

      {/* Liste */}
      <div className="space-y-3">
        {filtered.map((video) => {
          const vimeoId = video.uri.split("/").pop() ?? "";
          const thumb = thumbUrl(video);
          const alreadyLinked = exercises.find((e) => e.vimeo_video_id === vimeoId);
          const preview = previews.find((p) => p.vimeoId === vimeoId);

          return (
            <div
              key={video.uri}
              className={`bg-gray-900 border rounded-xl p-4 flex items-center gap-4 ${
                alreadyLinked
                  ? "border-green-500/30 bg-green-500/5"
                  : preview?.blocked
                  ? "border-gray-800 opacity-50"
                  : "border-gray-800"
              }`}
            >
              {thumb ? (
                <img src={thumb} alt={video.name} className="w-28 h-16 object-cover rounded-lg flex-shrink-0 bg-gray-800" />
              ) : (
                <div className="w-28 h-16 bg-gray-800 rounded-lg flex-shrink-0 flex items-center justify-center">
                  <span className="text-gray-600 text-xs">▶</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">{video.name}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-gray-500 text-xs">ID: {vimeoId}</span>
                  <span className="text-gray-500 text-xs">{formatDuration(video.duration)}</span>
                  {alreadyLinked && (
                    <span className="text-green-400 text-xs">✓ Lié à «{alreadyLinked.name}»</span>
                  )}
                  {!alreadyLinked && preview?.blocked && (
                    <span className="text-gray-500 text-xs">◌ Ignoré (non-exercice)</span>
                  )}
                  {!alreadyLinked && !preview?.blocked && preview && preview.bestScore >= THRESHOLD && preview.bestEx && (
                    <span className="text-brand-400 text-xs">🤖 Suggestion : {preview.bestEx.name} ({preview.bestScore}%)</span>
                  )}
                </div>
              </div>
              <form action={assignVimeoToExercise} className="flex items-center gap-2 flex-shrink-0">
                <input type="hidden" name="vimeoId" value={vimeoId} />
                <select
                  name="exerciseId"
                  defaultValue={preview?.bestEx && preview.bestScore >= THRESHOLD ? preview.bestEx.id : ""}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 max-w-[200px]"
                >
                  <option value="">Associer à...</option>
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}{ex.vimeo_video_id ? " ✓" : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-3 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                >
                  Associer
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
