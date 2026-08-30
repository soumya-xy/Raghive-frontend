import React from "react";
import Link from "next/link";
import { HexMark } from "@/components/shared/hex-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-app text-ink">
      {/* Marketing Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-app/80 backdrop-blur-md border-b border-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <HexMark size="md" glow />
            <span className="font-display font-bold text-xl tracking-tight text-ink group-hover:text-amber-500 transition-colors">
              RAGHive
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8 text-xs font-mono font-medium text-muted">
            <Link href="#product" className="hover:text-amber-500 transition-colors">
              Product
            </Link>
            <Link href="#how-it-works" className="hover:text-amber-500 transition-colors">
              How it Works
            </Link>
            <Link href="#benchmarks" className="hover:text-amber-500 transition-colors">
              Benchmarks
            </Link>
            <a
              href="https://github.com/soumya-xy/RAGHive"
              target="_blank"
              rel="noreferrer"
              className="hover:text-amber-500 transition-colors flex items-center space-x-1"
            >
              <svg className="w-4 h-4 fill-current mr-1" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </a>
          </nav>

          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/sign-in">Sign In</Link>
            </Button>
            <Button asChild variant="amber" size="sm" className="font-semibold">
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-surface bg-surface py-12 text-xs text-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <HexMark size="sm" />
            <div>
              <span className="font-display font-bold text-sm text-ink">RAGHive</span>
              <p className="text-[11px] text-muted">
                Built as part of an academic research project at LNMIIT
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-6 font-mono text-[11px]">
            <span>Python • LangGraph • vLLM • ChromaDB • Qwen2.5-32B</span>
            <a
              href="https://github.com/soumya-xy/RAGHive"
              target="_blank"
              rel="noreferrer"
              className="hover:text-amber-500 underline"
            >
              Repo
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
