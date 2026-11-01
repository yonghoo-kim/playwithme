import { withObjectParticle } from "./korean";

// Pure decisions behind "아이 지우기" (POST /api/children/delete). No I/O, so
// the route stays thin and this stays importable from client components.

/**
 * What removing my guardianship leaves behind. With other guardians still
 * on the child it stays for them ("keep_child"); once nobody guards it the
 * child row itself goes ("delete_child" — FK cascades take its status, group
 * memberships, invites and 1:1 chats).
 */
export type ChildRemoval = "keep_child" | "delete_child";

export function decideChildRemoval(
  remainingGuardianIds: string[]
): ChildRemoval {
  return remainingGuardianIds.length > 0 ? "keep_child" : "delete_child";
}

/** True when anyone besides `myUserId` guards the child. */
export function hasOtherGuardians(
  guardianUserIds: string[],
  myUserId: string
): boolean {
  return guardianUserIds.some((id) => id !== myUserId);
}

/**
 * The active child a user should have once `removedChildId` is gone from
 * their children. `remainingChildIds` are the children they still guard, in
 * the order the dashboard lists them (oldest first). An active child that
 * is still theirs is kept; otherwise the first remaining child, or null.
 */
export function nextActiveChildId(
  currentActiveId: string | null,
  removedChildId: string,
  remainingChildIds: string[]
): string | null {
  const remaining = remainingChildIds.filter((id) => id !== removedChildId);
  if (currentActiveId && remaining.includes(currentActiveId)) {
    return currentActiveId;
  }
  return remaining[0] ?? null;
}

/**
 * Groups `childId` is the only member of — they'd be left empty once the
 * child is deleted, so they're removed too (same as the last child leaving a
 * group). `childGroupRows` must cover every member of the child's groups.
 */
export function groupsEmptiedBy(
  childId: string,
  childGroupRows: { child_id: string; group_id: string }[]
): string[] {
  const ownGroups = new Set(
    childGroupRows
      .filter((row) => row.child_id === childId)
      .map((row) => row.group_id)
  );
  for (const row of childGroupRows) {
    if (row.child_id !== childId) ownGroups.delete(row.group_id);
  }
  return Array.from(ownGroups);
}

/** The "아이 지우기" confirmation text. */
export function deleteChildMessage(
  name: string,
  otherGuardians: boolean
): string {
  return otherGuardians
    ? `${withObjectParticle(name)} 내 목록에서 지울까요? 다른 보호자에게는 그대로 남아요`
    : `${withObjectParticle(name)} 지울까요? 상태와 그룹 기록이 모두 사라져요`;
}
