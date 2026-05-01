"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default function NewProspectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  function toggleDay(day: string) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data = Object.fromEntries(form.entries());

    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          availableDays: JSON.stringify(selectedDays),
          age: data.age ? Number(data.age) : undefined,
          weight: data.weight ? Number(data.weight) : undefined,
          height: data.height ? Number(data.height) : undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Erreur lors de la création");
      }
      const { id } = await res.json();
      router.push(`/prospects/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/prospects" className="hover:text-gray-300">
          Prospects
        </Link>
        <span>/</span>
        <span className="text-gray-200">Nouveau</span>
      </div>

      <h1 className="text-2xl font-bold text-white">Nouveau prospect</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identité */}
        <FormSection title="Identité">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nom complet *" name="name" required />
            <Field label="Téléphone *" name="phone" required type="tel" />
            <Field label="Email" name="email" type="email" />
            <Field label="Âge" name="age" type="number" min={35} max={70} />
          </div>
        </FormSection>

        {/* Données physiques */}
        <FormSection title="Données physiques">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Poids (kg)" name="weight" type="number" step="0.1" />
            <Field label="Taille (cm)" name="height" type="number" />
          </div>
          <div className="mt-4">
            <label className="block text-xs text-gray-400 mb-2">
              Jours disponibles
            </label>
            <div className="flex flex-wrap gap-2">
              {JOURS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                    selectedDays.includes(day)
                      ? "bg-brand-500/20 text-brand-300 border-brand-500/40"
                      : "text-gray-400 border-gray-700 hover:border-gray-500"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <TextareaField
              label="Habitudes alimentaires"
              name="nutritionInfo"
              placeholder="Ex: mange équilibré le midi, grignotage le soir, boit peu d'eau…"
            />
          </div>
        </FormSection>

        {/* Qualification */}
        <FormSection title="Réponses formulaire Facebook">
          <div className="space-y-4">
            <Field label="Q1 — Objectif principal" name="qualifObjectif" />
            <Field label="Q2 — Délai souhaité" name="qualifDelai" />
            <Field label="Q3 — Principal frein" name="qualifFrein" />
            <Field label="Q4 — Expérience sportive" name="qualifExperience" />
            <Field label="Q5 — Disponibilité" name="qualifDisponible" />
            <Field label="Q6 — Santé / blessures" name="qualifSante" />
            <Field label="Q7 — Motivation /10" name="qualifMotivation" />
            <Field label="Q8 — Budget santé" name="qualifBudget" />
          </div>
        </FormSection>

        {/* Notes */}
        <FormSection title="Notes">
          <TextareaField
            label="Notes libres"
            name="notes"
            placeholder="Observations, contexte particulier…"
          />
          <div className="mt-4">
            <Field label="ManyChat ID" name="manychatId" />
          </div>
        </FormSection>

        {error && (
          <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            {loading ? "Création…" : "Créer le prospect"}
          </button>
          <Link
            href="/prospects"
            className="text-gray-400 hover:text-gray-200 px-6 py-2.5 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({
  label,
  name,
  required,
  type = "text",
  min,
  max,
  step,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  min?: number;
  max?: number;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
      />
    </div>
  );
}

function TextareaField({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5" htmlFor={name}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={3}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors resize-none"
      />
    </div>
  );
}
