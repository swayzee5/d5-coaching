import type { NextAuthConfig } from "next-auth";

// Ce fichier doit rester exécutable dans l'Edge Runtime : il est chargé par le
// middleware. Aucun import de bcrypt, de Prisma ou de pg ici — ils vivent dans
// auth.ts, qui ne tourne que côté Node.

/**
 * Chemins accessibles sans session.
 *
 * - /login          : sinon on ne peut jamais se connecter
 * - /api/auth/*     : les routes internes de NextAuth
 * - /api/webhooks/* : appelées par ManyChat, qui ne peut pas s'authentifier ;
 *                     elles ont leur propre secret (MANYCHAT_WEBHOOK_SECRET)
 * - /api/health     : sonde de disponibilité, ne renvoie qu'un compteur
 *
 * Tout le reste — pages comme routes API — exige une session coach.
 */
const PUBLIC_PREFIXES = ["/login", "/api/auth", "/api/webhooks", "/api/health"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      if (pathname === "/login") {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl.origin));
        return true;
      }

      if (isPublic(pathname)) return true;

      // Les routes API répondent 401 plutôt que de rediriger : une redirection
      // vers une page HTML est inexploitable pour un appelant qui attend du JSON.
      if (pathname.startsWith("/api/")) {
        if (isLoggedIn) return true;
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }

      if (!isLoggedIn) {
        const login = new URL("/login", nextUrl.origin);
        // On garde la destination pour y revenir après connexion.
        if (pathname !== "/") login.searchParams.set("from", pathname);
        return Response.redirect(login);
      }

      return true;
    },
    jwt({ token, user }) {
      if (user?.email) token.email = user.email;
      if (user?.name) token.name = user.name;
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.email = (token.email as string) ?? session.user.email;
        session.user.name = (token.name as string) ?? session.user.name;
      }
      return session;
    },
  },
  providers: [],
  session: {
    strategy: "jwt",
    // Le CRM contient des données de santé : une semaine, pas un mois.
    maxAge: 7 * 24 * 60 * 60,
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
};
