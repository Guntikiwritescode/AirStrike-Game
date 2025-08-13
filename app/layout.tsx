import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Bayesian Forward Operator",
  description: "A probability-based strategy game where you use noisy sensors to update beliefs about hidden hostiles and infrastructure, then make optimal decisions under uncertainty.",
  keywords: ["game", "probability", "decision-making", "strategy", "bayesian", "uncertainty"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen bg-bg text-ink font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
