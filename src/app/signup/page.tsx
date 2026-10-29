"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    // When the Supabase project requires email confirmation, signUp()
    // succeeds but returns no session — redirecting to /dashboard would
    // just bounce back to /login with no explanation, so show a clear
    // "check your email" state instead.
    if (!data.session) {
      setLoading(false);
      setNeedsEmailConfirmation(true);
      return;
    }

    // Keep the button in its pending state while the next page loads.
    if (inviteCode) {
      router.push(`/invite/${inviteCode}`);
    } else {
      router.push("/dashboard");
    }
  }

  if (needsEmailConfirmation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-yellow-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border-4 border-gray-800 bg-white p-6 text-center shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
          <h1 className="mb-2 text-2xl font-jua text-pink-700">
            이메일을 확인해주세요 📧
          </h1>
          <p className="text-sm text-gray-600">
            {email}로 보낸 확인 메일의 링크를 눌러야 가입이 완료돼요.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-yellow-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border-4 border-gray-800 bg-white p-6 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]"
      >
        <h1 className="mb-1 text-center text-3xl font-jua text-pink-700">
          나랑 놀자 🎈
        </h1>
        <p className="mb-6 text-center text-sm text-blue-900">
          지훈이와 함께 시작해요! 🎈
        </p>

        <label className="mb-3 flex items-center gap-3 rounded-2xl border-2 border-gray-800 bg-yellow-50 px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-200 shadow-md shadow-yellow-200">
            <Mail size={18} strokeWidth={2.5} className="text-yellow-800" />
          </span>
          <input
            type="email"
            required
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent outline-none"
          />
        </label>

        <label className="mb-3 flex items-center gap-3 rounded-2xl border-2 border-gray-800 bg-yellow-50 px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-200 shadow-md shadow-blue-200">
            <Lock size={18} strokeWidth={2.5} className="text-blue-900" />
          </span>
          <input
            type="password"
            required
            minLength={6}
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          className="w-full rounded-2xl border-4 border-gray-800 bg-pink-300 py-2 font-jua text-lg text-pink-900 shadow-md shadow-pink-200 transition-transform hover:scale-110 hover:-translate-y-1 active:scale-90 active:rotate-3 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:active:rotate-0 disabled:active:scale-100"
        >
          {loading ? "가입 중..." : "시작하기 ✨"}
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">
          이미 계정이 있나요?{" "}
          <Link href="/login" className="font-bold text-blue-900 underline">
            로그인
          </Link>
        </p>
      </form>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
