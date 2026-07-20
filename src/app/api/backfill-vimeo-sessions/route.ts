import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  // Trouver tous les exercices de séance liés à la bibliothèque mais sans vimeoVideoId
  const exercises = await (db as any).sessionExercise.findMany({
    where: {
      libraryExerciseId: { not: null },
      vimeoVideoId: null,
    },
    select: { id: true, libraryExerciseId: true, name: true },
  });

  if (exercises.length === 0) {
    return NextResponse.json({ updated: 0, message: "Aucun exercice à mettre à jour" });
  }

  // Récupérer tous les IDs Vimeo de la bibliothèque concernée
  const libraryIds = [...new Set(exercises.map((e: any) => e.libraryExerciseId))];
  const libraryExercises = await (db as any).exerciseLibrary.findMany({
    where: { id: { in: libraryIds }, vimeoVideoId: { not: null } },
    select: { id: true, vimeoVideoId: true },
  });

  const vimeoMap = new Map(libraryExercises.map((e: any) => [e.id, e.vimeoVideoId]));

  // Mettre à jour chaque exercice de séance
  let updated = 0;
  for (const ex of exercises) {
    const vimeoVideoId = vimeoMap.get(ex.libraryExerciseId);
    if (vimeoVideoId) {
      await (db as any).sessionExercise.update({
        where: { id: ex.id },
        data: { vimeoVideoId },
      });
      updated++;
    }
  }

  return NextResponse.json({
    updated,
    total: exercises.length,
    message: `${updated} exercice(s) mis à jour sur ${exercises.length} trouvés`,
  });
}
