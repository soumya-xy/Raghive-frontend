"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { ApiClient } from "@/lib/api/client";
import { USE_MOCK_API } from "@/lib/api/mock/mock-mode";
import {
  changeEmailPassword,
  deleteCurrentFirebaseUser,
  reauthenticateEmail,
} from "@/lib/firebase/auth";

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

export default function AccountSettingsPage() {
  const router = useRouter();
  const { signOut, idToken } = useAuth();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deletePass, setDeletePass] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [changing, setChanging] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPass || !newPass) return;
    if (newPass.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (USE_MOCK_API) {
      toast.success("Password updated (mock mode — nothing changed).");
      setOldPass("");
      setNewPass("");
      return;
    }
    setChanging(true);
    try {
      await changeEmailPassword(oldPass, newPass);
      toast.success("Password updated");
      setOldPass("");
      setNewPass("");
    } catch (err: unknown) {
      toast.error(errorText(err, "Could not change password."));
    } finally {
      setChanging(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE") return;
    if (USE_MOCK_API) {
      toast.error("Account deleted (mock mode — nothing deleted).");
      await signOut();
      router.push("/");
      return;
    }
    setDeleting(true);
    try {
      await reauthenticateEmail(deletePass);
      await ApiClient.deleteAccountData(idToken || undefined);
      await deleteCurrentFirebaseUser();
      toast.success("Account deleted.");
      router.push("/");
    } catch (err: unknown) {
      toast.error(errorText(err, "Could not delete account."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change the password for this account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="current-password" className="text-[12px] font-medium text-[var(--text-secondary)]">
                  Current password
                </label>
                <Input
                  id="current-password"
                  type="password"
                  value={oldPass}
                  onChange={(e) => setOldPass(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="new-password" className="text-[12px] font-medium text-[var(--text-secondary)]">
                  New password
                </label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <Button type="submit" variant="primary" size="sm" disabled={changing || !oldPass || !newPass}>
              {changing ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>
            This build does not track individual devices, so only the current browser session is shown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-[var(--border-surface)] px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-success)]" />
              <span className="text-[12px] text-[var(--text-secondary)]">Current browser session</span>
            </div>
            <span className="rounded border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-1.5 py-0.5 text-[10px] text-[var(--status-success)]">
              active
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[var(--status-danger-border)]">
        <CardHeader>
          <CardTitle className="text-[var(--status-danger)]">Delete account</CardTitle>
          <CardDescription>
            Permanently deletes your chats, saved traces, and profile. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="danger" size="sm" onClick={() => setDeleteModalOpen(true)}>
            Delete account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[var(--status-danger)]">Delete account</DialogTitle>
            <DialogDescription>
              Your conversations, traces, and profile will be removed permanently.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {!USE_MOCK_API && (
              <div className="space-y-1.5">
                <label htmlFor="delete-password" className="text-[12px] text-[var(--text-secondary)]">
                  Current password
                </label>
                <Input
                  id="delete-password"
                  type="password"
                  value={deletePass}
                  onChange={(e) => setDeletePass(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="delete-confirm" className="text-[12px] text-[var(--text-secondary)]">
                Type <span className="font-medium text-[var(--status-danger)]">DELETE</span> to confirm
              </label>
              <Input
                id="delete-confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={confirmText !== "DELETE" || deleting || (!USE_MOCK_API && !deletePass)}
              onClick={handleDeleteAccount}
            >
              {deleting ? "Deleting…" : "Delete account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
