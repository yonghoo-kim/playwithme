"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Adds a new child the signed-in user guards (`POST /api/children/create`),
 * in no group yet, then refreshes the Settings page to show it.
 */
export default function AddChildForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/children/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? "아이를 추가하지 못했어요.");
        return;
      }

      setName("");
      router.refresh();
    } catch {
      setError("아이를 추가하지 못했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border-4 border-gray-800 bg-white p-4 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]"
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={30}
        placeholder="아이 이름"
        aria-label="아이 이름"
        className="w-full rounded-2xl border-2 border-gray-800 bg-yellow-50 px-3 py-2 text-center outline-none"
      />
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl border-4 border-gray-800 bg-blue-300 py-2 font-jua text-lg text-blue-900 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
      >
        아이 추가하기 ✨
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
