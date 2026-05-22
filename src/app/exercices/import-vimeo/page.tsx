export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { assignVimeoToExercise } from "./actions";
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
    url = data.paging?.next
      ? `https://api.vimeo.com${data.paging.next}`
      : null;
  }

  return videos;
}

export default async function ImportVimeoPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const [videos, exercises] = await Promise.all([
    fetchAllVimeoVideos(),
    db.$queryRaw<ExerciseRow[]>`
      SELECT id::text, name, vimeo_video_id
      FROM exercise_library
      WHERE is_active = true
      ORDER BY name ASC
    `.catch(() => [] as ExerciseRow[]),
  ]);

  const q = searchParams.q?.toLowerCase() ?? "";
  const filtered = q
    ? videos.filter((v) => v.name.toLowerCase().includes(q))
    : videos;

  function thumbUrl(v: VimeoVideo): string {
    const sizes = v.pictures?.sizes ?? [];
    return (
      sizes.find((s) => s.width >= 200)?.link ||
      sizes[sizes.length - 1]?.link ||
      ""
    );
  }

  function vimeoId(uri: string): string {
    return uri.split("/").pop() ?? "";
  }

  function formatDuration(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/exercices" className="text-gray-500 hover:text-gray-300 text-sm">← Bibliothèque</Link>
          </div>
          <h1 className="text-xl font-bold text-white">Import Vimeo</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {videos.length} vidéos sur ton compte Vimeo
          </p>
        </div>
      </div>

      {/* Recherche */}
      <form method="GET" className="relative">
        <input
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Rechercher une vidéo..."
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
        />
        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs px-3 py-1 bg-gray-800 rounded-lg">
          Rechercher
        </button>
      </form>

      {filtered.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-12">Aucune vidéo trouvée</p>
      )}

      {/* Grille vidéos */}
      <div className="grid grid-cols-1 gap-4">
        {filtered.map((video) => {
          const id = vimeoId(video.uri);
          const thumb = thumbUrl(video);
          const alreadyLinked = exercises.find((e) => e.vimeo_video_id === id);

          return (
            <div
              key={video.uri}
              className={`bg-gray-900 border rounded-xl p-4 flex items-center gap-4 ${
                alreadyLinked ? "border-green-500/30" : "border-gray-800"
              }`}
            >
              {/* Thumbnail */}
              {thumb ? (
                <img
                  src={thumb}
                  alt={video.name}
                  className="w-28 h-16 object-cover rounded-lg flex-shrink-0 bg-gray-800"
                />
              ) : (
                <div className="w-28 h-16 bg-gray-800 rounded-lg flex-shrink-0 flex items-center justify-center">
                  <span className="text-gray-600 text-xs">▶</span>
                </div>
              )}

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{video.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-gray-500 text-xs">ID: {id}</span>
                  <span className="text-gray-500 text-xs">{formatDuration(video.duration)}</span>
                  {alreadyLinked && (
                    <span className="text-green-400 text-xs">✓ Lié à &laquo;{alreadyLinked.name}&raquo;</span>
                  )}
                </div>
              </div>

              {/* Sélecteur exercice */}
              <form action={assignVimeoToExercise} className="flex items-center gap-2 flex-shrink-0">
                <input type="hidden" name="vimeoId" value={id} />
                <select
                  name="exerciseId"
                  defaultValue=""
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
