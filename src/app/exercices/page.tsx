export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import type { Metadata } from "next";
import { ExerciseLibraryClient } from "./ExerciseLibraryClient";

export const metadata: Metadata = { title: "Bibliothèque d'exercices — D5 CRM" };

export default async function ExercicesPage() {
  const exercises = await db.exerciseLibrary.findMany({
    orderBy: [{ isFavorite: "desc" }, { name: "asc" }],
  });

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">Bibliothèque d&apos;exercices</h1>
        <p className="text-gray-500 text-sm mt-0.5">{exercises.length} exercice{exercises.length !== 1 ? "s" : ""} au total</p>
      </div>
      <ExerciseLibraryClient exercises={exercises} />
    </div>
  );
}
