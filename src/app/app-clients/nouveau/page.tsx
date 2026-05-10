"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createAppClient } from "./actions";
import Link from "next/link";

const inputCls =
  "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white rounded-xl font-semibold transition-colors"
    >
      {pending ? "Création..." : "Créer le compte"}
    </button>
  );
}

export default function NouveauClientPage() {
  const [state, formAction] = useFormState(createAppClient, null);

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app-clients" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← App Clients
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">Nouveau compte client</h1>
        <p className="text-gray-400 text-sm mt-1">
          Le client se connectera à l'app D5 avec ces identifiants.
        </p>
      </div>

      {state?.error && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        {/* Identité */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Identité</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Prénom *</label>
              <input name="firstName" required placeholder="Jean" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Nom *</label>
              <input name="lastName" required placeholder="Dupont" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Téléphone</label>
            <input name="phone" type="tel" placeholder="+33 6 00 00 00 00" className={inputCls} />
          </div>
        </div>

        {/* Connexion */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Connexion app</p>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Email *</label>
            <input name="email" type="email" required placeholder="jean@email.com" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Mot de passe temporaire *</label>
            <input
              name="password"
              type="text"
              required
              placeholder="ex : D5coaching2025!"
              className={inputCls}
            />
            <p className="text-xs text-gray-600 mt-1.5">
              À communiquer au client. Il pourra le changer depuis son profil.
            </p>
          </div>
        </div>

        {/* Type d'accès */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Accès</p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="isRebootOnly"
              className="mt-0.5 w-4 h-4 accent-brand-500"
            />
            <span className="text-sm text-gray-300">
              Reboot 40+ uniquement
              <span className="block text-xs text-gray-600 mt-0.5">
                Pas de programme d'entraînement ni de plan nutrition
              </span>
            </span>
          </label>
        </div>

        {/* Objectifs */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Objectifs</label>
          <textarea
            name="objectives"
            rows={3}
            placeholder="Perte de poids, reprise d'activité, gain de masse..."
            className={`${inputCls} resize-none`}
          />
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}
