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
import { User, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

const signUpSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    terms: z.boolean().refine((val) => val === true, {
      message: "You must accept the research license terms",
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
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpForm) => {
    setLoading(true);
    try {
      if (USE_MOCK_API) {
        mockLogin(data.name, data.email);
        toast.success("Account created successfully (Mock Mode)");
      } else {
        await signUpWithEmail(data.email, data.password, data.name);
        toast.success("Welcome to RAGHive!");
      }
      router.push("/app/chat");
    } catch (err: any) {
      toast.error(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Create RAGHive Account</h1>
        <p className="text-xs text-muted mt-1 font-mono">
          Join the transparent glass-box AI explainability platform
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1">
          <label className="text-xs font-mono font-medium text-ink">Full Name</label>
          <div className="relative">
            <User className="w-4 h-4 absolute left-3 top-3 text-muted" />
            <Input {...register("name")} placeholder="Dr. Soumya Jain" className="pl-9" />
          </div>
          {errors.name && (
            <p className="text-[11px] font-mono text-rose-500 mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Email Address */}
        <div className="space-y-1">
          <label className="text-xs font-mono font-medium text-ink">Email Address</label>
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

        {/* Password */}
        <div className="space-y-1">
          <label className="text-xs font-mono font-medium text-ink">Password</label>
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

        {/* Confirm Password */}
        <div className="space-y-1">
          <label className="text-xs font-mono font-medium text-ink">Confirm Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-3 text-muted" />
            <Input
              {...register("confirmPassword")}
              placeholder="••••••••"
              type="password"
              className="pl-9"
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-[11px] font-mono text-rose-500 mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Terms Checkbox */}
        <div className="space-y-1">
          <label className="flex items-center space-x-2 text-xs text-muted cursor-pointer">
            <input
              type="checkbox"
              {...register("terms")}
              className="rounded accent-amber-500 focus:ring-amber-500"
            />
            <span>I agree to the academic terms & research license</span>
          </label>
          {errors.terms && (
            <p className="text-[11px] font-mono text-rose-500">{errors.terms.message}</p>
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
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-muted">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="text-amber-600 dark:text-amber-400 font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
