"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Lock, ShieldAlert, Trash2, Key } from "lucide-react";
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
      toast.success("Password updated (mock mode — nothing was changed).");
      setOldPass("");
      setNewPass("");
      return;
    }
    setChanging(true);
    try {
      await changeEmailPassword(oldPass, newPass);
      toast.success("Password updated successfully!");
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
      toast.error("Account permanently deleted (mock mode — nothing was deleted).");
      await signOut();
      router.push("/");
      return;
    }
    setDeleting(true);
    try {
      // 1. Re-verify the password while the session is fresh.
      await reauthenticateEmail(deletePass);
      // 2. Remove chats/messages on the backend while the bearer token is still valid.
      await ApiClient.deleteAccountData(idToken || undefined);
      // 3. Delete the Firebase identity last.
      await deleteCurrentFirebaseUser();
      toast.success("Account permanently deleted.");
      router.push("/");
    } catch (err: unknown) {
      toast.error(errorText(err, "Could not delete account."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="w-4 h-4 text-amber-500" />
            <span>Change Password</span>
          </CardTitle>
          <CardDescription>Update your authentication password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-medium text-ink">Current Password</label>
              <Input
                type="password"
                value={oldPass}
                onChange={(e) => setOldPass(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono font-medium text-ink">New Password</label>
              <Input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" variant="amber" size="sm" className="font-semibold" disabled={changing}>
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-amber-500" />
            <span>Active Sessions</span>
          </CardTitle>
          <CardDescription>Devices currently authenticated to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-xl border border-surface bg-surface flex items-center justify-between text-xs">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <span className="font-mono font-semibold text-ink">Current Browser Session</span>
                <p className="text-[10px] font-mono text-muted">This device only — session listing is not tracked</p>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/30">
              Active Now
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-rose-500/30 bg-rose-500/5">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-4 h-4" />
            <span>Danger Zone</span>
          </CardTitle>
          <CardDescription>Irreversible actions on your research account and saved traces</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="danger" size="sm" onClick={() => setDeleteModalOpen(true)} className="font-semibold">
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            Delete RAGHive Account
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-rose-500">Delete RAGHive Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All saved chat histories, attribution traces, and settings will be permanently removed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {!USE_MOCK_API && (
              <div className="space-y-1">
                <label className="text-xs font-mono text-ink">Current password</label>
                <Input
                  type="password"
                  value={deletePass}
                  onChange={(e) => setDeletePass(e.target.value)}
                  placeholder="••••••••"
                  className="font-mono"
                />
              </div>
            )}
            <p className="text-xs font-mono text-ink">
              Type <strong className="text-rose-500">DELETE</strong> to confirm:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={confirmText !== "DELETE" || deleting || (!USE_MOCK_API && !deletePass)}
              onClick={handleDeleteAccount}
            >
              Permanently Delete Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
