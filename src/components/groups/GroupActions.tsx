"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChallengeGroup } from "@prisma/client";

type GroupStatus = "UPCOMING" | "ACTIVE" | "COMPLETED";

type Props = {
  group: ChallengeGroup;
  available: { id: string; name: string; phone: string }[];
};

const STATUS_OPTIONS: { value: GroupStatus; label: string }[] = [
  { value: "UPCOMING", label: "À venir" },
  { value: "ACTIVE", label: "En cours" },
  { value: "COMPLETED", label: "Terminé" },
];

export default function GroupActions({ group, available }: Props) {
  const router = useRouter();
  const [statusOpen, setStatusOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState("");
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: GroupStatus) {
    setStatusOpen(false);
    await fetch(`/api/groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function addParticipant() {
    if (!selectedProspect) return;
    setLoading(true);
    await fetch(`/api/groups/${group.id}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectId: selectedProspect }),
    });
    setAddOpen(false);
    setSelectedProspect("");
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Ajouter participant */}
      <div className="relative">
        <button
          onClick={() => setAddOpen((v) => !v)}
          className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + Participant
        </button>
        {addOpen && (
          <div className="absolute right-0 top-full mt-1 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-10 p-3 space-y-2">
            <select
              value={selectedProspect}
              onChange={(e) => setSelectedProspect(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100"
            >
              <option value="">Choisir un prospect…</option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={addParticipant}
              disabled={!selectedProspect || loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm py-2 rounded-lg transition-colors"
            >
              {loading ? "Ajout…" : "Ajouter"}
            </button>
          </div>
        )}
      </div>

      {/* Changer statut */}
      <div className="relative">
        <button
          onClick={() => setStatusOpen((v) => !v)}
          className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          Statut
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {statusOpen && (
          <div className="absolute right-0 top-full mt-1 w-40 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-10 py-1">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => updateStatus(s.value)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  s.value === group.status
                    ? "text-brand-400 bg-brand-500/10"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                {s.value === group.status && "✓ "}
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
