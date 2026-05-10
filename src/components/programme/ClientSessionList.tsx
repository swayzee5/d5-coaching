"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ConfirmButton } from "@/components/ConfirmButton";

const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

type Session = {
  id: string;
  name: string;
  dayOfWeek: number | null;
  _count: { exercises: number };
};

type Props = {
  sessions: Session[];
  programId: string;
  clientId: string;
  renameAction: (sessionId: string, clientId: string, programId: string, formData: FormData) => Promise<void>;
  duplicateAction: (sessionId: string, programId: string, clientId: string) => Promise<void>;
  deleteAction: (sessionId: string, clientId: string, programId: string) => Promise<void>;
};

export function ClientSessionList({
  sessions,
  programId,
  clientId,
  renameAction,
  duplicateAction,
  deleteAction,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [, startTransition] = useTransition();

  const startEdit = (session: Session) => {
    setEditingId(session.id);
    setEditingName(session.name);
  };

  const commitRename = (sessionId: string) => {
    if (!editingName.trim()) return;
    const fd = new FormData();
    fd.set("name", editingName.trim());
    startTransition(() => renameAction(sessionId, clientId, programId, fd));
    setEditingId(null);
  };

  return (
    <div className="space-y-3">
      {sessions.map((session, i) => (
        <div
          key={session.id}
          className="group flex items-center bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl transition-colors"
        >
          {editingId === session.id ? (
            <div className="flex-1 flex items-center gap-2 p-3">
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                <span className="text-brand-400 font-bold text-sm">{i + 1}</span>
              </div>
              <input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commitRename(session.id); }
                  if (e.key === "Escape") setEditingId(null);
                }}
                autoFocus
                className="flex-1 bg-gray-800 border border-brand-500 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
              />
              <button
                onClick={() => commitRename(session.id)}
                className="px-3 py-1.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-xs font-medium transition-colors"
              >
                OK
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="px-2 py-1.5 text-gray-500 hover:text-white rounded-lg text-xs transition-colors"
              >
                ✕
              </button>
            </div>
          ) : (
            <Link
              href={`/app-clients/${clientId}/programmes/${programId}/seances/${session.id}`}
              className="flex-1 flex items-center gap-3 p-4"
            >
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                <span className="text-brand-400 font-bold text-sm">{i + 1}</span>
              </div>
              <div>
                <p className="font-medium text-white text-sm">{session.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {session.dayOfWeek !== null ? DAY_NAMES[session.dayOfWeek] + " · " : ""}
                  {session._count.exercises} exercice{session._count.exercises !== 1 ? "s" : ""}
                </p>
              </div>
            </Link>
          )}

          {editingId !== session.id && (
            <div className="flex items-center gap-1 pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => startEdit(session)}
                title="Renommer"
                className="p-1.5 text-gray-500 hover:text-brand-400 transition-colors rounded text-xs"
              >
                ✏️
              </button>
              <form action={duplicateAction.bind(null, session.id, programId, clientId)}>
                <button
                  type="submit"
                  className="p-1.5 text-gray-500 hover:text-brand-400 transition-colors rounded text-xs"
                >
                  Copier
                </button>
              </form>
              <ConfirmButton
                action={deleteAction.bind(null, session.id, clientId, programId)}
                message={`Supprimer « ${session.name} » ?`}
                className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded text-xs"
              >
                Suppr.
              </ConfirmButton>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
