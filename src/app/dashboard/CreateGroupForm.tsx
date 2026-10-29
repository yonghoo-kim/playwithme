"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

interface CreateGroupFormProps {
  /** The active child — the new group starts with this child in it. */
  childId: string;
  childName: string;
}

/**
 * "+ 그룹 만들기": a button that opens an inline name form. Creates the group
 * with the active child in it (`POST /api/groups/create`), then shows it
 * opened in the dashboard's group list (`/dashboard?group=<id>`).
 */
export default function CreateGroupForm({
  childId,
  childName,
}: CreateGroupFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/groups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, childIds: [childId] }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        group?: { id: string };
        error?: string;
      };

      if (!res.ok || !data.group) {
        // 409 carries "이미 같은 이름의 그룹이 있어요".
        setError(data.error ?? "그룹을 만들지 못했어요. 다시 시도해주세요.");
        setSubmitting(false);
        return;
      }

      // Stay on the dashboard: `?group=` makes the server list the new group
      // and the accordion opens it. Close the form for the next one.
      setOpen(false);
      setName("");
      setSubmitting(false);
      router.replace(
        "/dashboard?group=" + encodeURIComponent(data.group.id),
        { scroll: false }
      );
    } catch {
      setError("그룹을 만들지 못했어요. 다시 시도해주세요.");
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 rounded-2xl border-4 border-dashed border-gray-400 bg-white/60 px-4 py-3 font-jua text-lg text-purple-900 transition-transform hover:scale-105 active:scale-95"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-200 shadow-md shadow-purple-200">
          <Plus size={18} strokeWidth={3} className="text-purple-900" />
        </span>
        그룹 만들기
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-2xl border-4 border-gray-800 bg-white p-3 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]"
    >
      <label htmlFor="new-group-name" className="font-jua text-pink-700">
        {childName}의 새 그룹 이름
      </label>
      <input
        id="new-group-name"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="예: 햇살 놀이터 친구들"
        required
        autoFocus
        maxLength={40}
        className="w-full rounded-2xl border-2 border-gray-800 bg-yellow-50 px-3 py-2 outline-none"
      />

      {error && (
        <p role="alert" className="text-xs font-bold text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="flex-1 rounded-2xl border-4 border-gray-800 bg-gray-100 py-2 font-jua text-gray-600 transition-transform hover:scale-105 active:scale-95"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="flex-1 rounded-2xl border-4 border-gray-800 bg-pink-300 py-2 font-jua text-pink-900 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
        >
          {submitting ? "만드는 중…" : "만들기 ✨"}
        </button>
      </div>
    </form>
  );
}
