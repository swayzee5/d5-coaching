"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewGroupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data = Object.fromEntries(form.entries());

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          maxSize: data.maxSize ? Number(data.maxSize) : 10,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Erreur lors de la création");
      }
      const { id } = await res.json();
      router.push(`/groups/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setLoading(false);
    }
  }

  // Date par défaut : lundi prochain
  const nextMonday = new Date();
  nextMonday.setDate(
    nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7)
  );
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const weekNum = Math.ceil(
    (nextMonday.getTime() - new Date(nextMonday.getFullYear(), 0, 1).getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/groups" className="hover:text-gray-300">
          Groupes
        </Link>
        <span>/</span>
        <span className="text-gray-200">Nouveau</span>
      </div>

      <h1 className="text-2xl font-bold text-white">Nouveau groupe</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Nom du groupe *
            </label>
            <input
              name="name"
              required
              defaultValue={`Reboot 40+ — Semaine ${weekNum}`}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Date de début *
              </label>
              <input
                name="startDate"
                type="date"
                required
                defaultValue={fmt(nextMonday)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Date de fin *
              </label>
              <input
                name="endDate"
                type="date"
                required
                defaultValue={fmt(nextSunday)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Taille max
            </label>
            <input
              name="maxSize"
              type="number"
              min={1}
              max={20}
              defaultValue={10}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Statut initial
            </label>
            <select
              name="status"
              defaultValue="UPCOMING"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
            >
              <option value="UPCOMING">À venir</option>
              <option value="ACTIVE">En cours</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            {loading ? "Création…" : "Créer le groupe"}
          </button>
          <Link
            href="/groups"
            className="text-gray-400 hover:text-gray-200 px-6 py-2.5 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
