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
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotForm) => {
    setLoading(true);
    try {
      if (USE_MOCK_API) {
        toast.success("Password reset email sent (Mock Mode)");
      } else {
        await sendPasswordReset(data.email);
        toast.success("Password reset email sent!");
      }
      setSent(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Reset Your Password</h1>
        <p className="text-xs text-muted mt-1 font-mono">
          We'll send a password recovery link to your registered email
        </p>
      </div>

      {sent ? (
        <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="font-display font-semibold text-lg text-ink">Reset Link Dispatched</h3>
          <p className="text-xs text-muted">
            Check your inbox for step-by-step instructions to restore your account access.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-2 font-mono">
            <Link href="/auth/sign-in">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Return to Sign In
            </Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          <Button
            type="submit"
            variant="amber"
            className="w-full font-semibold h-11"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>Send Reset Password Link</span>
            )}
          </Button>
        </form>
      )}

      <p className="text-center text-xs text-muted">
        Remembered your password?{" "}
        <Link href="/auth/sign-in" className="text-amber-600 dark:text-amber-400 font-semibold hover:underline">
          Back to Sign In
        </Link>
      </p>
    </div>
  );
}
