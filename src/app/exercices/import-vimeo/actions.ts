"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

export async function autoMatchAndAssign(): Promise<void> {
  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) redirect("/exercices/import-vimeo?matched=0&created=0&skipped=0");

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

  type ExRow = { id: string; name: string; vimeo_video_id: string | null };
  const exercises = await db.$queryRaw<ExRow[]>`
    SELECT id::text, name, vimeo_video_id FROM exercise_library WHERE is_active = true
  `.catch(() => [] as ExRow[]);

  let matched = 0;
  let created = 0;
  let skipped = 0;
  const THRESHOLD = 60;

  for (const video of videos) {
    const vimeoId = video.uri.split("/").pop() ?? "";

    if (isBlocklisted(video.name)) {
      skipped++;
      continue;
    }

    let bestEx: ExRow | null = null;
    let bestScore = 0;
    for (const ex of exercises) {
      const s = score(video.name, ex.name);
      if (s > bestScore) { bestScore = s; bestEx = ex; }
    }

    if (bestScore >= THRESHOLD && bestEx) {
      if (bestEx.vimeo_video_id && bestEx.vimeo_video_id !== vimeoId) continue;
      if (bestEx.vimeo_video_id === vimeoId) continue;

      await db.exerciseLibrary
        .update({ where: { id: bestEx.id }, data: { vimeoVideoId: vimeoId } })
        .catch(() => {});
      matched++;
    } else {
      if (!looksLikeExercise(video.name)) {
        skipped++;
        continue;
      }

      const nameLower = normalize(video.name);
      let muscles: string[] = [];
      if (nameLower.match(/triceps/)) muscles = ["Triceps"];
      else if (nameLower.match(/biceps|curl/)) muscles = ["Biceps"];
      else if (nameLower.match(/pector|pompe|developpe|press|svend/)) muscles = ["Pectoraux"];
      else if (nameLower.match(/dos|tirage|rowing|row|traction/)) muscles = ["Dos"];
      else if (nameLower.match(/epaule|shoulder|lateral|oiseau|face pull|shrug|trapeze/)) muscles = ["Épaules"];
      else if (nameLower.match(/squat|fente|lunge|leg|jambe|quad|rdl|souleve|deadlift|nordic/)) muscles = ["Quadriceps"];
      else if (nameLower.match(/fessier|hip|glute|kickback|bridge/)) muscles = ["Fessiers"];
      else if (nameLower.match(/mollet|calf/)) muscles = ["Mollets"];
      else if (nameLower.match(/abdo|crunch|planche|gainage|twist|russian|leg raise|hollow|bird|dead bug/)) muscles = ["Abdominaux"];
      else if (nameLower.match(/cardio|burpee|jumping|saut|mountain climber/)) muscles = ["Cardio / Mobilité"];
      else if (nameLower.match(/mobilit|etirement|stretching|echauffement/)) muscles = ["Cardio / Mobilité"];

      await db.exerciseLibrary
        .create({ data: { name: video.name, vimeoVideoId: vimeoId, muscles, isActive: true } })
        .catch(() => {});
      created++;
      exercises.push({ id: "", name: video.name, vimeo_video_id: vimeoId });
    }
  }

  revalidatePath("/exercices/import-vimeo");
  revalidatePath("/exercices");
  redirect(`/exercices/import-vimeo?matched=${matched}&created=${created}&skipped=${skipped}`);
}
