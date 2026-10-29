"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Baby, PartyPopper } from "lucide-react";

const inputClass =
  "w-full rounded-2xl border-2 border-gray-800 bg-yellow-50 px-3 py-2 text-center outline-none";
const submitClass =
  "w-full rounded-2xl border-4 border-gray-800 bg-blue-300 py-2 font-jua text-lg text-blue-900 shadow-md shadow-blue-200 transition-transform hover:scale-110 hover:-translate-y-1 active:scale-90 active:rotate-3 disabled:opacity-60";

/**
 * One guided flow on the Settings page: name a new group
 * (`POST /api/groups/create`), then — inline, without leaving the page —
 * name that group's first child (`POST /api/children/create`), which also
 * makes that child active, then land on the dashboard.
 */
export default function CreateGroupForm() {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [childName, setChildName] = useState("");
  const [createdGroup, setCreatedGroup] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = groupName.trim();
    if (!trimmed) {
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/groups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body?.group?.id) {
        // 409 carries the friendly duplicate-name message from the API.
        setError(body?.error ?? "그룹을 만들지 못했어요.");
        return;
      }

      setCreatedGroup({ id: body.group.id, name: body.group.name ?? trimmed });
      setGroupName("");
    } finally {
      setSubmitting(false);
    }
  }

  async function createFirstChild(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = childName.trim();
    if (!trimmed || !createdGroup) {
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/children/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: createdGroup.id, name: trimmed }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? "아이를 추가하지 못했어요.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border-4 border-gray-800 bg-white p-5 text-center shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
      {createdGroup ? (
        <>
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-200 shadow-md shadow-blue-200">
            <Baby size={24} strokeWidth={2.5} className="text-blue-800" />
          </span>
          <p className="mb-4 font-jua text-lg text-pink-700">
            {createdGroup.name} 그룹이 생겼어요! 첫 아이 이름을 알려주세요 👶
          </p>
          <form onSubmit={createFirstChild} className="flex flex-col gap-3">
            <input
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              required
              placeholder="첫 아이 이름"
              className={inputClass}
            />
            <button type="submit" disabled={submitting} className={submitClass}>
              아이 추가하고 시작하기 ✨
            </button>
          </form>
        </>
      ) : (
        <>
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-200 shadow-md shadow-yellow-200">
            <PartyPopper size={24} strokeWidth={2.5} className="text-yellow-800" />
          </span>
          <form onSubmit={createGroup} className="flex flex-col gap-3">
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              placeholder="그룹 이름 (예: 해님반, 101동 친구들)"
              className={inputClass}
            />
            <button type="submit" disabled={submitting} className={submitClass}>
              그룹 만들기 ✨
            </button>
          </form>
        </>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
