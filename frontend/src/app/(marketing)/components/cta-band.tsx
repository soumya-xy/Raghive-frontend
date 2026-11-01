import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HexMark } from "@/components/shared/hex-mark";

export function CtaBand() {
  return (
    <section className="px-4 pb-16">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[40px] bg-gradient-to-br from-[#c9caff] via-[var(--mint)] to-[var(--cream)] px-6 py-16 text-center sm:px-12 lg:py-24">
        <div className="bg-dot-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(60%_60%_at_50%_50%,black,transparent)]" />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center">
          <HexMark size="xl" glow />
          <h2 className="mt-6 font-display text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[52px]">
            Ask a question and <em className="font-normal italic">open the trace</em>.
          </h2>
          <p className="mt-4 text-[15px] text-[var(--text-secondary)]">No credit card. Runs against the live pipeline.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/sign-up"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-[var(--text-ink)] px-6 text-[14px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#35324a]"
            >
              Get started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/auth/sign-in"
              className="inline-flex h-12 items-center rounded-full bg-white/70 px-6 text-[14px] font-medium text-ink transition-colors hover:bg-white"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
