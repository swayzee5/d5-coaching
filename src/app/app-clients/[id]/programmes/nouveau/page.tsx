"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createManualProgram } from "./actions";

const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

type SessionDraft = {
  id: number;
  name: string;
  weekNumber: number | null;
  dayOfWeek: number | null;
};

export default function NouveauProgrammePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [weeks, setWeeks] = useState("");
  const [startDate, setStartDate] = useState("");
  const [sessions, setSessions] = useState<SessionDraft[]>([]);
  const [sessionName, setSessionName] = useState("");
  const [sessionWeek, setSessionWeek] = useState("1");
  const [sessionDay, setSessionDay] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function addSession() {
    if (!sessionName.trim()) return;
    setSessions((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: sessionName.trim(),
        weekNumber: sessionWeek ? parseInt(sessionWeek) : null,
        dayOfWeek: sessionDay !== "" ? parseInt(sessionDay) : null,
      },
    ]);
    setSessionName("");
  }

  function removeSession(id: number) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  function goNext() {
    if (!name.trim()) {
      setError("Le nom du programme est requis");
      return;
    }
    setError(null);
    setStep(2);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createManualProgram(
        params.id,
        name,
        weeks ? parseInt(weeks) : null,
        startDate || null,
        sessions.map((s) => ({ name: s.name, weekNumber: s.weekNumber, dayOfWeek: s.dayOfWeek }))
      );
      if ("error" in result) {
        setError(result.error);
      } else {
        router.push(`/app-clients/${params.id}/programmes/${result.programId}`);
      }
    });
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <Link href={`/app-clients/${params.id}`} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          &larr; Retour au client
        </Link>
        <h1 className="text-xl font-bold text-white mt-4">Nouveau programme</h1>
        <p className="text-gray-400 text-sm mt-1">Créez un programme structuré par semaines et séances.</p>
      </div>

      <div className="flex items-center gap-2">
        {[1, 2].map((s, idx) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                s === step
                  ? "bg-brand-500 text-white"
                  : s < step
                  ? "bg-brand-500/20 text-brand-400"
                  : "bg-gray-800 text-gray-500"
              }`}
            >
              {s}
            </div>
            <span className={`text-sm ${s === step ? "text-white font-medium" : "text-gray-500"}`}>
              {s === 1 ? "Informations" : "Séances"}
            </span>
            {idx < 1 && (
              <svg className="w-4 h-4 text-gray-700 mx-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Nom du programme *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && goNext()}
              placeholder="ex: Force 8 semaines"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Durée (semaines)</label>
              <input
                type="number"
                value={weeks}
                onChange={(e) => setWeeks(e.target.value)}
                min={1}
                max={52}
                placeholder="ex: 8"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Date de début</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={goNext}
            className="w-full py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Suivant &rarr;
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-white text-sm">Ajouter des séances</h2>
            <div className="flex gap-2 flex-wrap">
              <input
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSession())}
                placeholder="Nom de la séance (ex: Push A)"
                className="flex-1 min-w-40 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
              <input
                type="number"
                value={sessionWeek}
                onChange={(e) => setSessionWeek(e.target.value)}
                min={1}
                placeholder="Sem."
                title="Numéro de semaine"
                className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white text-center placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
              <select
                value={sessionDay}
                onChange={(e) => setSessionDay(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
              >
                <option value="">Jour</option>
                {DAY_NAMES.map((d, i) => (
                  <option key={i} value={i}>
                    {d}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addSession}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
              >
                + Ajouter
              </button>
            </div>

            {sessions.length > 0 ? (
              <div className="mt-1 space-y-1">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-800 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white">{s.name}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {s.weekNumber ? `Sem. ${s.weekNumber}` : "Sem. —"}
                        {s.dayOfWeek !== null ? ` · ${DAY_NAMES[s.dayOfWeek]}` : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSession(s.id)}
                      className="shrink-0 text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-600 mt-1">
                Aucune séance — vous pourrez en créer après la création du programme.
              </p>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setError(null); setStep(1); }}
              className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              &larr; Retour
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={isPending}
              className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isPending ? "Création..." : "Créer le programme"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
