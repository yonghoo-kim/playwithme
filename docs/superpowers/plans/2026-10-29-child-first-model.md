# Child-First Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the child the top-level entity: children are registered at signup, belong to any number of groups, have one status shared with all their groups, and the app navigates child → that child's groups → a group's friends. Co-guardians join only through single-use guardian invite links.

**Architecture:** New `child_groups` (M:N). `current_statuses` is per child (no group). `places` belong to the family (`created_by`). Visibility = "groups any child I guard is in" (`my_group_ids()`, `my_visible_child_ids()` SQL helpers). Push for a child's status goes to every guardian of every child that shares any group with it (deduped, acting device excluded). Rollout: additive migration 0007 → deploy new code → cleanup migration 0008.

**Spec:** this conversation's approved design (user confirmed: child is 1-depth, groups 2-depth; status shared across all the child's groups and notifies everyone connected; family-owned places; guardian links issued only by an existing guardian, single-use, 7-day expiry).

## Global Constraints

- Buttons: `transition-transform hover:scale-105 active:scale-95` only — no translate/rotate. Soft shadow `shadow-[4px_4px_0px_rgba(31,41,55,0.25)]`. Lucide icons strokeWidth 2.5–3 in pastel round wrappers. Jua font. Literal button copy (e.g. "가입하기").
- Never let a user act on a child they don't guard (status, group joins, guardian links). Never list other families' children with join/connect controls.
- Push copy via `formatPushPayload(childName, placeName | null)` (title "나랑 놀자"); `sendGroupPush(..., { tag: 'child-' + childId })` data-only.
- Deploy = `git push origin main` only (Vercel Git integration). Never `vercel --prod`.
- DB is already migrated by 0007 (additive): `children.group_id`, `current_statuses.group_id`, `places.group_id`, `group_members` still EXIST but new code must not read or write them (0008 drops them).

## Review Focus

- A user who just signed up via an invite link has children (from signup) but no groups — the invite confirm screen must let them pick which child joins.
- Guardian links: reject expired/used codes; one link → one acceptance; acceptor must not already be a guardian (idempotent no-op if so).
- Realtime on a group page must subscribe to `current_statuses` filtered by the child ids in that group (`child_id=in.(…)`), with the user's token set (`supabase.realtime.setAuth`) before subscribing.
- Push recipients must be deduped across groups (one device gets one notification even if it shares 3 groups with the child).
- Group name uniqueness stays per-creator (409 message "이미 같은 이름의 그룹이 있어요").

---

### Task 1 (coordinator): Migration 0007 + types — DONE before dispatch
`supabase/migrations/0007_child_first_model.sql`, `src/types/db.ts` (`Child` has no group_id, `CurrentStatus` has no group_id, `Place.created_by`, new `ChildGroup`).

### Task 2: Server core
**Files:** `src/lib/groups.ts`, `src/app/api/groups/create/route.ts`, `src/app/api/children/create/route.ts`, delete `src/app/api/children/join/route.ts`, `src/app/api/status/update/route.ts`, `src/app/api/places/create/route.ts`, `src/lib/inviteContext.ts`, new `src/lib/childAccess.ts`.
- `createGroupForUser(supabase, userId, name, childIds: string[]): Promise<Group>` — insert group (`created_by`), then `child_groups` rows for each childId (caller must guard each — verify in the route). No `group_members` writes.
- `POST /api/groups/create` `{ name, childIds: string[] }` (≥1, all guarded by caller) → `{ group }`; 409 on duplicate name.
- `POST /api/children/create` `{ name }` → creates child + guardian row for caller, sets `users.active_child_id` → `{ child }`. No group.
- `POST /api/status/update` `{ childId, placeId, deviceToken? }` — guardian check; upsert `current_statuses { child_id, place_id, updated_at }` (no group_id); recipients = all `child_guardians.user_id` of children in any group the child is in (via `child_groups`), plus the child's own other guardians; distinct users → their `fcm_tokens` → `excludeToken` → `sendGroupPush` (tag `child-<id>`). Notify on every change incl. going home.
- `POST /api/places/create` `{ name, iconName }` → place with `created_by` = caller.
- `src/lib/childAccess.ts`: `getGuardedChildIds(supabase, userId): Promise<string[]>`, `assertGuardian(supabase, userId, childId): Promise<boolean>`, `familyPlaces(supabase, childId): Promise<Place[]>` (places created by any guardian of that child).
- `getInviteContext` inviter check via `child_groups` instead of `children.group_id`.
- Verify: vitest, tsc (errors only in Task 3–7 files are expected), lint.

### Task 3: Signup registers children
**Files:** `src/app/signup/SignupForm.tsx` (+ `page.tsx` if needed).
- Required "아이 이름" field (at least one), "+ 아이 더 추가" to add more (each removable). Pass `options.data.child_names: string[]` to `signUp` — the DB trigger creates the children. Keep invite banner/params, already-registered detection, `가입하기 ✨`.

### Task 4: Invite confirm picks which child joins
**Files:** `src/app/invite/[code]/page.tsx`, `src/app/invite/[code]/confirm-actions.ts`.
- Logged-in: list the user's children (`getGuardedChildIds` + names) with checkboxes; children already in that group shown as "이미 참여 중". "참여하기" → server action inserts `child_groups` for checked children the caller guards (verify server-side), sets `active_child_id` to the first, redirects `/groups/<groupId>`. If the user has zero children → inline "아이 이름" form that creates a child then joins it. "거부하기" → no writes, redirect `/`.

### Task 5: Guardian invite links
**Files:** new `src/app/api/children/guardian-invites/route.ts`, new `src/app/guardian-invite/[code]/page.tsx` (+ actions), `src/app/login/LoginForm.tsx`, `src/app/login/page.tsx`.
- `POST /api/children/guardian-invites` `{ childId }` — caller must guard it → insert `child_guardian_invites` (code: 16-char alphanumeric via nanoid `customAlphabet`) → `{ url }` (absolute, from request origin).
- `/guardian-invite/[code]`: invalid/expired/used → friendly card. Logged out → `/login?next=/guardian-invite/<code>`. Logged in → "○○네가 ○○의 보호자로 초대했어요. 수락할까요?" (inviter label via `hasBatchim`). Accept (server action): re-validate, insert `child_guardians` (ignore 23505), mark `used_at/used_by` (only if still unused — `.is('used_at', null)` in the update), set active child, redirect `/dashboard`. Decline: no writes.
- Login: support `?next=` (same-origin relative paths only — reject anything not starting with `/` or starting with `//`) taking precedence after login; keep invite banner behavior.

### Task 6: Settings
**Files:** `src/app/settings/*`, `src/components/GroupListWithInvites.tsx`, `src/components/NotificationSettingsToggle.tsx`.
- Sections: **내 아이들** (each child: name, its groups as chips, "보호자 초대 링크" button → POST guardian-invites → copyable link + "한 번만 쓸 수 있고 7일 뒤 만료돼요"), **아이 추가** (POST /api/children/create), **알림**. Remove every "보호자로 연결하기" control and the old per-group child manager. Group creation lives on the dashboard (Task 7).

### Task 7: Dashboard + group page
**Files:** `src/app/dashboard/*`, new `src/app/groups/[groupId]/page.tsx` (+ loading.tsx), `src/components/ChildSwitcher.tsx`, `src/components/RealtimeStatusList.tsx`, `src/components/PlaceSelector.tsx`, `src/components/AddPlaceButton.tsx`, `src/components/StatusCard.tsx`, `src/app/dashboard/InviteCopyButton.tsx`.
- `/dashboard`: child pills only (no "+"). Selected child: its status card + PlaceSelector (family places) + "○○의 그룹" list (cards → `/groups/<id>`), and "+ 그룹 만들기" (name → POST /api/groups/create with `childIds: [activeChild]` → go to the new group page). No children → `/settings`.
- `/groups/[groupId]`: access check (one of my children is in it, else redirect `/dashboard`); header with back link, group name, invite copy button (`buildInviteUrl(code, myChildInGroup)`); "친구들" = every child in the group except mine, read-only, live via realtime (`child_id=in.(…)`, setAuth first); my child(ren) in the group shown first as a compact read-only line.

### Task 8 (coordinator): Migration 0008 cleanup + E2E
Drop `children.group_id`, `current_statuses.group_id`, `places.group_id`, `group_members` (after confirming no code references), redefine `my_group_ids()` without group_members. Live checks: signup with 2 children; create group for child A; invite → other account picks child; status change notifies all groups' families once; guardian link single-use.
