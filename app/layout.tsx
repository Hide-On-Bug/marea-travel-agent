import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FluentStyleRegistry } from "./FluentStyleRegistry";
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
  title: "Marea",
  description: "POC de agencia de viajes con agente de IA y UI rica",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <FluentStyleRegistry>{children}</FluentStyleRegistry>
      </body>
    </html>
  );
}
