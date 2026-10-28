"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Baby } from "lucide-react";
import type { Child } from "@/types/db";

interface NoChildStateProps {
  groupId: string;
  existingChildren: Child[];
}

/**
 * Shown instead of the normal dashboard view when the signed-in user guards
 * zero children in their group — never render place-selection controls for
 * someone with no child to drive them. Lets them either attach themselves as
 * an additional guardian of an existing child (`POST /api/children/join`) or
 * create a brand-new one (`POST /api/children/create`); either action
 * refreshes the page so the server component re-fetches and renders the
 * normal per-child view.
 */
export default function NoChildState({
  groupId,
  existingChildren,
}: NoChildStateProps) {
  const router = useRouter();
  const [joiningChildId, setJoiningChildId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function joinChild(childId: string) {
    setError(null);
    setJoiningChildId(childId);
    try {
      const res = await fetch("/api/children/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? "아이를 선택하지 못했어요.");
        return;
      }

      router.refresh();
    } finally {
      setJoiningChildId(null);
    }
  }

  async function createChild(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/children/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, name: trimmed }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? "아이를 추가하지 못했어요.");
        return;
      }

      setName("");
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-yellow-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border-4 border-gray-800 bg-white p-6 text-center shadow-[4px_4px_0px_rgba(31,41,55,1)]">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-200 shadow-md shadow-blue-200">
          <Baby size={28} strokeWidth={2.5} className="text-blue-800" />
        </span>

        <h1 className="mb-5 text-xl font-jua text-pink-700">
          함께할 아이를 선택하거나 추가해주세요! 👶
        </h1>

        {existingChildren.length > 0 && (
          <div className="mb-5 flex flex-col gap-2">
            {existingChildren.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => joinChild(child.id)}
                disabled={joiningChildId === child.id}
                className="w-full rounded-2xl border-4 border-gray-800 bg-green-300 py-2 font-jua text-lg text-green-900 shadow-md shadow-green-200 transition-transform hover:scale-110 hover:-translate-y-1 active:scale-90 active:rotate-3 disabled:opacity-60"
              >
                {child.name} 선택하기 ✋
              </button>
            ))}
          </div>
        )}

        <form onSubmit={createChild} className="flex flex-col gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="아이 이름"
            className="w-full rounded-2xl border-2 border-gray-800 bg-yellow-50 px-3 py-2 text-center outline-none"
          />
          <button
            type="submit"
            disabled={creating}
            className="w-full rounded-2xl border-4 border-gray-800 bg-blue-300 py-2 font-jua text-lg text-blue-900 shadow-md shadow-blue-200 transition-transform hover:scale-110 hover:-translate-y-1 active:scale-90 active:rotate-3 disabled:opacity-60"
          >
            새 아이 추가 ✨
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}
