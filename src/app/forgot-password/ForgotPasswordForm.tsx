"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { toKoreanAuthError } from "@/lib/errorMessages";
import {
  RESET_EMAIL_SENT_MESSAGE,
  resetPasswordRedirectUrl,
  showResetRequestError,
} from "@/lib/passwordReset";

/**
 * "비밀번호를 잊으셨나요?": sends Supabase's reset email, whose link opens
 * /reset-password. The same message follows whether or not the address has
 * an account.
 */
export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let message: string | null = null;
    try {
      // PKCE: the code verifier is saved in this browser, so the link has
      // to be opened here too (the page says so).
      const { error: resetError } = await createBrowserClient().auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: resetPasswordRedirectUrl(window.location.origin) }
      );
      message = resetError?.message ?? null;
    } catch (err) {
      message = err instanceof Error ? err.message : "Failed to fetch";
    }

    setLoading(false);
    if (showResetRequestError(message)) {
      setError(toKoreanAuthError(message));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="w-full rounded-2xl border-4 border-gray-800 bg-white p-6 text-center shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
        <h1 className="mb-2 text-2xl font-jua text-pink-700">
          메일을 확인해주세요 📧
        </h1>
        <p className="mb-2 text-sm leading-relaxed text-gray-600">
          {RESET_EMAIL_SENT_MESSAGE}
        </p>
        <p className="mb-5 text-xs leading-relaxed text-gray-500">
          메일의 링크는 지금 이 브라우저에서 열어주세요.
        </p>
        <Link
          href="/login"
          className="block w-full rounded-2xl border-4 border-gray-800 bg-blue-300 py-2 font-jua text-lg text-blue-900 shadow-md shadow-blue-200 transition-transform hover:scale-105 active:scale-95"
        >
          로그인으로 가기
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
        비밀번호 찾기 🔑
      </h1>
      <p className="mb-6 text-center text-sm text-gray-600">
        가입한 이메일로 재설정 링크를 보내드려요
      </p>

      <label className="mb-4 flex items-center gap-3 rounded-2xl border-2 border-gray-800 bg-yellow-50 px-3 py-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-200 shadow-md shadow-yellow-200">
          <Mail size={18} strokeWidth={2.5} className="text-yellow-800" />
        </span>
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
        disabled={loading}
        className="w-full rounded-2xl border-4 border-gray-800 bg-blue-300 py-2 font-jua text-lg text-blue-900 shadow-md shadow-blue-200 transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100"
      >
        {loading ? "보내는 중..." : "재설정 메일 보내기"}
      </button>

      <p className="mt-4 text-center text-sm text-gray-600">
        비밀번호가 생각났나요?{" "}
        <Link href="/login" className="font-bold text-blue-900 underline">
          로그인
        </Link>
      </p>
    </form>
  );
}
