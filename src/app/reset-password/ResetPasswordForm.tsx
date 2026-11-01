"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { toKoreanAuthError } from "@/lib/errorMessages";
import {
  MIN_PASSWORD_LENGTH,
  isAuthCallbackUrl,
  recoveryTokenHash,
  validateNewPassword,
} from "@/lib/passwordReset";

type LinkState =
  | { kind: "checking" }
  | { kind: "ready" }
  | { kind: "invalid"; message: string };

const OPEN_FROM_EMAIL =
  "비밀번호 재설정 메일의 링크로 들어와주세요. 링크가 오래됐다면 다시 요청해주세요.";

/**
 * Sets a new password from the reset email's link.
 *
 * The @supabase/ssr browser client (PKCE, detectSessionInUrl) exchanges the
 * link's `?code=` for a recovery session by itself when it starts, using
 * the code verifier saved in this browser's cookies by
 * resetPasswordForEmail(). `auth.initialize()` returns that same start-up
 * result, so its error (expired/used link, or Supabase's `#error=…`) is
 * shown here. A `code` with no saved verifier (link opened in another
 * browser or app) is skipped by the client and ends up with no session.
 */
export default function ResetPasswordForm() {
  const router = useRouter();
  const [linkState, setLinkState] = useState<LinkState>({ kind: "checking" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fromLink = isAuthCallbackUrl(
      window.location.search,
      window.location.hash
    );

    const tokenHash = recoveryTokenHash(window.location.search);

    (async () => {
      const supabase = createBrowserClient();
      let { error: initError } = await supabase.auth.initialize();
      if (!initError && tokenHash) {
        // token_hash email template: verify it here instead of a PKCE code.
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        initError = verifyError;
        if (!verifyError) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (initError) {
        setLinkState({
          kind: "invalid",
          message: toKoreanAuthError(initError.message),
        });
      } else if (session) {
        setLinkState({ kind: "ready" });
      } else if (fromLink) {
        setLinkState({
          kind: "invalid",
          message: toKoreanAuthError("PKCE code verifier not found in storage"),
        });
      } else {
        setLinkState({ kind: "invalid", message: OPEN_FROM_EMAIL });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const invalid = validateNewPassword(password, confirm);
    if (invalid) {
      setError(invalid);
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await createBrowserClient().auth.updateUser({
        password,
      });
      if (updateError) {
        setSaving(false);
        setError(toKoreanAuthError(updateError.message));
        return;
      }
    } catch (err) {
      setSaving(false);
      setError(toKoreanAuthError(err instanceof Error ? err.message : null));
      return;
    }

    // Keep the button pending while the dashboard loads.
    router.replace("/dashboard");
  }

  if (linkState.kind === "checking") {
    return (
      <div className="w-full rounded-2xl border-4 border-gray-800 bg-white p-6 text-center shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
        <p className="font-jua text-lg text-blue-900">링크를 확인하고 있어요...</p>
      </div>
    );
  }

  if (linkState.kind === "invalid") {
    return (
      <div className="w-full rounded-2xl border-4 border-gray-800 bg-white p-6 text-center shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
        <h1 className="mb-2 text-2xl font-jua text-pink-700">
          링크를 열 수 없어요 😢
        </h1>
        <p className="mb-5 text-sm leading-relaxed text-gray-600">
          {linkState.message}
        </p>
        <Link
          href="/forgot-password"
          className="block w-full rounded-2xl border-4 border-gray-800 bg-blue-300 py-2 font-jua text-lg text-blue-900 shadow-md shadow-blue-200 transition-transform hover:scale-105 active:scale-95"
        >
          재설정 메일 다시 받기
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl border-4 border-gray-800 bg-white p-6 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]"
    >
      <h1 className="mb-1 text-center text-2xl font-jua text-pink-700">
        새 비밀번호 만들기 🔑
      </h1>
      <p className="mb-6 text-center text-sm text-gray-600">
        {MIN_PASSWORD_LENGTH}자 이상으로 입력해주세요
      </p>

      <label className="mb-3 flex items-center gap-3 rounded-2xl border-2 border-gray-800 bg-yellow-50 px-3 py-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-200 shadow-md shadow-blue-200">
          <Lock size={18} strokeWidth={2.5} className="text-blue-900" />
        </span>
        <input
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          placeholder="새 비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-transparent outline-none"
        />
      </label>

      <label className="mb-4 flex items-center gap-3 rounded-2xl border-2 border-gray-800 bg-yellow-50 px-3 py-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-200 shadow-md shadow-blue-200">
          <Lock size={18} strokeWidth={2.5} className="text-blue-900" />
        </span>
        <input
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          placeholder="새 비밀번호 확인"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full bg-transparent outline-none"
        />
      </label>

      {error && (
        <p className="mb-3 text-center text-sm font-bold text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-2xl border-4 border-gray-800 bg-pink-300 py-2 font-jua text-lg text-pink-900 shadow-md shadow-pink-200 transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100"
      >
        {saving ? "바꾸는 중..." : "비밀번호 바꾸기"}
      </button>
    </form>
  );
}
