# Multi-Group, Realtime & Settings UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a guardian belong to and switch between multiple groups (daycare class, apartment complex, friend group, etc.), see status updates live without reloading, manage children/notifications/invite-links from a dedicated Settings page, and clean up several UX rough edges (invite-join confirmation, notification re-prompt bug, a "friends are read-only" split, visual polish).

**Architecture:** Navigation pivots on **active child**, not group: a top-of-dashboard switcher lists every child the signed-in user guards (across all their groups); picking one sets `users.active_child_id` and the dashboard shows that child's group — "내 아이" (children the user guards there, with controls) and "친구들" (everyone else in that group, read-only). Group management (list + invite links), child add/join, and notification permission move to a new `/settings` page. Status updates stream live via a Supabase Realtime subscription on `current_statuses`, scoped to the active group.

**Tech Stack:** Same as the shipped app — Next.js 14 (App Router, TypeScript), Supabase (Auth + Postgres + **Realtime**, newly used), Firebase (FCM), Vitest.

**Spec:** [playwithmd.md](../../../playwithmd.md) + the two prior plans this extends + this conversation's approved design (child-first navigation, settings page, realtime).

## Global Constraints

- Carries forward all prior Global Constraints (Lucide stroke/color/wrapper rules, Jua font, hybrid lucide+emoji rule, exact push copy).
- **Soften the comic-shadow**: every `shadow-[4px_4px_0px_rgba(31,41,55,1)]` in the codebase becomes `shadow-[4px_4px_0px_rgba(31,41,55,0.25)]` (same offset, 25% opacity instead of 100%) — the harsh pure-black shadow goes everywhere this exact class string appears.
- A guardian can only change status for a child in their own `child_guardians` rows — never for another family's child; the UI must never render status-change controls for a child the signed-in user doesn't guard (this was already true in the API, but the dashboard must now visibly separate "내 아이" from "친구들" so it's true in the UI too).
- Group name uniqueness is **per-creator**, not global: `unique(created_by, name)` on `groups` — two different users may each have a group named "놀이터 모임"; the same user may not create two.
- Playground-type places get a cute 🛝 (slide) emoji visual instead of a Lucide icon, as an explicit exception to the "places are always Lucide" rule from the base MVP plan.

## Review Focus

- A user who is a `group_members` row but guards **no child** in that group (e.g. just accepted an invite) must land somewhere that lets them add/join a child for that specific group — not a dead end and not silently dropped into another group's view. (Task 2, Task 7)
- Declining an invite (Task 7's confirm screen) must not insert a `group_members` row — a user can revisit the same invite link later and still be asked, not silently treated as already declined forever. (Task 7)
- The realtime subscription must be scoped to the **active group only** (filter by `group_id`), and must be torn down when the active child/group changes or the component unmounts — a stale subscription from a previously-viewed group must never keep pushing updates into the current view. (Task 6)
- The notification-enable prompt must never reappear once permission is already granted and a token is stored — this was a live bug (reappearing on every reload) and the fix must check real browser permission state, not just local component state that resets on reload. (Task 4, Task 5)
- Two different guardians each creating a group with the same name must both succeed (uniqueness is per-creator) — the unique constraint and the API's duplicate-key handling must not collide across users.

---

## File Structure

```
supabase/migrations/0004_groups_owner_realtime_active_child.sql   (new)
src/types/db.ts                                                    (modify: Group.created_by, User.active_child_id)
src/lib/groups.ts                                                  (modify: createGroupForUser takes createdBy, surfaces 23505)
src/app/api/groups/create/route.ts                                 (modify: pass created_by, friendly duplicate-name error)
src/app/api/children/create/route.ts                               (modify: also sets users.active_child_id)
src/app/api/children/join/route.ts                                 (modify: also sets users.active_child_id)
src/app/api/users/active-child/route.ts                            (new)
src/app/settings/page.tsx                                          (new)
src/components/GroupListWithInvites.tsx                            (new)
src/components/NotificationSettingsToggle.tsx                      (new)
src/components/ChildSwitcher.tsx                                   (new)
src/components/RealtimeStatusList.tsx                              (new)
src/app/dashboard/page.tsx                                         (rewrite)
src/app/dashboard/loading.tsx, src/app/settings/loading.tsx,
  src/app/login/loading.tsx, src/app/signup/loading.tsx            (new)
src/app/invite/[code]/page.tsx                                     (rewrite)
src/components/NotificationBanner.tsx                              (delete — superseded by Settings + the dashboard nudge)
src/components/NoChildState.tsx                                    (delete — superseded by Settings' child management)
src/components/InviteLinkCard.tsx                                  (delete — superseded by GroupListWithInvites)
src/lib/icons.ts                                                   (modify: add Playground -> emoji visual)
src/components/PlaceButton.tsx, src/components/AddPlaceButton.tsx,
  src/components/StatusCard.tsx                                    (modify: render emoji visual when applicable)
(global) all files containing the hard-shadow class                (modify: soften opacity)
```

---

### Task 1: Schema — Group Ownership, Realtime, Active Child

**Files:**
- Create: `supabase/migrations/0004_groups_owner_realtime_active_child.sql`
- Modify: `src/types/db.ts`

**Interfaces:**
- Produces: `Group.created_by: string`; `User.active_child_id: string | null`.

- [ ] **Step 1: Write the migration**

```sql
alter table public.groups add column created_by uuid references public.users(id);
-- Backfill existing rows (dev data) to their earliest group_members user so the column can be made required-ish going forward; new rows always set it explicitly.
update public.groups g set created_by = (
  select gm.user_id from public.group_members gm
  where gm.group_id = g.id order by gm.joined_at asc limit 1
) where created_by is null;

create unique index groups_created_by_name_key on public.groups (created_by, name);

alter table public.users add column active_child_id uuid references public.children(id) on delete set null;

-- Enable Supabase Realtime on current_statuses (Task 6 subscribes to this).
alter publication supabase_realtime add table public.current_statuses;
```

- [ ] **Step 2: Run the migration against the live Supabase project.**

- [ ] **Step 3: Update `src/types/db.ts`**: add `created_by: string` to `Group`; add `active_child_id: string | null` to `User`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0004_groups_owner_realtime_active_child.sql src/types/db.ts
git commit -m "feat: add group ownership/uniqueness, active_child_id, enable realtime on current_statuses"
```

---

### Task 2: Group Creation + First-Child Flow

**Files:**
- Modify: `src/lib/groups.ts`
- Modify: `src/app/api/groups/create/route.ts`
- Modify: `src/app/api/children/create/route.ts`
- Modify: `src/app/api/children/join/route.ts`

**Interfaces:**
- Consumes: `createServiceClient()`.
- Produces: `createGroupForUser(supabase, userId, name): Promise<Group>` now inserts `created_by: userId` and throws an `Error` whose `.message` is exactly `"이미 같은 이름의 그룹이 있어요"` when the insert fails with Postgres code `23505` (unique violation) — callers pattern-match that message or re-throw as-is; `POST /api/groups/create` returns `{ error: "이미 같은 이름의 그룹이 있어요" }` with status 409 on that case. `POST /api/children/create` and `POST /api/children/join` both additionally `update users set active_child_id = <childId> where id = <callerId>` after successfully creating/joining, so the newly added/joined child becomes the active one immediately (this is what makes "그룹 추가 → 전환" and "아이 추가 → 전환" work without extra client logic).

- [ ] **Step 1: Update `createGroupForUser` in `src/lib/groups.ts`**

Insert `{ name, invite_code: inviteCode, created_by: userId }`. On insert error, if `groupError.code === '23505'`, throw `new Error('이미 같은 이름의 그룹이 있어요')`; otherwise throw the original message as before.

- [ ] **Step 2: Update `POST /api/groups/create`** to return 409 with that exact message when `createGroupForUser` throws it (string-match the message), 500 otherwise.

- [ ] **Step 3: Update `POST /api/children/create` and `POST /api/children/join`**

After the existing `child_guardians` insert succeeds, add one more write: `await supabase.from('users').update({ active_child_id: childId }).eq('id', user.id)`. Non-fatal if it fails (log, don't fail the response) — it's a UX nicety, not the operation's correctness.

- [ ] **Step 4: Verify with `npx tsc --noEmit`.**

- [ ] **Step 5: Commit**

```bash
git add src/lib/groups.ts src/app/api/groups/create src/app/api/children/create src/app/api/children/join
git commit -m "feat: per-creator unique group names, auto-activate newly added/joined child"
```

---

### Task 3: Active-Child Switcher API

**Files:**
- Create: `src/app/api/users/active-child/route.ts`

**Interfaces:**
- Produces: `POST /api/users/active-child` body `{ childId: string }` → verifies a `child_guardians` row exists for `(childId, caller)` (403 "이 아이의 보호자만 전환할 수 있어요" if not), sets `users.active_child_id`, returns `{ ok: true }`.

- [ ] **Step 1: Implement the route** following the same auth/guardian-check pattern as `src/app/api/status/update/route.ts`.

- [ ] **Step 2: Verify with `npx tsc --noEmit`.**

- [ ] **Step 3: Commit**

```bash
git add src/app/api/users/active-child
git commit -m "feat: add active-child switch API"
```

---

### Task 4: Settings Page

**Files:**
- Create: `src/app/settings/page.tsx`
- Create: `src/components/GroupListWithInvites.tsx`
- Create: `src/components/NotificationSettingsToggle.tsx`
- Create: `src/app/settings/loading.tsx`
- Delete: `src/components/NotificationBanner.tsx`, `src/components/NoChildState.tsx`, `src/components/InviteLinkCard.tsx` (superseded; grep the codebase for remaining imports of each before deleting and update every caller in this same task)

**Interfaces:**
- Consumes: `createAuthClient()`, `createServiceClient()`, `getStoredFcmToken()`/`storeFcmToken()`/`requestNotificationPermissionAndToken()` (`src/lib/firebase/client.ts`), `POST /api/groups/create`, `POST /api/children/create`, `POST /api/children/join` (existing/Task 2).
- Produces: `<GroupListWithInvites groups={{id,name,inviteUrl}[]} />`; `<NotificationSettingsToggle />` (self-contained: checks `Notification.permission` + `getStoredFcmToken()` on mount, shows "켜짐 ✅" when already granted-and-registered instead of a button, never re-prompts once granted — this is the fix for the reappearing-banner bug).

- [ ] **Step 1: Write `src/app/settings/page.tsx`** (server component)

Auth-gate (redirect `/login` if no user, matching `dashboard/page.tsx`'s pattern). Fetch every `group_members` row for the user, join `groups` (id, name, invite_code), build each group's invite URL the same way `dashboard/page.tsx` currently does (reuse/move the `buildInviteUrl` helper into a shared lib — e.g. `src/lib/inviteUrl.ts` exporting `buildInviteUrl(inviteCode: string): string`, imported by both `settings/page.tsx` and `dashboard/page.tsx`). Also fetch all `children` the user guards (via `child_guardians` → `children`), for a "내 아이들" list. Render: `<GroupListWithInvites>`, a "새 그룹 만들기" form (name input → `POST /api/groups/create`; on success, immediately show an inline "첫 아이 이름" prompt for that new group → `POST /api/children/create`; both as one guided flow on this page, not a redirect-heavy multi-page wizard), a list of the user's children with a per-group "아이 추가/연결" affordance (reuse the old `NoChildState`'s create/join form markup, now scoped here per group rather than gating the whole dashboard), and `<NotificationSettingsToggle />`.

- [ ] **Step 2: Write `src/components/GroupListWithInvites.tsx`**

Client component, one row per group: name + a copy-link button per group (same copy-to-clipboard pattern as the old `InviteLinkCard`).

- [ ] **Step 3: Write `src/components/NotificationSettingsToggle.tsx`**

On mount (`useEffect`), compute enabled state as `typeof Notification !== 'undefined' && Notification.permission === 'granted' && !!getStoredFcmToken()`. If enabled, render a static "알림 켜짐 ✅" pill, no button. If not, render the existing "켜기" button flow (moved verbatim from the old `NotificationBanner`: call `requestNotificationPermissionAndToken()`, `POST /api/fcm/register` + `storeFcmToken()` on success, degrade message on `null`).

- [ ] **Step 4: Delete the three superseded components and fix every import site**

Grep for `NotificationBanner`, `NoChildState`, `InviteLinkCard` across `src/` and remove/replace each usage (Task 5 rewrites `dashboard/page.tsx` anyway, but do this grep now so Task 4 itself doesn't leave the build broken if run standalone).

- [ ] **Step 5: Verify with `npx tsc --noEmit`.**

- [ ] **Step 6: Commit**

```bash
git add src/app/settings src/components/GroupListWithInvites.tsx src/components/NotificationSettingsToggle.tsx src/lib/inviteUrl.ts
git rm src/components/NotificationBanner.tsx src/components/NoChildState.tsx src/components/InviteLinkCard.tsx
git commit -m "feat: add settings page for groups/invites/children/notifications"
```

---

### Task 5: Dashboard Rewrite — Child Switcher, My-Child/Friends Split

**Files:**
- Create: `src/components/ChildSwitcher.tsx`
- Rewrite: `src/app/dashboard/page.tsx`
- Create: `src/app/dashboard/loading.tsx`

**Interfaces:**
- Consumes: `buildInviteUrl` (`src/lib/inviteUrl.ts`, Task 4), `User.active_child_id` (Task 1), `POST /api/users/active-child` (Task 3), `RealtimeStatusList` (Task 6 — if Task 6 isn't done yet when this task runs, render the plain non-realtime list first and let Task 6 swap it in; don't block this task on Task 6).
- Produces: `<ChildSwitcher myChildren={{id,name,groupId}[]} activeChildId={string} />` — a pill/dropdown row; selecting a child `POST`s to `/api/users/active-child` then `router.refresh()`.

- [ ] **Step 1: Write `src/components/ChildSwitcher.tsx`**

Client component rendering one bouncy pill per child the user guards (across *all* their groups, not just the active one), highlighting the active one, plus a "+" pill linking to `/settings` to add another. Clicking a non-active pill posts to the switch API and refreshes.

- [ ] **Step 2: Rewrite `src/app/dashboard/page.tsx`**

Auth-gate as before. If the user has no `group_members` row at all, redirect to `/settings` (there's no group to show — settings is now where you create/join one; this replaces the old `EmptyGroupState`). Otherwise: fetch all children the user guards (`child_guardians` → `children`, across groups) for the `ChildSwitcher`. Resolve the active child: `users.active_child_id` if it's still one the user guards, else fall back to the first one (and persist that fallback via the Task 3 API so it sticks). From the active child, get `groupId`. Fetch that group's `children`, `places`, `current_statuses` the same way the current implementation does. Split into **내 아이** (children in `myChildIds` for *this* group) rendered with `StatusCard` + `PlaceSelector`, and **친구들** (everyone else in the group) rendered with `StatusCard` only, under a clearly separate heading — no `PlaceSelector` ever renders for a friends-section child (Review Focus item). If notifications aren't enabled (same check as `NotificationSettingsToggle`, done server-side is not possible since `Notification` is a browser API — do this check client-side in a small wrapper component that conditionally renders a bouncy-arrow "🔔 알림 켜러 가기" link to `/settings`, using the same enabled-state logic).

- [ ] **Step 3: Verify with `npx tsc --noEmit`.**

- [ ] **Step 4: Commit**

```bash
git add src/components/ChildSwitcher.tsx src/app/dashboard/page.tsx src/app/dashboard/loading.tsx
git commit -m "feat: rewrite dashboard around child switcher with my-child/friends split"
```

---

### Task 6: Realtime Status Updates

**Files:**
- Create: `src/components/RealtimeStatusList.tsx`

**Interfaces:**
- Consumes: `createBrowserClient()` (`src/lib/supabase/client.ts`).
- Produces: `<RealtimeStatusList groupId={string} initialChildren={ChildStatusView[]} myChildIds={string[]} groupPlaces={Place[]} />` — a client component that owns the "내 아이"/"친구들" rendering (moved out of `dashboard/page.tsx`'s server-rendered JSX into this client component so it can hold live state), initialized from server-fetched props, subscribed to a Supabase Realtime channel on `current_statuses` filtered to `groupId`, merging `UPDATE`/`INSERT` payloads into local state (look up the changed `place_id`'s name/icon from `groupPlaces`, already available as a prop — no extra fetch needed) so the relevant `StatusCard` re-renders without a page reload.

- [ ] **Step 1: Implement the channel subscription**

`const channel = supabase.channel('status-' + groupId).on('postgres_changes', { event: '*', schema: 'public', table: 'current_statuses', filter: 'group_id=eq.' + groupId }, handleChange).subscribe()` inside a `useEffect` keyed on `groupId`; return a cleanup that calls `supabase.removeChannel(channel)` — this is the Review Focus item (no stale subscription when the active group changes or the component unmounts).

- [ ] **Step 2: Wire `dashboard/page.tsx` (Task 5) to render this instead of inline JSX** for the status sections, passing the server-fetched data as initial props.

- [ ] **Step 3: Verify with `npx tsc --noEmit`.**

- [ ] **Step 4: Manual verification**

Open two browser sessions on the same group's dashboard; change status in one, confirm the other updates without a reload.

- [ ] **Step 5: Commit**

```bash
git add src/components/RealtimeStatusList.tsx src/app/dashboard/page.tsx
git commit -m "feat: live-update status cards via Supabase Realtime, no reload needed"
```

---

### Task 7: Invite Confirm/Decline Screen

**Files:**
- Rewrite: `src/app/invite/[code]/page.tsx`
- Create: `src/app/invite/[code]/confirm-actions.ts` (or inline Server Actions in the page — implementer's call) exposing `confirmJoin(groupId: string)` and `declineJoin()` Server Actions

**Interfaces:**
- Consumes: `createAuthClient()`, `createServiceClient()`.

- [ ] **Step 1: Rewrite the authenticated-and-code-valid branch**

Instead of inserting into `group_members` immediately, check whether the user is *already* a member; if so, redirect straight to `/dashboard` as today. If not yet a member, render a confirm screen: "**{group.name}** 그룹에 참여할까요? 🎈" with "참여하기" (Server Action: insert `group_members`, then redirect to `/settings` — there's no child there yet, so Settings, not `/dashboard`, matching the Review Focus item) and "거부하기" (Server Action: no DB write at all, redirect to `/`) buttons.

- [ ] **Step 2: Verify with `npx tsc --noEmit`.**

- [ ] **Step 3: Manual verification**

Revisit the same invite link after declining — confirm the screen appears again rather than erroring or auto-joining.

- [ ] **Step 4: Commit**

```bash
git add src/app/invite
git commit -m "feat: add explicit confirm/decline screen to the invite-join flow"
```

---

### Task 8: Visual Polish — Shadows, Transitions, Loading States

**Files:**
- Modify: every file containing `shadow-[4px_4px_0px_rgba(31,41,55,1)]` (grep across `src/`)
- Create: `src/app/login/loading.tsx`, `src/app/signup/loading.tsx` (dashboard's and settings' are already covered by Tasks 5/4)
- Modify: `src/app/globals.css` (add a simple fade-in keyframe)
- Modify: `src/app/layout.tsx` (apply the fade-in class to `{children}`'s wrapper, or per-page via a shared small `PageTransition` client wrapper — implementer's call on the simplest approach that visibly softens route changes)

**Interfaces:** none beyond the global shadow find-replace.

- [ ] **Step 1: Grep and replace** every occurrence of `shadow-[4px_4px_0px_rgba(31,41,55,1)]` with `shadow-[4px_4px_0px_rgba(31,41,55,0.25)]`.

- [ ] **Step 2: Add a `fadeIn` keyframe to `globals.css`** (opacity 0→1, ~150ms) and apply it to route content so navigations don't feel like a hard cut.

- [ ] **Step 3: Add `loading.tsx` files** for `/login` and `/signup` — a small centered spinner matching the pastel palette (Next.js App Router shows these automatically during server-component data fetching/navigation; no manual wiring needed beyond the file existing).

- [ ] **Step 4: Verify with `npx tsc --noEmit` and a manual click-through** (does navigating between pages feel less abrupt?).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "style: soften comic shadows, add page-transition fade and loading states"
```

---

### Task 9: Playground Slide Emoji Icon

**Files:**
- Modify: `src/lib/icons.ts`
- Modify: `src/components/StatusCard.tsx`, `src/components/PlaceButton.tsx`, `src/components/AddPlaceButton.tsx`

**Interfaces:**
- Produces: `getPlaceVisual(iconName: string): { type: 'lucide'; Icon: LucideIcon } | { type: 'emoji'; emoji: string }` in `src/lib/icons.ts`, replacing direct `getPlaceIcon()` calls at render sites — `iconName === 'Playground'` returns `{ type: 'emoji', emoji: '🛝' }`; every other existing key keeps returning its Lucide icon via `{ type: 'lucide', Icon: getPlaceIcon(iconName) }`. Keep `getPlaceIcon` itself exported and unchanged (existing `icons.test.ts` keeps passing) — `getPlaceVisual` is additive.

- [ ] **Step 1: Write the failing test** for `getPlaceVisual` in `src/lib/icons.test.ts`: `'Playground'` → `{ type: 'emoji', emoji: '🛝' }`; `'Trees'` → `{ type: 'lucide', Icon: Trees }`.

- [ ] **Step 2: Run, verify it fails** — `npx vitest run src/lib/icons.test.ts`.

- [ ] **Step 3: Implement `getPlaceVisual`.**

- [ ] **Step 4: Run, verify it passes.**

- [ ] **Step 5: Update the 3 render sites** to branch on `visual.type` (render `<visual.Icon .../>` or a plain `<span>{visual.emoji}</span>` inside the same pastel wrapper). Add `"Playground"` to `AddPlaceButton`'s icon-choice list (alongside the existing `Trees`/`ShoppingCart`/etc. choices).

- [ ] **Step 6: Verify with `npx tsc --noEmit`.**

- [ ] **Step 7: Commit**

```bash
git add src/lib/icons.ts src/lib/icons.test.ts src/components/StatusCard.tsx src/components/PlaceButton.tsx src/components/AddPlaceButton.tsx
git commit -m "feat: add cute slide-emoji visual for playground places"
```

---

### Task 10: End-to-End Manual Verification

**Files:** none (verification only)

- [ ] **Step 1:** Create two groups under one account via Settings, confirm the second create with the same name as the first fails with the friendly duplicate message, and a *different* account can still use that same name.
- [ ] **Step 2:** Add two children to two different groups under one account; confirm the Child Switcher shows both and switching correctly changes which group's friends list renders.
- [ ] **Step 3:** With two guardians in one group (one child each), confirm each only sees place-selection controls under their own child's card, and the other's card appears only in "친구들" with no controls.
- [ ] **Step 4:** Two browser sessions, same group: change status in one, confirm the other's card updates live.
- [ ] **Step 5:** Visit an invite link as a logged-in non-member: confirm the confirm/decline screen appears; decline, then revisit the same link and confirm it asks again.
- [ ] **Step 6:** Enable notifications via Settings, reload the dashboard, confirm no re-prompt appears.
- [ ] **Step 7: Record results** as follow-ups rather than scope-creeping this plan.
