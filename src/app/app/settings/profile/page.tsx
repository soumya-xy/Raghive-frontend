"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { User, Mail, Save } from "lucide-react";

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "Dr. Soumya Jain");
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Profile details updated successfully!");
    }, 400);
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
        <CardDescription>
          Manage your personal details and academic credentials displayed across sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4 pb-4 border-b border-surface">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-500 font-mono font-bold text-xl">
            {displayName[0] || "R"}
          </div>
          <div>
            <h4 className="font-display font-semibold text-ink text-base">{displayName}</h4>
            <p className="text-xs font-mono text-muted">{user?.email || "researcher@lnmiit.ac.in"}</p>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-mono font-medium text-ink">Display Name</label>
          <div className="relative">
            <User className="w-4 h-4 absolute left-3 top-3 text-muted" />
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-mono font-medium text-ink">Email Address (Read-only)</label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-3 text-muted" />
            <Input
              value={user?.email || "researcher@lnmiit.ac.in"}
              disabled
              className="pl-9 opacity-70 cursor-not-allowed"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="amber" onClick={handleSave} disabled={loading} className="font-semibold">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
}
