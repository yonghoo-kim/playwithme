# Child/Guardian Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate "아이" (child) from "계정" (guardian account) so two guardians (e.g. both parents) can share one child's status/push, and one guardian can watch multiple children, without the duplicate-member or one-child-per-login problems the shipped MVP has today.

**Architecture:** Add `children` and `child_guardians` (N:M) tables; re-key `current_statuses` on `child_id` instead of `user_id`; drop `users.child_name` (accounts become pure logins). The dashboard renders one status card per *child* in the group, and only renders place-selection controls under cards for children the signed-in user actually guards. Push notifications go to every device in the group except the specific device that made the request (identified by its own stored FCM token), so a child's other guardian still gets notified — this replaces the old "exclude the whole acting user_id" rule.

**Tech Stack:** Same as the base MVP — Next.js 14 (App Router, TypeScript), Supabase (Auth + Postgres), Firebase (client + Admin SDK), Vitest.

**Spec:** [playwithmd.md](../../../playwithmd.md) (original spec) + [2026-10-28-play-with-me-mvp.md](2026-10-28-play-with-me-mvp.md) (shipped MVP plan this one extends) + this conversation's approved design (children/child_guardians tables, group-wide-minus-one-device push).

## Global Constraints

- Carries forward every Global Constraint from the base MVP plan (Lucide stroke/color/wrapper rules, bouncy transitions, Jua font, hybrid lucide+emoji rule, exact push body text format via `withSubjectParticle`).
- `children` belong to a `group`; a `user` becomes a guardian of a `child` either by creating it or by selecting an existing one — never automatically.
- `users` no longer has a `child_name` column or any per-signup child concept; `child_name`/name display now always comes from `children.name`.
- Push recipients = every FCM token registered to any member of the child's group, **except** the one token the acting device supplies (if any) — never excludes by user/account.
- This is dev data with no real users yet: the schema migration may drop and rebuild `current_statuses` and drop `users.child_name` outright (no backward-compatible data migration needed).

## Review Focus

- A guardian who guards zero children in their group must see a "아이를 선택하거나 추가하세요" state and must never see place-selection controls they have no child to drive. (Task 6)
- `POST /api/children/join` must refuse a `childId` that doesn't belong to a group the caller is already a `group_member` of — otherwise any logged-in user could attach themselves as a guardian of any child in any group by guessing/enumerating UUIDs. (Task 3)
- `POST /api/status/update` must refuse a `childId` the caller isn't a guardian of (403), not just silently accept it — otherwise anyone in a group could puppet any child's status. (Task 3)
- The push-exclusion rule is "exclude this one device's token," not "exclude this user" — a guardian with two devices (or two guardians of the same child) must both be able to receive a push the other one didn't personally trigger. (Task 2, Task 3)
- A brand-new group (zero children yet) must show the "add a child" form directly, not a confusing empty list with no way forward. (Task 6)

---

## File Structure

```
supabase/migrations/0002_children_and_guardians.sql   (new)
src/types/db.ts                                        (modify: Child, ChildGuardian types; User drops child_name; CurrentStatus keys on child_id)
src/lib/status.ts, src/lib/status.test.ts              (modify: buildStatusUpsertRow takes childId)
src/lib/push.ts, src/lib/push.test.ts                  (modify: add excludeToken; formatPushPayload unchanged signature)
src/lib/firebase/client.ts                              (modify: add storeFcmToken/getStoredFcmToken)
src/app/api/children/create/route.ts                    (new)
src/app/api/children/join/route.ts                      (new)
src/app/api/status/update/route.ts                      (modify: childId + guardian check + deviceToken exclusion)
src/app/signup/page.tsx                                  (modify: remove child_name field)
src/components/NotificationBanner.tsx                    (modify: store token locally after registering)
src/components/NoChildState.tsx                          (new)
src/components/PlaceSelector.tsx                         (modify: childId prop, sends deviceToken)
src/app/dashboard/page.tsx                               (modify: per-child rendering)
```

---

### Task 1: Schema Migration

**Files:**
- Create: `supabase/migrations/0002_children_and_guardians.sql`

**Interfaces:**
- Produces: tables `children(id, group_id, name, created_at)`, `child_guardians(child_id, user_id, joined_at)` PK `(child_id, user_id)`; `current_statuses` rebuilt as `(child_id PK, group_id, place_id, updated_at)`; `users` loses `child_name`.

- [ ] **Step 1: Write the migration SQL**

```sql
create table public.children (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.child_guardians (
  child_id uuid not null references public.children(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (child_id, user_id)
);

drop table if exists public.current_statuses;
create table public.current_statuses (
  child_id uuid primary key references public.children(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  place_id uuid references public.places(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.users drop column if exists child_name;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email) values (new.id, new.email);
  return new;
end;
$$;

alter table public.children enable row level security;
alter table public.child_guardians enable row level security;

create policy "children select for group members" on public.children
  for select using (
    exists (select 1 from public.group_members gm
            where gm.group_id = public.children.group_id and gm.user_id = auth.uid())
  );

create policy "child_guardians select for group members" on public.child_guardians
  for select using (
    exists (select 1 from public.children c
            join public.group_members gm on gm.group_id = c.group_id
            where c.id = public.child_guardians.child_id and gm.user_id = auth.uid())
  );
```

(No new policy needed on the rebuilt `current_statuses` — its `group_id` column is unchanged, so the existing `"current_statuses select for members"` policy, which filters on `group_id`, still applies as-is.)

- [ ] **Step 2: Run the migration against the Supabase project**

Paste into the Supabase SQL Editor and run. Expected: `children`, `child_guardians` created; `current_statuses` rebuilt; `users.child_name` gone; no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_children_and_guardians.sql
git commit -m "feat: add children/child_guardians tables, re-key current_statuses on child_id"
```

---

### Task 2: Types and Core Logic Updates

**Files:**
- Modify: `src/types/db.ts`
- Modify: `src/lib/status.ts`, `src/lib/status.test.ts`
- Modify: `src/lib/push.ts`, `src/lib/push.test.ts`

**Interfaces:**
- Produces: `Child { id, group_id, name, created_at }`, `ChildGuardian { child_id, user_id, joined_at }`; `User` without `child_name`; `CurrentStatus { child_id, group_id, place_id, updated_at }`; `buildStatusUpsertRow(childId: string, groupId: string, placeId: string | null): CurrentStatus`; `excludeToken(tokens: string[], deviceToken: string | null): string[]` (push.ts, new).

- [ ] **Step 1: Update `src/types/db.ts`**

Remove `child_name` from `User`. Add `Child` and `ChildGuardian` interfaces per the Produces line. Change `CurrentStatus.user_id` to `CurrentStatus.child_id`.

- [ ] **Step 2: Update the failing test in `src/lib/status.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { buildStatusUpsertRow } from './status'

describe('buildStatusUpsertRow', () => {
  it('builds a row keyed by child_id with the given place_id', () => {
    const row = buildStatusUpsertRow('child-1', 'group-1', 'place-1')
    expect(row).toMatchObject({ child_id: 'child-1', group_id: 'group-1', place_id: 'place-1' })
  })

  it('builds a cleared row (place_id null) for going home', () => {
    const row = buildStatusUpsertRow('child-1', 'group-1', null)
    expect(row.place_id).toBeNull()
  })
})
```

- [ ] **Step 3: Run test, verify it fails** — `npx vitest run src/lib/status.test.ts` (fails: `buildStatusUpsertRow` still returns `user_id`, not `child_id`)

- [ ] **Step 4: Update `buildStatusUpsertRow(childId: string, groupId: string, placeId: string | null): CurrentStatus` in `src/lib/status.ts`**

Same shape as before, renamed parameter/field: `{ child_id: childId, group_id: groupId, place_id: placeId, updated_at: new Date().toISOString() }`.

- [ ] **Step 5: Run test, verify it passes** — `npx vitest run src/lib/status.test.ts`

- [ ] **Step 6: Write the failing test for `excludeToken` in `src/lib/push.test.ts`**

```ts
import { excludeToken } from './push'

describe('excludeToken', () => {
  it('removes exactly the given device token', () => {
    expect(excludeToken(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
  })

  it('returns all tokens unchanged when no device token is given', () => {
    expect(excludeToken(['a', 'b'], null)).toEqual(['a', 'b'])
  })
})
```

- [ ] **Step 7: Run test, verify it fails** — `npx vitest run src/lib/push.test.ts` (fails: `excludeToken` not exported)

- [ ] **Step 8: Implement `excludeToken(tokens: string[], deviceToken: string | null): string[]` in `src/lib/push.ts`**

`deviceToken == null ? tokens : tokens.filter(t => t !== deviceToken)`.

- [ ] **Step 9: Run all of `src/lib/push.test.ts` and `src/lib/status.test.ts`, verify all pass**

Run: `npx vitest run src/lib/push.test.ts src/lib/status.test.ts`

- [ ] **Step 10: Commit**

```bash
git add src/types/db.ts src/lib/status.ts src/lib/status.test.ts src/lib/push.ts src/lib/push.test.ts
git commit -m "feat: re-key status/push logic on child_id, add device-token exclusion"
```

---

### Task 3: Child Management APIs & Status Update Rewrite

**Files:**
- Create: `src/app/api/children/create/route.ts`
- Create: `src/app/api/children/join/route.ts`
- Modify: `src/app/api/status/update/route.ts`

**Interfaces:**
- Consumes: `createAuthClient()`, `createServiceClient()` (`src/lib/supabase/server.ts`); `buildStatusUpsertRow`, `excludeToken` (Task 2); `formatPushPayload`, `sendGroupPush` (unchanged from base MVP); `getAdminMessaging()` (unchanged).
- Produces: `POST /api/children/create` body `{ groupId: string; name: string }` → `{ child: Child }`; `POST /api/children/join` body `{ childId: string }` → `{ ok: true }`; `POST /api/status/update` body now `{ childId: string; placeId: string | null; deviceToken?: string | null }`.

- [ ] **Step 1: Write `POST /api/children/create` in `src/app/api/children/create/route.ts`**

Auth via `createAuthClient()` (401 if no user). Verify caller is a `group_members` row for `groupId` (service client; 403 "그룹 멤버만 아이를 추가할 수 있어요" if not). Insert into `children` (service client), then insert `{ child_id, user_id }` into `child_guardians` for the caller. Return `{ child }`.

- [ ] **Step 2: Write `POST /api/children/join` in `src/app/api/children/join/route.ts`**

Auth via `createAuthClient()`. Look up the child's `group_id` (service client); if no such child, 404. Verify caller is a `group_members` row for that `group_id` (403 "이 그룹의 멤버만 연결할 수 있어요" if not — satisfies the Review Focus authorization item). Insert `{ child_id, user_id }` into `child_guardians` (ignore Postgres duplicate-key `23505` — already a guardian is a no-op success). Return `{ ok: true }`.

- [ ] **Step 3: Rewrite `src/app/api/status/update/route.ts`**

Body is now `{ childId, placeId, deviceToken }`. After auth: verify a `child_guardians` row exists for `(childId, user.id)` (service client; 403 "이 아이의 보호자만 상태를 바꿀 수 있어요" if not — Review Focus item). Look up the child's `group_id` from `children` (needed for the upsert row and for scoping the push). Upsert via `buildStatusUpsertRow(childId, groupId, placeId)`. If `placeId === null`, return `{ ok: true }` (no push, unchanged rule). Otherwise: fetch the child's `name`, the place's `name`, and **every** `fcm_tokens` row for **every** `group_members` user in that `group_id` (no `.neq` exclusion by user — replaces the old per-user exclusion). Build `tokens = excludeToken(allTokens, deviceToken ?? null)`. If `tokens.length > 0`, call `sendGroupPush(getAdminMessaging(), tokens, formatPushPayload(childName, placeName))` inside the same try/catch introduced by the base MVP's `299be5a` fix (a push failure must still only log, never fail the response), and prune `failedTokens` from `fcm_tokens` as before.

- [ ] **Step 4: Manual verification**

Not run yet (no real children exist until Task 6's UI can create one) — covered by Task 7's end-to-end pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/children/create src/app/api/children/join src/app/api/status/update/route.ts
git commit -m "feat: add child management APIs, re-key status update on child_id"
```

---

### Task 4: FCM Device-Token Storage

**Files:**
- Modify: `src/lib/firebase/client.ts`
- Modify: `src/components/NotificationBanner.tsx`

**Interfaces:**
- Produces: `storeFcmToken(token: string): void`, `getStoredFcmToken(): string | null` (`src/lib/firebase/client.ts`, `localStorage` under a fixed key, wrapped in try/catch — private-browsing/blocked-storage must degrade to `null`, never throw).
- Consumed by: Task 6's `PlaceSelector` (reads `getStoredFcmToken()` to send as `deviceToken`).

- [ ] **Step 1: Implement `storeFcmToken`/`getStoredFcmToken` in `src/lib/firebase/client.ts`**

Fixed key `"playwithme_fcm_token"`. Both wrapped in try/catch returning `undefined`/`null` on failure (matches this file's existing degrade-gracefully pattern from the base MVP).

- [ ] **Step 2: Call `storeFcmToken(token)` in `src/components/NotificationBanner.tsx`**

Right after the existing successful `POST /api/fcm/register`, alongside hiding the banner.

- [ ] **Step 3: Verify with `npx tsc --noEmit`**

- [ ] **Step 4: Commit**

```bash
git add src/lib/firebase/client.ts src/components/NotificationBanner.tsx
git commit -m "feat: store this device's FCM token locally for status-update exclusion"
```

---

### Task 5: Signup Simplification

**Files:**
- Modify: `src/app/signup/page.tsx`

- [ ] **Step 1: Remove the child-name field and its state from the signup form**

Drop the `childName` state, its `<label>`/`<input>` block, and `child_name` from `signUp()`'s `options.data`. Keep everything else (email/password fields, invite-param redirect logic, email-confirmation-required state from commit `299be5a`) unchanged.

- [ ] **Step 2: Verify with `npx tsc --noEmit`**

- [ ] **Step 3: Commit**

```bash
git add src/app/signup/page.tsx
git commit -m "feat: remove child_name from signup, now a plain account form"
```

---

### Task 6: Dashboard Per-Child Rendering

**Files:**
- Create: `src/components/NoChildState.tsx`
- Modify: `src/components/PlaceSelector.tsx`
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `Child`, `ChildGuardian` (Task 2); `POST /api/children/create`, `POST /api/children/join` (Task 3); `getStoredFcmToken()` (Task 4); `getPlaceIcon()`, `StatusCard` (unchanged from base MVP).
- Produces: `<NoChildState groupId={string} existingChildren={Child[]} />`; `<PlaceSelector childId={string} groupId={string} places={Place[]} />` (childId added to the base MVP's existing props).

- [ ] **Step 1: Modify `src/components/PlaceSelector.tsx`**

Add `childId: string` to its props. In `selectPlace`, include `childId` and `deviceToken: getStoredFcmToken()` in the POST body to `/api/status/update` alongside the existing `groupId`/`placeId`.

- [ ] **Step 2: Create `src/components/NoChildState.tsx`**

Client component, props `{ groupId: string; existingChildren: Child[] }`. If `existingChildren` is non-empty, render each as a bouncy "OO 선택하기" button that `POST`s to `/api/children/join` with `{ childId }` then reloads (`router.refresh()` or a full redirect to `/dashboard`). Always render a "새 아이 추가" inline form (name input) that `POST`s to `/api/children/create` with `{ groupId, name }` then redirects to `/dashboard`. Style per Global Constraints (pastel card, `font-jua`, bouncy buttons). Exact copy: "함께할 아이를 선택하거나 추가해주세요! 👶".

- [ ] **Step 3: Rewrite the data-fetching half of `src/app/dashboard/page.tsx`**

After resolving `groupId` (unchanged logic): fetch all `children` for `groupId`, all `child_guardians` rows for those children, and (unchanged) all `places` for `groupId`. Compute `myChildIds = child_guardians rows where user_id === user.id`. If `myChildIds` is empty, render `<NoChildState groupId={groupId} existingChildren={children} />` instead of the normal view (Review Focus item — never show place-selection controls to a guardian of nothing). Otherwise, fetch `current_statuses` keyed by `child_id` for all of this group's children (not just the user's own) and render one `<StatusCard>` per child; for each child in `myChildIds`, additionally render `<PlaceSelector childId={child.id} groupId={groupId} places={places} />` directly under that child's card.

- [ ] **Step 4: Manual verification**

Deferred to Task 7's full pass (needs the live Supabase project).

- [ ] **Step 5: Commit**

```bash
git add src/components/NoChildState.tsx src/components/PlaceSelector.tsx src/app/dashboard/page.tsx
git commit -m "feat: render dashboard per-child, gate place controls on guardianship"
```

---

### Task 7: End-to-End Manual Verification

**Files:** none (verification only)

- [ ] **Step 1: Two guardians, one child**

Guardian A signs up, creates a group, creates a child "지훈" (becomes its guardian). Guardian B joins via the group's invite link, sees `NoChildState` (since B guards nothing yet), selects the existing "지훈" instead of creating a new one. Confirm both A and B now see one "지훈" card (not two), and both see place-selection controls under it.

- [ ] **Step 2: Push exclusion by device, not by guardian**

With both A and B having registered (fake, if real permission isn't grantable in this environment) FCM tokens, A sets 지훈's status to a place. Confirm via the DB that B's token is NOT pruned/excluded and would receive a push (i.e., only A's own `deviceToken`, if sent, is excluded from the recipient list) — confirms the Review Focus device-exclusion item.

- [ ] **Step 3: One guardian, two children**

Guardian A creates a second child "서연" in the same group. Confirm the dashboard shows two cards for A (지훈, 서연), each with its own independent place-selection controls, and that setting one child's status doesn't affect the other's `current_statuses` row.

- [ ] **Step 4: Authorization edges**

Confirm `POST /api/children/join` with a `childId` from a group the caller isn't a member of returns 403 (not a silent success). Confirm `POST /api/status/update` with a `childId` the caller doesn't guard returns 403.

- [ ] **Step 5: Record results**

Note any failures as follow-up fixes rather than silently patching scope into this plan.
