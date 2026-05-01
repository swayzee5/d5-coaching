"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Prospect } from "@prisma/client";
import { statusLabel, ProspectStatus } from "@/lib/utils";

const STATUSES: ProspectStatus[] = [
  "LEAD",
  "ONBOARDING",
  "CHALLENGE",
  "CALL_SCHEDULED",
  "CLIENT",
  "DECLINED",
  "GHOST",
];

export default function ProspectActions({ prospect }: { prospect: Prospect }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function updateStatus(status: ProspectStatus) {
    setLoading(true);
    setOpen(false);
    await fetch(`/api/prospects/${prospect.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-2 relative">
      <a
        href={`https://wa.me/${prospect.phone.replace(/\D/g, "")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        WhatsApp
      </a>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={loading}
          className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          Statut
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-10 py-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  s === prospect.status
                    ? "text-brand-400 bg-brand-500/10"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                {s === prospect.status && "✓ "}
                {statusLabel(s)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
