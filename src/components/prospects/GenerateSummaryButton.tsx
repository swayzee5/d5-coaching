"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateSummaryButton({
  prospectId,
}: {
  prospectId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"ONBOARDING" | "PRE_CALL">("ONBOARDING");

  async function generate() {
    setLoading(true);
    await fetch("/api/summaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectId, type }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as "ONBOARDING" | "PRE_CALL")}
        className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-300"
      >
        <option value="ONBOARDING">Onboarding</option>
        <option value="PRE_CALL">Pré-appel</option>
      </select>
      <button
        onClick={generate}
        disabled={loading}
        className="text-xs bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 px-2 py-1 rounded transition-colors disabled:opacity-50"
      >
        {loading ? "…" : "Générer"}
      </button>
    </div>
  );
}
