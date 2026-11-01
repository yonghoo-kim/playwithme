"use client";

import { useCallback, useState } from "react";
import { UserX } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  DELETE_ACCOUNT_FAILED,
  DELETE_ACCOUNT_MESSAGE,
  isAppStorageKey,
} from "@/lib/accountDeletion";

/**
 * "회원탈퇴" (POST /api/account/delete) behind a ConfirmDialog. On success
 * it signs out on this phone, clears this app's local storage and goes to
 * the landing page with a full reload, so nothing of the account lingers.
 */
export default function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeDialog = useCallback(() => setConfirming(false), []);

  async function deleteAccount() {
    setConfirming(false);
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? DELETE_ACCOUNT_FAILED);
        setDeleting(false);
        return;
      }
    } catch {
      setError(DELETE_ACCOUNT_FAILED);
      setDeleting(false);
      return;
    }

    // The account is gone; local clean-up failures don't matter any more.
    try {
      await createBrowserClient().auth.signOut({ scope: "local" });
    } catch {
      // Cookies were already cleared by the response.
    }
    try {
      Object.keys(window.localStorage)
        .filter(isAppStorageKey)
        .forEach((key) => window.localStorage.removeItem(key));
      Object.keys(window.sessionStorage)
        .filter(isAppStorageKey)
        .forEach((key) => window.sessionStorage.removeItem(key));
    } catch {
      // Storage blocked: nothing to clear.
    }
    // Keep the button disabled while the landing page loads.
    window.location.assign("/");
  }

  return (
    <div className="rounded-2xl border-4 border-gray-800 bg-white p-4 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
      <p className="mb-3 text-sm leading-relaxed text-gray-600">
        탈퇴하면 계정과 내가 보낸 채팅이 바로 지워져요. 다른 보호자와 함께
        등록한 아이는 그 보호자에게 그대로 남아요.
      </p>
      {error && (
        <p className="mb-3 text-center text-sm font-bold text-red-600">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={deleting}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-4 border-gray-800 bg-red-100 py-2 font-jua text-lg text-red-700 transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100"
      >
        <UserX size={18} strokeWidth={2.5} />
        {deleting ? "탈퇴하는 중..." : "회원탈퇴"}
      </button>
      {confirming && (
        <ConfirmDialog
          message={DELETE_ACCOUNT_MESSAGE}
          confirmLabel="탈퇴할게요"
          cancelLabel="아니요"
          onConfirm={deleteAccount}
          onCancel={closeDialog}
        />
      )}
    </div>
  );
}
