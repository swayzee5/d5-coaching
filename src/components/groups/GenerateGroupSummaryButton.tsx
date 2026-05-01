"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateGroupSummaryButton({
  groupId,
}: {
  groupId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    await fetch("/api/summaries/group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={generate}
      disabled={loading}
      className="text-xs bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? "Génération…" : "✦ Générer rapport"}
    </button>
  );
}
