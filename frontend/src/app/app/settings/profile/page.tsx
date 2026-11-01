"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useProfile } from "@/lib/hooks/use-profile";
import { ApiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";

export default function ProfileSettingsPage() {
  const { idToken } = useAuth();
  const { displayName: savedName, email, refresh } = useProfile();
  const [draft, setDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const shownName = draft ?? savedName;

  const handleSave = async () => {
    const name = shownName.trim();
    if (!name) {
      toast.error("Display name cannot be empty.");
      return;
    }
    setLoading(true);
    try {
      await ApiClient.updateProfile(name, idToken || undefined);
      setDraft(null);
      await refresh();
      toast.success("Profile updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>How your name appears in the workspace.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--accent-primary-border)] bg-[var(--accent-primary-light)] text-[13px] font-medium text-[var(--accent-text)]">
            {savedName ? savedName.trim()[0]?.toUpperCase() : "R"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ink">{savedName || "Researcher"}</p>
            <p className="truncate text-[12px] text-[var(--text-muted)]">
              {email || "No email on file"}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="display-name" className="text-[12px] font-medium text-[var(--text-secondary)]">
            Display name
          </label>
          <Input
            id="display-name"
            value={shownName}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-[12px] font-medium text-[var(--text-secondary)]">
            Email
          </label>
          <Input id="email" value={email || ""} disabled placeholder="Not available" />
          <p className="text-[11px] text-[var(--text-muted)]">
            Email changes are handled by your identity provider.
          </p>
        </div>
      </CardContent>

      <CardFooter>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "Save changes"}
        </Button>
      </CardFooter>
    </Card>
  );
}
