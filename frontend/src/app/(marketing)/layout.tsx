import React from "react";
import Link from "next/link";
import { HexMark } from "@/components/shared/hex-mark";

const NAV = [
  { href: "/#product", label: "Product" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#trace", label: "The trace" },
  { href: "/#benchmarks", label: "Compare" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-app)] text-ink">
      <header className="fixed inset-x-0 top-4 z-50 px-4">
        <div className="glass mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full border border-white/70 pl-5 pr-2 shadow-md">
          <Link href="/" className="flex items-center gap-2.5">
            <HexMark size="md" />
            <span className="font-display text-[16px] font-semibold tracking-tight text-ink">RAGHive</span>
          </Link>

          <nav className="hidden items-center gap-1 text-[13px] text-[var(--text-secondary)] md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-1.5 transition-colors hover:bg-white hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <Link
              href="/auth/sign-in"
              className="rounded-full px-3.5 py-2 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-white hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              href="/auth/sign-up"
              className="rounded-full bg-[var(--text-ink)] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#35324a]"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="px-4 pb-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 rounded-3xl border border-[var(--border-surface)] bg-[var(--bg-surface)] px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <HexMark size="md" />
            <div>
              <p className="font-display text-[15px] font-semibold text-ink">RAGHive</p>
              <p className="text-[12px] text-[var(--text-muted)]">An academic research project at LNMIIT</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--text-secondary)]">
            {["Python", "FastAPI", "LangGraph", "ChromaDB"].map((t) => (
              <span key={t} className="rounded-full bg-[var(--bg-subtle)] px-2.5 py-1">
                {t}
              </span>
            ))}
            <a
              href="https://github.com/soumya-xy/RAGHive"
              target="_blank"
              rel="noreferrer"
              className="ml-1 rounded-full border border-[var(--border-surface)] px-3 py-1 font-medium transition-colors hover:border-[var(--accent-primary-border)] hover:text-[var(--accent-text)]"
            >
              Source on GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
