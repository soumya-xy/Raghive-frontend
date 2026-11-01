"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendPasswordReset } from "@/lib/firebase/auth";
import { USE_MOCK_API } from "@/lib/api/mock/mock-mode";
import { toast } from "sonner";
import { ArrowLeft, Check } from "lucide-react";

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema) });

  const onSubmit = async (data: ForgotForm) => {
    setLoading(true);
    try {
      if (USE_MOCK_API) {
        toast.success("Reset email sent (mock mode)");
      } else {
        await sendPasswordReset(data.email);
        toast.success("Reset email sent");
      }
      setSent(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not send the reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[24px] font-semibold tracking-[-0.02em] text-ink">
          Reset password
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          We will email you a link to choose a new password.
        </p>
      </div>

      {sent ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-3 py-2.5">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--status-success)]" />
            <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
              If an account exists for that address, a reset link is on its way. Check your spam folder
              if it does not arrive within a few minutes.
            </p>
          </div>
          <Link
            href="/auth/sign-in"
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--accent-text)] hover:text-[var(--accent-text-strong)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[12px] font-medium text-[var(--text-secondary)]">
                Email
              </label>
              <Input
                id="email"
                {...register("email")}
                type="email"
                placeholder="you@university.edu"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-[11px] text-[var(--status-danger)]">{errors.email.message}</p>
              )}
            </div>

            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>

          <Link
            href="/auth/sign-in"
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--muted)] text-[var(--text-muted)] hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </>
      )}
    </div>
  );
}
