"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function assignVimeoToExercise(formData: FormData) {
  const exerciseId = formData.get("exerciseId") as string;
  const vimeoId = (formData.get("vimeoId") as string)?.trim();
  if (!exerciseId || !vimeoId) return;
  await db.exerciseLibrary.update({
    where: { id: exerciseId },
    data: { vimeoVideoId: vimeoId },
  });
  revalidatePath("/exercices/import-vimeo");
  revalidatePath("/exercices");
}

export async function autoMatchAndAssign(): Promise<{ matched: number; created: number }> {
  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) return { matched: 0, created: 0 };

  // 1. Fetch all Vimeo videos
  const videos: { uri: string; name: string }[] = [];
  let url: string | null =
    "https://api.vimeo.com/me/videos?per_page=100&fields=uri,name";
  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: `bearer ${token}`,
        Accept: "application/vnd.vimeo.*+json;version=3.4",
      },
      cache: "no-store",
    });
    if (!res.ok) break;
    const data = await res.json();
    videos.push(...(data.data ?? []));
    url = data.paging?.next ? `https://api.vimeo.com${data.paging.next}` : null;
  }

  // 2. Fetch all exercises
  type ExRow = { id: string; name: string; vimeo_video_id: string | null };
  const exercises = await db.$queryRaw<ExRow[]>`
    SELECT id::text, name, vimeo_video_id FROM exercise_library WHERE is_active = true
  `.catch(() => [] as ExRow[]);

  function normalize(s: string): string {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
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

  let matched = 0;
  let created = 0;
  const THRESHOLD = 60;

  for (const video of videos) {
    const vimeoId = video.uri.split("/").pop() ?? "";

    // Find best matching exercise
    let bestEx: ExRow | null = null;
    let bestScore = 0;
    for (const ex of exercises) {
      const s = score(video.name, ex.name);
      if (s > bestScore) {
        bestScore = s;
        bestEx = ex;
      }
    }

    if (bestScore >= THRESHOLD && bestEx) {
      // Already has a different video? Skip
      if (bestEx.vimeo_video_id && bestEx.vimeo_video_id !== vimeoId) continue;
      if (bestEx.vimeo_video_id === vimeoId) continue;

      await db.exerciseLibrary.update({
        where: { id: bestEx.id },
        data: { vimeoVideoId: vimeoId },
      }).catch(() => {});
      matched++;
    } else {
      // Exercise doesn't exist → create it with basic muscle group detection
      const nameLower = normalize(video.name);
      let muscles: string[] = [];
      if (nameLower.match(/triceps/)) muscles = ["Triceps"];
      else if (nameLower.match(/biceps|curl/)) muscles = ["Biceps"];
      else if (nameLower.match(/pector|pompe|developpe|press|svend/)) muscles = ["Pectoraux"];
      else if (nameLower.match(/dos|tirage|rowing|row|traction/)) muscles = ["Dos"];
      else if (nameLower.match(/epaule|shoulder|lateral|oiseau/)) muscles = ["Épaules"];
      else if (nameLower.match(/squat|fente|leg|jambe|quad/)) muscles = ["Quadriceps"];
      else if (nameLower.match(/fessier|hip|glute|kickback/)) muscles = ["Fessiers"];
      else if (nameLower.match(/mollet|calf/)) muscles = ["Mollets"];
      else if (nameLower.match(/abdo|crunch|planche|gainage|twist/)) muscles = ["Abdominaux"];
      else if (nameLower.match(/cardio|burpee|jumping|saut/)) muscles = ["Cardio / Mobilité"];

      await db.exerciseLibrary.create({
        data: {
          name: video.name,
          vimeoVideoId: vimeoId,
          muscles,
          isActive: true,
        },
      }).catch(() => {});
      created++;
      // Add to local list for future matches
      exercises.push({ id: "", name: video.name, vimeo_video_id: vimeoId });
    }
  }

  revalidatePath("/exercices/import-vimeo");
  revalidatePath("/exercices");
  return { matched, created };
}
