import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import AppLayout from "@/components/layout/AppLayout"; // Import the main layout
import { ClientBackground } from "./ClientBackground";
import ClientProviders from './ClientProviders';
import Link from "next/link";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  variable: "--font-source-code-pro",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Quantum Weaver",
  description: "Quantum ZPE Network Analysis & Training Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceCodePro.variable} dark`} suppressHydrationWarning>
      <head />
      <body className="font-body antialiased retro-scanlines">
        <ClientProviders>
        <AppLayout>
          {/* Add this to your sidebar or main nav */}
          <Link href="/data-portal" className="block px-4 py-2 hover:bg-gray-100 rounded">Data Portal</Link>
          {children}
        </AppLayout>
        </ClientProviders>
        <Toaster />
      </body>
    </html>
  );
}