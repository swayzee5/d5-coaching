import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "D5 Coaching — CRM",
  description: "Système de suivi prospects et groupes Reboot 40+",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="flex h-screen overflow-hidden">
        <Sidebar />
        {/* pt-14 laisse la place a la barre mobile fixe ; nulle a partir de lg */}
        <main className="flex-1 overflow-y-auto bg-gray-950 pt-14 lg:pt-0">{children}</main>
      </body>
    </html>
  );
}
