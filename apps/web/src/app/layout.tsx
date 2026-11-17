import type { Metadata } from "next";
import { Outfit, Cinzel } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
});

export const metadata: Metadata = {
  title: "IMPERIAL OS",
  description: "IMPERIAL Operating System — Administration Portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${cinzel.variable}`}>
      <body>{children}</body>
    </html>
  );
}
