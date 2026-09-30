"use client";

import { useState, useTransition } from "react";
import { saveRebootMessage, saveRebootIntroVideo } from "./actions";

export default function SettingsForm({
  rebootMessage,
  introVideo,
}: {
  rebootMessage: string;
  introVideo: string;
}) {
  const [message, setMessage] = useState(rebootMessage);
  const [video, setVideo] = useState(introVideo);
  const [saved, setSaved] = useState(false);
  const [videoSaved, setVideoSaved] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await saveRebootMessage(message);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  function handleVideo(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      // L'action renvoie l'identifiant retenu : coller une adresse complète et
      // voir apparaître le numéro extrait évite de se demander si ça a marché.
      const retenu = await saveRebootIntroVideo(video);
      setVideo(retenu);
      setVideoSaved(retenu);
      setTimeout(() => setVideoSaved(null), 3000);
    });
  }

  return (
    <>
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-white">Message d&apos;accueil Reboot</p>
        <p className="text-xs text-gray-500 mt-0.5">Affiché dans « Mot de ton coach » en haut de la page Reboot dans l&apos;app cliente.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Vas-y à ton rythme. Ce qui compte, c’est de compléter chaque étape — pas de le faire vite."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
        />
        <button type="submit" disabled={isPending}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition-colors">
          {isPending ? "Enregistrement…" : saved ? "Enregistré ✓" : "Enregistrer"}
        </button>
      </form>
    </div>

    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-white">Vidéo d&apos;explication du Reboot</p>
        <p className="text-xs text-gray-500 mt-0.5">
          À voir en entier avant d&apos;accéder au challenge, juste après le diagnostic.
          Colle le lien Vimeo ou l&apos;identifiant. Laisse vide pour ne rien imposer.
        </p>
      </div>
      <form onSubmit={handleVideo} className="space-y-3">
        <input
          value={video}
          onChange={(e) => setVideo(e.target.value)}
          placeholder="https://vimeo.com/1234567890"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
        />
        <button type="submit" disabled={isPending}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition-colors">
          {isPending ? "Enregistrement…" : videoSaved !== null ? "Enregistré ✓" : "Enregistrer"}
        </button>
        {videoSaved === "" && (
          <p className="text-xs text-amber-400">
            Aucun identifiant trouvé dans ce que tu as collé. La vidéo n&apos;est plus imposée.
          </p>
        )}
      </form>
    </div>
    </>
  );
}
