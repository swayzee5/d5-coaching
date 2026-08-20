import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Connexion — D5 CRM" };
export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; from?: string };
}) {
  async function authenticate(formData: FormData) {
    "use server";

    const from = String(formData.get("from") ?? "");
    // On n'accepte qu'un chemin interne : un "from" absolu permettrait de
    // rediriger vers un site externe après connexion.
    const target = from.startsWith("/") && !from.startsWith("//") ? from : "/dashboard";

    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: target,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect(`/login?error=1${from ? `&from=${encodeURIComponent(from)}` : ""}`);
      }
      // signIn lève une redirection interne en cas de succès : il faut la
      // laisser remonter, sinon la connexion n'aboutit jamais.
      throw error;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://raw.githubusercontent.com/swayzee5/d5-coaching/main/Logo%20D5.PNG"
            alt="D5 Coaching"
            width={140}
            height={90}
            className="object-contain brightness-0 invert"
          />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h1 className="text-lg font-bold text-white">Espace coach</h1>
          <p className="text-gray-500 text-sm mt-1 mb-6">
            Cet espace contient les données de vos clients. Connectez-vous pour continuer.
          </p>

          <form action={authenticate} className="space-y-4">
            <input type="hidden" name="from" value={searchParams.from ?? ""} />

            <div>
              <label htmlFor="email" className="block text-xs text-gray-400 mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username"
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs text-gray-400 mb-1.5">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            {searchParams.error && (
              <p className="text-sm text-red-400">Email ou mot de passe incorrect.</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Se connecter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
