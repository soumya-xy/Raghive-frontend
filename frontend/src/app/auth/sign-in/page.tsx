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
import { signInWithEmail, signInWithGoogle } from "@/lib/firebase/auth";
import { USE_MOCK_API } from "@/lib/api/mock/mock-mode";
import { toast } from "sonner";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignInForm = z.infer<typeof signInSchema>;

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function SignInPage() {
  const router = useRouter();
  const { mockLogin } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInForm>({ resolver: zodResolver(signInSchema) });

  const onSubmit = async (data: SignInForm) => {
    setLoading(true);
    try {
      if (USE_MOCK_API) {
        mockLogin("Researcher", data.email);
        toast.success("Signed in (mock mode)");
      } else {
        await signInWithEmail(data.email, data.password);
        toast.success("Welcome back");
      }
      router.push("/app/chat");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not sign in. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      if (USE_MOCK_API) {
        mockLogin("Researcher", "researcher@lnmiit.ac.in");
        toast.success("Signed in with Google (mock mode)");
      } else {
        await signInWithGoogle();
        toast.success("Signed in with Google");
      }
      router.push("/app/chat");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[24px] font-semibold tracking-[-0.02em] text-ink">Sign in</h1>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          Open your explainable RAG workspace.
        </p>
      </div>

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
          {errors.email && <p className="text-[11px] text-[var(--status-danger)]">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-[12px] font-medium text-[var(--text-secondary)]">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-[11px] text-[var(--accent-text)] hover:text-[var(--accent-text-strong)]"
            >
              Forgot?
            </Link>
          </div>
          <Input
            id="password"
            {...register("password")}
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
          />
          {errors.password && (
            <p className="text-[11px] text-[var(--status-danger)]">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[var(--border-surface)]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[var(--bg-app)] px-2 text-[11px] text-[var(--text-muted)]">or</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full"
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      <p className="text-center text-[12px] text-[var(--text-muted)]">
        No account?{" "}
        <Link
          href="/auth/sign-up"
          className="font-medium text-[var(--accent-text)] hover:text-[var(--accent-text-strong)]"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
