// app/layout.tsx

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema de Correção de Provas",
  description: "Portal do Colégio do Sol para correção e gestão de provas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-800`}
      >
        {/* Header */}
        <header className="bg-gradient-to-br from-yellow-300 via-blue-500 to-blue-900 text-gray-100 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between p-4">
            {/* Logo + título */}
            <div className="flex items-center space-x-3">
              <Image
                src="/logo2.png"
                alt="Logo Colégio Exemplo"
                width={48}
                height={48}
                className="object-contain"
              />
              <h1 className="text-2xl font-bold text-yellow-100">
                Colégio do Sol
              </h1>
            </div>
            <nav className="space-x-4">
              <Link href="/" className="hover:text-yellow-500">
                Início
              </Link>
              <Link href="/gabarito" className="hover:text-yellow-500">
                Gabarito
              </Link>
              <Link href="/respostas" className="hover:text-yellow-500">
                Respostas
              </Link>
            </nav>
          </div>
        </header>

        {/* Conteúdo principal */}
        <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-yellow-100 via-yellow-200 to-blue-600">
        <div className="w-full max-w-4xl px-4">
        {children}
        </div>
        </main>

        {/* Footer */}
        <footer className="bg-gradient-to-br from-yellow-200 via-yellow-500 to-blue-900 py-4 mt-12">
          <div className="max-w-4xl mx-auto text-center text-sm">
            © {new Date().getFullYear()} Encrypta Tech. Todos os direitos
            reservados.
          </div>
        </footer>
      </body>
    </html>
  );
}
