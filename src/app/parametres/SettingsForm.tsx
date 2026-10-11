"use client";

import { useState, useTransition } from "react";
import { saveRebootMessage, saveRebootIntroVideo, saveCoachWhatsapp, saveReglagesFin } from "./actions";

export default function SettingsForm({
  rebootMessage,
  introVideo,
  whatsapp,
  videoFin,
  lienReservation,
  prix,
}: {
  rebootMessage: string;
  introVideo: string;
  whatsapp: string;
  videoFin: string;
  lienReservation: string;
  prix: string;
}) {
  const [message, setMessage] = useState(rebootMessage);
  const [video, setVideo] = useState(introVideo);
  const [saved, setSaved] = useState(false);
  const [videoSaved, setVideoSaved] = useState<string | null>(null);
  const [numero, setNumero] = useState(whatsapp);
  const [numeroSaved, setNumeroSaved] = useState<string | null>(null);
  const [fin, setFin] = useState({ videoFin, lienReservation, prix });
  const [finSaved, setFinSaved] = useState(false);
  const [finErreur, setFinErreur] = useState<string | null>(null);
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

  function handleNumero(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const retenu = await saveCoachWhatsapp(numero);
      setNumero(retenu);
      setNumeroSaved(retenu);
      setTimeout(() => setNumeroSaved(null), 3000);
    });
  }

  function handleFin(e: React.FormEvent) {
    e.preventDefault();
    setFinErreur(null);
    startTransition(async () => {
      const r = await saveReglagesFin(fin);
      if (!r.ok) {
        setFinErreur(r.erreur ?? "Erreur");
        return;
      }
      // L'identifiant retenu remplace ce qui a été collé : voir le numéro
      // extrait d'une adresse Vimeo évite de se demander si ça a marché.
      setFin((f) => ({ ...f, videoFin: r.videoFin }));
      setFinSaved(true);
      setTimeout(() => setFinSaved(false), 3000);
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

    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-white">Ton numéro WhatsApp</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Utilisé par la page d&apos;invitation que tes participants partagent à leurs proches.
          Avec l&apos;indicatif pays. Vide, aucun bouton WhatsApp ne s&apos;affiche sur cette page.
        </p>
      </div>
      <form onSubmit={handleNumero} className="space-y-3">
        <input
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="+33 6 12 34 56 78"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
        />
        <button type="submit" disabled={isPending}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition-colors">
          {isPending ? "Enregistrement…" : numeroSaved !== null ? "Enregistré ✓" : "Enregistrer"}
        </button>
        {numeroSaved && (
          <p className="text-xs text-gray-500">Retenu : {numeroSaved}</p>
        )}
      </form>
    </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-white">Fin du challenge</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Ce qui s&apos;affiche juste après le bilan, quand le participant vient de voir
          sa progression. Non bloquant : il peut fermer et revenir.
        </p>
      </div>
      <form onSubmit={handleFin} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Vidéo de clôture (lien Vimeo)</label>
          <input
            value={fin.videoFin}
            onChange={(e) => setFin({ ...fin, videoFin: e.target.value })}
            placeholder="https://vimeo.com/123456789"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <p className="text-[11px] text-gray-600 mt-1">Vide, aucune vidéo ne s&apos;affiche.</p>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Lien de prise de rendez-vous</label>
          <input
            value={fin.lienReservation}
            onChange={(e) => setFin({ ...fin, lienReservation: e.target.value })}
            placeholder="https://cal.com/ton-compte/appel-decouverte"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <p className="text-[11px] text-gray-600 mt-1">
            Vide, le bouton ne s&apos;affiche pas — mieux vaut rien qu&apos;un bouton mort.
          </p>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Prix affiché</label>
          <input
            value={fin.prix}
            onChange={(e) => setFin({ ...fin, prix: e.target.value })}
            placeholder="1 500 € · 6 mois — possibilité en 3 fois"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <p className="text-[11px] text-gray-600 mt-1">
            Annoncer le prix ici t&apos;évite les appels avec des gens qui ne l&apos;accepteront pas.
          </p>
        </div>
        {finErreur && <p className="text-sm text-red-400">{finErreur}</p>}
        <button type="submit" disabled={isPending}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition-colors">
          {isPending ? "Enregistrement…" : finSaved ? "Enregistré ✓" : "Enregistrer"}
        </button>
      </form>
    </div>
    </>
  );
}
