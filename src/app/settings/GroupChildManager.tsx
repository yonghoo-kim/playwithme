"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Baby } from "lucide-react";

interface ChildOption {
  id: string;
  name: string;
}

interface GroupChildManagerProps {
  groupId: string;
  groupName: string;
  /** Children in this group the signed-in user already guards. */
  myChildren: ChildOption[];
  /** Children in this group the signed-in user does NOT guard yet. */
  joinableChildren: ChildOption[];
}

/**
 * Per-group "아이 추가/연결" card on the Settings page: shows the user's own
 * children in this group, lets them attach as a guardian of an existing
 * child in this group (`POST /api/children/join`) or create a new one
 * (`POST /api/children/create`). Both APIs make that child active, so on
 * success we go straight to the dashboard showing it.
 */
export default function GroupChildManager({
  groupId,
  groupName,
  myChildren,
  joinableChildren,
}: GroupChildManagerProps) {
  const router = useRouter();
  const [joiningChildId, setJoiningChildId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function goToDashboard() {
    router.push("/dashboard");
    router.refresh();
  }

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
        setError(body?.error ?? "아이를 연결하지 못했어요.");
        return;
      }

      goToDashboard();
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
      goToDashboard();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-2xl border-4 border-gray-800 bg-white p-5 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-200 shadow-md shadow-blue-200">
          <Baby size={20} strokeWidth={2.5} className="text-blue-800" />
        </span>
        <h3 className="min-w-0 flex-1 truncate font-jua text-lg text-pink-700">
          {groupName}
        </h3>
      </div>

      {myChildren.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {myChildren.map((child) => (
            <span
              key={child.id}
              className="rounded-full border-2 border-gray-800 bg-green-200 px-3 py-1 text-sm font-bold text-green-900"
            >
              {child.name}
            </span>
          ))}
        </div>
      ) : (
        <p className="mb-4 text-sm font-bold text-blue-900">
          이 그룹에서 함께할 아이를 선택하거나 추가해주세요! 👶
        </p>
      )}

      {joinableChildren.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {joinableChildren.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={() => joinChild(child.id)}
              disabled={joiningChildId === child.id}
              className="w-full rounded-2xl border-4 border-gray-800 bg-green-300 py-2 font-jua text-lg text-green-900 shadow-md shadow-green-200 transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
            >
              {child.name} 보호자로 연결하기 ✋
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
          placeholder="새 아이 이름"
          className="w-full rounded-2xl border-2 border-gray-800 bg-yellow-50 px-3 py-2 text-center outline-none"
        />
        <button
          type="submit"
          disabled={creating}
          className="w-full rounded-2xl border-4 border-gray-800 bg-blue-300 py-2 font-jua text-lg text-blue-900 shadow-md shadow-blue-200 transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
        >
          새 아이 추가 ✨
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
