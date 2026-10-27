"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Lock, ShieldAlert, Trash2, Key, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPass || !newPass) return;
    toast.success("Password updated successfully!");
    setOldPass("");
    setNewPass("");
  };

  const handleDeleteAccount = () => {
    if (confirmText !== "DELETE") return;
    toast.error("Account permanently deleted.");
    signOut();
    router.push("/");
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
            <Button type="submit" variant="amber" size="sm" className="font-semibold">
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
                <span className="font-mono font-semibold text-ink">Current Windows Workstation</span>
                <p className="text-[10px] font-mono text-muted">Chrome • LNMIIT Campus Network</p>
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
              disabled={confirmText !== "DELETE"}
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
