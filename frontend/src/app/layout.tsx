import type { Metadata } from "next";
import { Fraunces, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RAGHive — Glass-Box Multi-Agent Explainable RAG",
  description:
    "See exactly why the AI said what it said, before it says it. Transparent, multi-agent explainable RAG platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${interTight.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-app text-ink font-ui antialiased selection:bg-amber-500/20 selection:text-amber-500">
        <Providers>
          {children}
          <Toaster position="bottom-right" theme="dark" richColors />
        </Providers>
      </body>
    </html>
  );
}
