import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// On utilise le middleware de NextAuth plutôt qu'une simple lecture de cookie :
// il vérifie la signature du JWT. Un cookie fabriqué à la main ne passe pas.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Tout passe par le middleware sauf les fichiers statiques. Les exceptions
  // fonctionnelles (login, webhooks, health) sont décidées dans authConfig,
  // pour qu'il n'y ait qu'un seul endroit qui dise ce qui est public.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
