import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "D5 Coaching — CRM",
  description: "Système de suivi prospects et groupes Reboot 40+",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Le middleware a déjà refusé l'accès aux non-connectés : si on arrive ici
  // sans session, c'est qu'on est sur une page publique (la connexion). On la
  // rend alors seule, sans la navigation.
  const session = await auth();

  if (!session?.user) {
    return (
      <html lang="fr">
        <body className="min-h-screen bg-gray-950">{children}</body>
      </html>
    );
  }

  return (
    <html lang="fr">
      <body className="flex h-screen overflow-hidden">
        <Sidebar signOutSlot={<SignOutButton />} />
        {/* pt-14 laisse la place a la barre mobile fixe ; nulle a partir de lg */}
        <main className="flex-1 overflow-y-auto bg-gray-950 pt-14 lg:pt-0">{children}</main>
      </body>
    </html>
  );
}
