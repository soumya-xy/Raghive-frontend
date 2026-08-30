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
import { Lock, Mail, ArrowRight, Loader2 } from "lucide-react";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignInForm = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const router = useRouter();
  const { mockLogin } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInForm) => {
    setLoading(true);
    try {
      if (USE_MOCK_API) {
        mockLogin("Researcher User", data.email);
        toast.success("Signed in successfully (Mock Mode)");
      } else {
        await signInWithEmail(data.email, data.password);
        toast.success("Welcome back to RAGHive!");
      }
      router.push("/app/chat");
    } catch (err: any) {
      toast.error(err.message || "Failed to sign in. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      if (USE_MOCK_API) {
        mockLogin("Google Researcher", "google.user@lnmiit.ac.in");
        toast.success("Signed in with Google (Mock Mode)");
      } else {
        await signInWithGoogle();
        toast.success("Signed in with Google!");
      }
      router.push("/app/chat");
    } catch (err: any) {
      toast.error(err.message || "Google sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Sign in to RAGHive</h1>
        <p className="text-xs text-muted mt-1 font-mono">
          Access your transparent, explainable RAG workspace
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1">
          <label className="text-xs font-mono font-medium text-ink flex items-center justify-between">
            <span>Email Address</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-3 text-muted" />
            <Input
              {...register("email")}
              placeholder="researcher@lnmiit.ac.in"
              type="email"
              className="pl-9"
            />
          </div>
          {errors.email && (
            <p className="text-[11px] font-mono text-rose-500 mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-mono font-medium text-ink">
            <span>Password</span>
            <Link
              href="/auth/forgot-password"
              className="text-amber-600 dark:text-amber-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-3 text-muted" />
            <Input
              {...register("password")}
              placeholder="••••••••"
              type="password"
              className="pl-9"
            />
          </div>
          {errors.password && (
            <p className="text-[11px] font-mono text-rose-500 mt-1">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          variant="amber"
          className="w-full font-semibold h-11"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </form>

      <div className="relative flex items-center justify-center my-4">
        <div className="border-t border-surface w-full" />
        <span className="bg-app px-3 text-[11px] font-mono text-muted uppercase tracking-wider absolute">
          Or continue with
        </span>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full h-11 font-mono text-xs"
      >
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
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
        <span>Google Account</span>
      </Button>

      <p className="text-center text-xs text-muted">
        Don't have an account?{" "}
        <Link href="/auth/sign-up" className="text-amber-600 dark:text-amber-400 font-semibold hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}
