"use client";

import { useState, useRef } from "react";
import { FileText, Upload, Download, Loader2 } from "lucide-react";

export interface SerializedFile {
  id: string;
  name: string;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  uploadedAt: string;
}

interface Props {
  clientId: string;
  files: SerializedFile[];
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function NutritionUpload({ clientId, files: initial }: Props) {
  const [files, setFiles] = useState<SerializedFile[]>(initial);
  const [planName, setPlanName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !planName.trim()) return;
    setUploading(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("clientId", clientId);
      fd.append("name", planName.trim());

      const res = await fetch("/api/upload-nutrition", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());

      const created: SerializedFile = await res.json();
      setFiles((prev) => [created, ...prev]);
      setPlanName("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setError("Erreur lors de l’upload. Réessaie.");
    } finally {
      setUploading(false);
    }
  }

  const inputCls =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="space-y-4">
      {/* Upload form */}
      <form
        onSubmit={handleUpload}
        className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 space-y-3"
      >
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Envoyer un plan
        </p>
        <input
          type="text"
          placeholder='ex : "Plan semaine 3"'
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          required
          className={inputCls}
        />
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-brand-500/20 file:text-brand-400 file:text-xs file:font-semibold hover:file:bg-brand-500/30 file:cursor-pointer"
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={uploading || !file || !planName.trim()}
          className="flex items-center gap-2 px-3 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition-colors"
        >
          {uploading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Upload size={13} />
          )}
          {uploading ? "Upload..." : "Envoyer"}
        </button>
      </form>

      {/* Files list */}
      {files.length === 0 ? (
        <p className="text-gray-600 text-xs text-center py-4">
          Aucun plan envoyé
        </p>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 bg-gray-800/40 border border-gray-700/60 rounded-xl px-3 py-2.5"
            >
              <FileText size={14} className="text-brand-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{f.name}</p>
                <p className="text-xs text-gray-600">
                  {formatDate(f.uploadedAt)}
                  {f.fileSize ? ` · ${formatSize(f.fileSize)}` : ""}
                </p>
              </div>
              <a
                href={f.fileUrl}
                download={f.fileName}
                className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-500 hover:text-white transition-colors"
                title="Télécharger"
              >
                <Download size={14} />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
