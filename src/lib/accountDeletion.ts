// Pure pieces of "회원탈퇴" (POST /api/account/delete). No I/O.

/** The 회원탈퇴 confirmation text (ConfirmDialog message). */
export const DELETE_ACCOUNT_MESSAGE =
  "정말 탈퇴할까요? 계정과 내가 보낸 채팅, 나만 보호하는 아이 정보가 모두 지워지고 되돌릴 수 없어요";

export const DELETE_ACCOUNT_FAILED =
  "탈퇴하지 못했어요. 잠시 후 다시 시도해주세요.";

/**
 * Who should own a group once its creator leaves: the other guardians of
 * the group's children, guardians of the earliest-joined child first, each
 * listed once. `memberChildIds` are the group's children in join order.
 * Empty when nobody else is left (the group is then deleted).
 *
 * `groups.created_by` references public.users without ON DELETE, so the
 * creator's account can't be deleted while it still points at them.
 */
export function groupOwnerCandidates(
  leavingUserId: string,
  memberChildIds: string[],
  guardianRows: { child_id: string; user_id: string }[]
): string[] {
  const candidates: string[] = [];
  for (const childId of memberChildIds) {
    for (const row of guardianRows) {
      if (
        row.child_id === childId &&
        row.user_id !== leavingUserId &&
        !candidates.includes(row.user_id)
      ) {
        candidates.push(row.user_id);
      }
    }
  }
  return candidates;
}

/**
 * Browser storage keys this app writes (all prefixed "playwithme_"), cleared
 * on this phone after the account is deleted.
 */
export function isAppStorageKey(key: string): boolean {
  return key.startsWith("playwithme_");
}
