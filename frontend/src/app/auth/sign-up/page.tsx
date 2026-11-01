"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/use-auth";
import { signUpWithEmail } from "@/lib/firebase/auth";
import { USE_MOCK_API } from "@/lib/api/mock/mock-mode";
import { toast } from "sonner";

const signUpSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    terms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms to continue",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignUpForm = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const { mockLogin } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpForm>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = async (data: SignUpForm) => {
    setLoading(true);
    try {
      if (USE_MOCK_API) {
        mockLogin(data.name, data.email);
        toast.success("Account created (mock mode)");
      } else {
        await signUpWithEmail(data.email, data.password, data.name);
        toast.success("Welcome to RAGHive");
      }
      router.push("/app/chat");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (message?: string) =>
    message ? <p className="text-[11px] text-[var(--status-danger)]">{message}</p> : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[24px] font-semibold tracking-[-0.02em] text-ink">
          Create an account
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          Start asking questions with a full reasoning trace.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-[12px] font-medium text-[var(--text-secondary)]">
            Name
          </label>
          <Input id="name" {...register("name")} placeholder="Your name" autoComplete="name" />
          {fieldError(errors.name?.message)}
        </div>

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
          {fieldError(errors.email?.message)}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[12px] font-medium text-[var(--text-secondary)]">
              Password
            </label>
            <Input
              id="password"
              {...register("password")}
              type="password"
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
            {fieldError(errors.password?.message)}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-[12px] font-medium text-[var(--text-secondary)]">
              Confirm
            </label>
            <Input
              id="confirmPassword"
              {...register("confirmPassword")}
              type="password"
              placeholder="Repeat password"
              autoComplete="new-password"
            />
            {fieldError(errors.confirmPassword?.message)}
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="terms" className="flex cursor-pointer items-start gap-2 text-[12px] text-[var(--text-secondary)]">
            <input
              id="terms"
              type="checkbox"
              {...register("terms")}
              className="mt-0.5 h-3.5 w-3.5 rounded border-[var(--border-strong)] accent-[var(--accent-primary)]"
            />
            <span>I agree to the academic terms and research license.</span>
          </label>
          {fieldError(errors.terms?.message)}
        </div>

        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-[12px] text-[var(--text-muted)]">
        Already have an account?{" "}
        <Link
          href="/auth/sign-in"
          className="font-medium text-[var(--accent-text)] hover:text-[var(--accent-text-strong)]"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
