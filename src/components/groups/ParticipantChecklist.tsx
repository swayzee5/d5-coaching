"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChallengeParticipant, Prospect } from "@prisma/client";
import Link from "next/link";
import { challengeProgress } from "@/lib/utils";

type Props = {
  participant: ChallengeParticipant & { prospect: Prospect };
};

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export default function ParticipantChecklist({ participant: initial }: Props) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function toggleDay(day: number, value: boolean) {
    const key = `day${day}Done` as keyof typeof p;
    const updated = { ...p, [key]: value };
    setP(updated as typeof p);
    setSaving(true);
    await fetch(`/api/participants/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    setSaving(false);
    router.refresh();
  }

  async function toggleSerious() {
    const updated = { ...p, isSerious: !p.isSerious };
    setP(updated as typeof p);
    await fetch(`/api/participants/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSerious: !p.isSerious }),
    });
    router.refresh();
  }

  async function updateScore(score: number) {
    const updated = { ...p, engagementScore: score };
    setP(updated as typeof p);
    await fetch(`/api/participants/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ engagementScore: score }),
    });
    router.refresh();
  }

  const done = challengeProgress(p);

  return (
    <div className="px-5 py-4 hover:bg-gray-800/30 transition-colors">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Nom */}
        <Link
          href={`/prospects/${p.prospectId}`}
          className="w-32 font-medium text-sm text-white hover:text-brand-400 truncate shrink-0"
        >
          {p.prospect.name}
        </Link>

        {/* Checkboxes J1→J7 */}
        <div className="flex items-center gap-1.5">
          {DAYS.map((d) => {
            const key = `day${d}Done` as keyof typeof p;
            const checked = p[key] as boolean;
            return (
              <button
                key={d}
                onClick={() => toggleDay(d, !checked)}
                disabled={saving}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors border ${
                  checked
                    ? "bg-brand-500 border-brand-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500"
                }`}
                title={`Jour ${d}`}
              >
                {d}
              </button>
            );
          })}
        </div>

        {/* Compteur */}
        <span className="text-sm text-gray-400 w-10 shrink-0">{done}/7</span>

        {/* Score engagement */}
        <select
          value={p.engagementScore ?? ""}
          onChange={(e) => updateScore(Number(e.target.value))}
          className="bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 px-2 py-1 w-20"
        >
          <option value="">Score</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>
              {n}/10
            </option>
          ))}
        </select>

        {/* Bouton profil sérieux */}
        <button
          onClick={toggleSerious}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            p.isSerious
              ? "bg-green-500/20 border-green-500/30 text-green-400"
              : "bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300"
          }`}
        >
          {p.isSerious ? "🎯 Sérieux" : "Sérieux?"}
        </button>
      </div>
    </div>
  );
}
