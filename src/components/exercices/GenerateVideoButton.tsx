"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type State = "idle" | "generating" | "done" | "error";

export default function GenerateVideoButton({
  exerciseId,
  exerciseName,
  hasVideo,
}: {
  exerciseId: string;
  exerciseName: string;
  hasVideo: boolean;
}) {
  const [state, setState] = useState<State>(hasVideo ? "done" : "idle");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  async function generate() {
    setState("generating");
    try {
      const res = await fetch("/api/runway/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseName }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Erreur");
      startPolling(json.taskId);
    } catch (err) {
      console.error(err);
      setState("error");
    }
  }

  function startPolling(taskId: string) {
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/runway/status?taskId=${taskId}&exerciseId=${exerciseId}`
        );
        const { status } = await res.json();
        if (status === "SUCCEEDED") {
          clearInterval(intervalRef.current!);
          setState("done");
          router.refresh();
        } else if (status === "FAILED") {
          clearInterval(intervalRef.current!);
          setState("error");
        }
      } catch {
        clearInterval(intervalRef.current!);
        setState("error");
      }
    }, 4000);
  }

  if (state === "done") {
    return (
      <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded">
        ✓ Vidéo IA
      </span>
    );
  }

  return (
    <button
      onClick={generate}
      disabled={state === "generating"}
      className="text-xs px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded disabled:opacity-60 transition-colors flex items-center gap-1"
    >
      {state === "idle" && <>✨ Générer</>}
      {state === "generating" && (
        <>
          <span className="inline-block w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          En cours...
        </>
      )}
      {state === "error" && <>⚠ Réessayer</>}
    </button>
  );
}
