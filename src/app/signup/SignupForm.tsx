"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Baby, X } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { inviteQuery } from "@/lib/inviteQuery";
import { safeNextPath } from "@/lib/safeNext";
import { toKoreanAuthError } from "@/lib/errorMessages";

export default function SignupForm({
  inviteCode,
  fromChildId,
  nextPath,
}: {
  inviteCode: string | null;
  fromChildId: string | null;
  /** Validated server-side; re-checked here before use. */
  nextPath: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  // Each child-name input keeps a stable id so removing one doesn't shift
  // the others' focus/state.
  const [children, setChildren] = useState<{ id: number; name: string }[]>([
    { id: 0, name: "" },
  ]);
  const [nextChildId, setNextChildId] = useState(1);
  const [childError, setChildError] = useState<string | null>(null);

  function addChild() {
    setChildren((prev) => [...prev, { id: nextChildId, name: "" }]);
    setNextChildId((n) => n + 1);
  }

  function removeChild(id: number) {
    setChildren((prev) => prev.filter((c) => c.id !== id));
  }

  function updateChild(id: number, name: string) {
    setChildError(null);
    setChildren((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }

  // Carry the invite and `next` (same-origin relative only) back to login,
  // so a guardian invite link isn't lost on the way.
  const next = safeNextPath(nextPath);
  const loginParams = new URLSearchParams(
    inviteQuery(inviteCode, fromChildId).replace(/^\?/, "")
  );
  if (next) loginParams.set("next", next);
  const loginQueryString = loginParams.toString();
  const query = loginQueryString ? `?${loginQueryString}` : "";
  const loginHref = `/login${query}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAlreadyRegistered(false);
    setChildError(null);

    const childNames = children
      .map((c) => c.name.trim())
      .filter((name) => name !== "");
    if (childNames.length === 0) {
      setChildError("아이 이름을 한 명 이상 입력해주세요");
      return;
    }

    setLoading(true);

    const supabase = createBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // The confirmation email lands on the login page, with the invite
        // banner when there is one and `next` to continue to afterwards.
        emailRedirectTo: `${window.location.origin}/login${query}`,
        // The handle_new_user DB trigger creates these children, each
        // guarded by the new user, and makes the first one active.
        data: { child_names: childNames },
      },
    });

    if (signUpError) {
      setLoading(false);
      setError(toKoreanAuthError(signUpError.message));
      return;
    }

    // With email confirmation on, signing up an already-registered email
    // returns no error, no session and a user with an empty `identities`
    // array (Supabase hides that the account exists). Point to login
    // instead of claiming a confirmation email was sent.
    if (data.user && data.user.identities?.length === 0) {
      setLoading(false);
      setAlreadyRegistered(true);
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

    // Keep the button in its pending state while the next page loads. An
    // explicit `next` (e.g. a guardian invite link) wins over the invite.
    if (next) {
      router.push(next);
    } else if (inviteCode) {
      router.push(`/invite/${encodeURIComponent(inviteCode)}`);
    } else {
      router.push("/dashboard");
    }
  }

  if (needsEmailConfirmation) {
    return (
      <div className="w-full rounded-2xl border-4 border-gray-800 bg-white p-6 text-center shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
        <h1 className="mb-2 text-2xl font-jua text-pink-700">
          이메일을 확인해주세요 📧
        </h1>
        <p className="text-sm text-gray-600">
          {email}로 보낸 확인 메일의 링크를 눌러야 가입이 완료돼요.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl border-4 border-gray-800 bg-white p-6 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]"
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

      <div className="mb-3 rounded-2xl border-2 border-gray-800 bg-pink-50 p-3">
        <p className="mb-2 text-sm font-bold text-pink-700">아이 이름</p>
        {children.map((child, index) => (
          <div key={child.id} className="mb-2 flex items-center gap-2">
            <label className="flex flex-1 items-center gap-3 rounded-2xl border-2 border-gray-800 bg-white px-3 py-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-200 shadow-md shadow-pink-200">
                <Baby size={18} strokeWidth={2.5} className="text-pink-800" />
              </span>
              <input
                type="text"
                maxLength={30}
                placeholder="아이 이름"
                aria-label={`아이 이름 ${index + 1}`}
                value={child.name}
                onChange={(e) => updateChild(child.id, e.target.value)}
                className="w-full min-w-0 bg-transparent outline-none"
              />
            </label>
            {index > 0 && (
              <button
                type="button"
                onClick={() => removeChild(child.id)}
                aria-label="이 아이 빼기"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-gray-800 bg-gray-100 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95"
              >
                <X size={16} strokeWidth={2.5} className="text-gray-700" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addChild}
          className="w-full rounded-2xl border-2 border-gray-800 bg-white py-1.5 font-jua text-pink-700 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95"
        >
          + 아이 더 추가
        </button>
        <p className="mt-2 text-xs text-gray-600">
          가입 후 그룹에 초대받거나 그룹을 만들면 아이를 연결할 수 있어요
        </p>
      </div>

      {childError && (
        <p className="mb-3 text-center text-sm font-bold text-red-600">
          {childError}
        </p>
      )}

      {error && (
        <p className="mb-3 text-center text-sm font-bold text-red-600">
          {error}
        </p>
      )}

      {alreadyRegistered && (
        <p className="mb-3 text-center text-sm font-bold text-red-600">
          이미 가입된 이메일이에요.{" "}
          <Link href={loginHref} className="text-blue-900 underline">
            로그인해주세요
          </Link>
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl border-4 border-gray-800 bg-pink-300 py-2 font-jua text-lg text-pink-900 shadow-md shadow-pink-200 transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100"
      >
        {loading ? "가입 중..." : "가입하기 ✨"}
      </button>

      <p className="mt-4 text-center text-sm text-gray-600">
        이미 계정이 있나요?{" "}
        <Link href={loginHref} className="font-bold text-blue-900 underline">
          로그인
        </Link>
      </p>
    </form>
  );
}
