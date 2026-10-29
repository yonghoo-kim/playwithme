"use client";

import { useCallback, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Crown, LogOut, Pencil, Plus, Trash2, Users } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

export interface SettingsGroup {
  id: string;
  name: string;
  /** Every child in the group. */
  childCount: number;
  /** I created it — I may rename or delete it. */
  isOwner: boolean;
  /** My children in it. */
  myChildIds: string[];
}

interface MyGroupsProps {
  groups: SettingsGroup[];
  myChildren: { id: string; name: string }[];
}

type PendingAction =
  | { kind: "delete"; group: SettingsGroup }
  | { kind: "leave"; group: SettingsGroup };

const cardClass =
  "flex flex-col gap-2 rounded-2xl border-4 border-gray-800 bg-white p-3 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]";
const smallButton =
  "flex items-center gap-1 rounded-full border-2 px-3 py-1 text-xs font-bold transition-transform hover:scale-105 active:scale-95 disabled:opacity-60";

async function postJson(url: string, body: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return data.error ?? "요청을 처리하지 못했어요. 다시 시도해주세요.";
  } catch {
    return "요청을 처리하지 못했어요. 다시 시도해주세요.";
  }
}

/**
 * Settings "그룹": every group my children are in. Groups I created (👑)
 * can be renamed or deleted; others can be left. New groups are made here
 * too — the dashboard only shows groups.
 */
export default function MyGroups({ groups, myChildren }: MyGroupsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newChildIds, setNewChildIds] = useState<string[]>(
    myChildren.length > 0 ? [myChildren[0].id] : []
  );

  const closeDialog = useCallback(() => setPending(null), []);
  const childName = (id: string) =>
    myChildren.find((child) => child.id === id)?.name ?? "";

  async function run(action: () => Promise<string | null>) {
    setBusy(true);
    setError(null);
    const failure = await action();
    setBusy(false);
    if (failure) {
      setError(failure);
      return false;
    }
    router.refresh();
    return true;
  }

  async function confirmPending() {
    if (!pending) return;
    const { kind, group } = pending;
    setPending(null);
    if (kind === "delete") {
      await run(() => postJson("/api/groups/delete", { groupId: group.id }));
    } else {
      await run(async () => {
        for (const childId of group.myChildIds) {
          const failure = await postJson("/api/groups/leave", {
            groupId: group.id,
            childId,
          });
          if (failure) return failure;
        }
        return null;
      });
    }
  }

  async function saveRename(event: FormEvent, group: SettingsGroup) {
    event.preventDefault();
    const name = editName.trim();
    if (!name || busy) return;
    if (name === group.name) {
      setEditingId(null);
      return;
    }
    const ok = await run(() =>
      postJson("/api/groups/rename", { groupId: group.id, name })
    );
    if (ok) setEditingId(null);
  }

  async function createGroup(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name || busy) return;
    if (newChildIds.length === 0) {
      setError("그룹에 넣을 아이를 골라주세요");
      return;
    }
    const ok = await run(() =>
      postJson("/api/groups/create", { name, childIds: newChildIds })
    );
    if (ok) {
      setCreating(false);
      setNewName("");
    }
  }

  function toggleNewChild(id: string) {
    setNewChildIds((current) =>
      current.includes(id)
        ? current.filter((other) => other !== id)
        : [...current, id]
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.length === 0 && (
        <p className="rounded-2xl border-4 border-dashed border-gray-300 bg-white/60 p-4 text-center text-sm font-bold text-gray-600">
          아직 그룹이 없어요 — 만들거나 초대받아보세요 🎈
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {groups.map((group) => (
          <li key={group.id} className={cardClass}>
            {editingId === group.id ? (
              <form
                onSubmit={(event) => saveRename(event, group)}
                className="flex flex-col gap-2"
              >
                <input
                  type="text"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  required
                  autoFocus
                  maxLength={40}
                  aria-label="새 그룹 이름"
                  className="w-full rounded-2xl border-2 border-gray-800 bg-yellow-50 px-3 py-2 outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="flex-1 rounded-2xl border-4 border-gray-800 bg-gray-100 py-1.5 font-jua text-gray-600 transition-transform hover:scale-105 active:scale-95"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={busy || !editName.trim()}
                    className="flex-1 rounded-2xl border-4 border-gray-800 bg-pink-300 py-1.5 font-jua text-pink-900 transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
                  >
                    저장
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-200 shadow-md shadow-green-200">
                    <Users size={18} strokeWidth={2.5} className="text-green-900" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-1 truncate font-jua text-lg text-blue-900">
                      {group.isOwner && (
                        <Crown
                          size={16}
                          strokeWidth={2.5}
                          className="shrink-0 text-yellow-600"
                          aria-label="내가 만든 그룹"
                        />
                      )}
                      <span className="truncate">{group.name}</span>
                    </span>
                    <span className="text-xs font-bold text-gray-500">
                      아이 {group.childCount}명 ·{" "}
                      {group.myChildIds.map(childName).join(", ")}
                    </span>
                  </span>
                </div>

                <div className="flex justify-end gap-2">
                  {group.isOwner ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setEditingId(group.id);
                          setEditName(group.name);
                          setError(null);
                        }}
                        className={`${smallButton} border-gray-300 bg-white text-blue-900`}
                      >
                        <Pencil size={12} strokeWidth={3} aria-hidden />
                        이름 바꾸기
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setPending({ kind: "delete", group })}
                        className={`${smallButton} border-red-200 bg-red-50 text-red-700`}
                      >
                        <Trash2 size={12} strokeWidth={3} aria-hidden />
                        삭제
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setPending({ kind: "leave", group })}
                      className={`${smallButton} border-gray-300 bg-white text-gray-600`}
                    >
                      <LogOut size={12} strokeWidth={3} aria-hidden />
                      나가기
                    </button>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {creating ? (
        <form onSubmit={createGroup} className={cardClass}>
          <label htmlFor="new-group-name" className="font-jua text-pink-700">
            새 그룹 이름
          </label>
          <input
            id="new-group-name"
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="예: 햇살 놀이터 친구들"
            required
            autoFocus
            maxLength={40}
            className="w-full rounded-2xl border-2 border-gray-800 bg-yellow-50 px-3 py-2 outline-none"
          />
          {myChildren.length > 1 && (
            <fieldset className="flex flex-wrap gap-2">
              <legend className="mb-1 text-xs font-bold text-gray-500">
                함께 넣을 아이
              </legend>
              {myChildren.map((child) => (
                <label
                  key={child.id}
                  className="flex items-center gap-1.5 rounded-full border-2 border-gray-300 bg-white px-3 py-1 font-jua text-sm text-blue-900"
                >
                  <input
                    type="checkbox"
                    checked={newChildIds.includes(child.id)}
                    onChange={() => toggleNewChild(child.id)}
                    className="h-4 w-4 accent-pink-500"
                  />
                  {child.name}
                </label>
              ))}
            </fieldset>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setError(null);
              }}
              className="flex-1 rounded-2xl border-4 border-gray-800 bg-gray-100 py-2 font-jua text-gray-600 transition-transform hover:scale-105 active:scale-95"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={busy || !newName.trim()}
              className="flex-1 rounded-2xl border-4 border-gray-800 bg-pink-300 py-2 font-jua text-pink-900 transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
            >
              {busy ? "만드는 중…" : "만들기 ✨"}
            </button>
          </div>
        </form>
      ) : (
        myChildren.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setError(null);
            }}
            className="flex items-center justify-center gap-2 rounded-2xl border-4 border-dashed border-gray-400 bg-white/60 px-4 py-3 font-jua text-lg text-purple-900 transition-transform hover:scale-105 active:scale-95"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-200 shadow-md shadow-purple-200">
              <Plus size={18} strokeWidth={3} className="text-purple-900" />
            </span>
            그룹 만들기
          </button>
        )
      )}

      {error && (
        <p role="alert" className="text-xs font-bold text-red-600">
          {error}
        </p>
      )}

      {pending && (
        <ConfirmDialog
          message={
            pending.kind === "delete"
              ? `${pending.group.name} 그룹을 삭제할까요? 모든 친구에게서 사라져요`
              : `${pending.group.name}에서 나갈까요?`
          }
          confirmLabel={pending.kind === "delete" ? "삭제" : "나가기"}
          onConfirm={confirmPending}
          onCancel={closeDialog}
        />
      )}
    </div>
  );
}
