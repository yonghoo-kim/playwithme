# 나랑 놀자 (Play With Me) MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PWA where parents in a private group share real-time outdoor status ("놀이터", "마트" etc.) with each other via Web Push (FCM), from signup/invite through status-change push delivery.

**Architecture:** Next.js (App Router) monolith. Supabase handles Auth + Postgres (all writes go through Next.js API routes using the `service_role` client, so RLS stays read-only-for-members and simple). Firebase JS SDK handles the browser side of Web Push (permission + token); Firebase Admin SDK runs server-side in API routes to send multicast pushes. `next-pwa` provides the installable-app shell/manifest; FCM's background service worker is registered separately at its own scope to avoid colliding with next-pwa's service worker.

**Tech Stack:** Next.js 14 (App Router, TypeScript), Tailwind CSS, lucide-react, @supabase/supabase-js + @supabase/ssr, firebase (client) + firebase-admin (server), next-pwa, nanoid, Vitest + @testing-library/react for tests.

**Spec:** [playwithmd.md](../../../playwithmd.md)

## Global Constraints

- All Lucide icons use `strokeWidth={2.5}` or `strokeWidth={3}` — never the default.
- Icon foreground colors are deep/playful (e.g. `text-blue-900`, `text-pink-700`, `text-yellow-800`) — never gray/black.
- Every icon sits in a pastel wrapper: `rounded-2xl` or `rounded-full`, bright pastel background (e.g. `bg-yellow-200`), `shadow-md shadow-<color>-200`.
- Interactive elements use bouncy transitions: `transition-transform hover:scale-110 hover:-translate-y-1 active:scale-90 active:rotate-3`; cards/buttons get `border-4 border-gray-800` comic-style borders where appropriate.
- Korean playful font 'Jua' (Google Fonts) loaded globally via `font-jua` utility, used for names/headings.
- Hybrid icon rule: Lucide = navigation/action/place-metaphor icons (always styled per rules above). Emoji = mood/status/reactions/copy accents (e.g. "✨", "🎈", "😎").
- DB table/column names are exactly as in spec §4: `users`, `fcm_tokens`, `groups`, `group_members` (composite PK `group_id, user_id`), `places`, `current_statuses` (PK `user_id`).
- Push payload text is exactly: `"{child_name}가 {place_name}에 나왔어요! 같이 놀아요! 🎈"`.
- "🏠 귀가 (Home)" clears `current_statuses.place_id` and does **not** trigger a push.
- Invite link format: `/invite/[invite_code]`.

## Review Focus

- Joining with an invalid/unknown invite code — dashboard must show a clear "코드가 올바르지 않아요" state, never a crash or silent redirect. (Task 4)
- Sending a push when a group member's FCM token is stale/revoked — one bad token must not stop delivery to the rest of the group, and the dead token should be pruned from `fcm_tokens`. (Task 10)
- A logged-in user who belongs to no group yet viewing `/dashboard` — must show an empty/invite-prompt state, not throw on a null group. (Task 4, Task 8)
- Two devices/tabs updating the same user's status back-to-back — `current_statuses` upsert must be keyed so the second write simply overwrites the first (no duplicate rows, no unique-constraint error). (Task 2, Task 9)
- Notification permission denied or FCM unsupported (e.g. desktop Safari) — the permission banner must degrade to a dismissible "알림을 켤 수 없어요" message rather than blocking the rest of the app. (Task 6)

---

## File Structure

```
D:\Playwithme
├── package.json, tsconfig.json, next.config.js, tailwind.config.ts, postcss.config.js, vitest.config.ts
├── .env.local.example, .gitignore
├── public/
│   ├── manifest.json
│   ├── firebase-messaging-sw.js
│   └── icons/icon-192.png, icons/icon-512.png
├── supabase/schema.sql
└── src/
    ├── app/
    │   ├── layout.tsx, globals.css, page.tsx
    │   ├── login/page.tsx, signup/page.tsx
    │   ├── invite/[code]/page.tsx
    │   ├── dashboard/page.tsx
    │   └── api/groups/create/route.ts, api/fcm/register/route.ts,
    │       api/places/create/route.ts, api/status/update/route.ts
    ├── components/StatusCard.tsx, PlaceButton.tsx, AddPlaceButton.tsx,
    │   NotificationBanner.tsx
    ├── lib/
    │   ├── supabase/client.ts, supabase/server.ts
    │   ├── firebase/client.ts, firebase/admin.ts
    │   ├── icons.ts, invite.ts, push.ts, status.ts
    └── types/db.ts
```

Pure, spec-driven logic (invite code generation, icon-name mapping, push payload shaping, status upsert shaping, multicast result handling) lives in small `src/lib/*.ts` files with colocated `*.test.ts` files — these get real TDD. Route handlers and pages stay thin wrappers around that logic plus the Supabase/Firebase SDK calls, verified manually against the running dev server (mocking the Supabase/Firebase SDKs end-to-end is not worth the cost at MVP size).

---

### Task 1: Project Scaffolding & Design System

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `vitest.config.ts`, `.gitignore`, `.env.local.example`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Create: `public/manifest.json`, `public/icons/icon-192.png`, `public/icons/icon-512.png` (placeholder PNGs)

**Interfaces:**
- Produces: Tailwind utility `font-jua` (bound to 'Jua' Google Font); global CSS variables/base styles; `next-pwa` wraps `next.config.js` so every later page is installable.

- [ ] **Step 1: Initialize the project**

Run: `npm create next-app@latest . -- --typescript --tailwind --app --no-src-dir=false --eslint --import-alias "@/*"` (answer prompts to match: App Router yes, src/ directory yes). This creates `package.json`, `tsconfig.json`, `tailwind.config.ts`, base `src/app/*`.

- [ ] **Step 2: Install remaining dependencies**

Run: `npm install lucide-react @supabase/supabase-js @supabase/ssr firebase firebase-admin next-pwa nanoid`
Run: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react`

- [ ] **Step 3: Configure `next-pwa` in `next.config.js`**

Wrap the Next config with `next-pwa` (`dest: 'public'`, `register: true`, `skipWaiting: true`, `disable: process.env.NODE_ENV === 'development'`).

- [ ] **Step 4: Add `vitest.config.ts`**

`environment: 'jsdom'`, `setupFiles` none needed yet, `plugins: [react()]`.

- [ ] **Step 5: Add Jua font + base playful styles in `src/app/globals.css` and `src/app/layout.tsx`**

Load `'Jua'` via `next/font/google`, expose as a `font-jua` className on `<body>`. Set `body` background to a soft pastel (e.g. `bg-yellow-50`).

- [ ] **Step 6: Write `public/manifest.json`**

`name: "나랑 놀자"`, `short_name: "나랑놀자"`, `theme_color` + `background_color` a pastel from the palette, `display: "standalone"`, icons pointing at `icon-192.png`/`icon-512.png`.

- [ ] **Step 7: Write `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
FIREBASE_SERVICE_ACCOUNT_JSON=
```

- [ ] **Step 8: Add `.gitignore` entries**

Ensure `.env*.local`, `env.txt`, `node_modules`, `.next`, `firebase-admin-key.json` are ignored.

- [ ] **Step 9: Verify dev server boots**

Run: `npm run dev` then fetch `http://localhost:3000` — expect the default/placeholder page to render with no console errors.

- [ ] **Step 10: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind, PWA, design system base"
```

---

### Task 2: Supabase Schema, RLS, and Clients

**Files:**
- Create: `supabase/schema.sql`
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`
- Create: `src/types/db.ts`

**Interfaces:**
- Produces: `createBrowserClient(): SupabaseClient` (lib/supabase/client.ts, uses anon key), `createServiceClient(): SupabaseClient` (lib/supabase/server.ts, uses `SUPABASE_SERVICE_ROLE_KEY`, server-only), TypeScript row types `User`, `FcmToken`, `Group`, `GroupMember`, `Place`, `CurrentStatus` in `src/types/db.ts`.

- [ ] **Step 1: Write `supabase/schema.sql`**

Exact tables per spec §4 (`users`, `fcm_tokens`, `groups`, `group_members`, `places`, `current_statuses`), with:
- `users.id uuid primary key references auth.users(id) on delete cascade`
- a trigger function `handle_new_user()` that inserts into `public.users (id, email, child_name)` from `new.raw_user_meta_data->>'child_name'` on `auth.users` insert, and the `on auth.users after insert` trigger wiring it up
- `current_statuses(user_id uuid primary key references users(id), group_id uuid not null references groups(id), place_id uuid references places(id) on delete set null, updated_at timestamptz not null default now())` — primary key on `user_id` is what makes repeated status updates an upsert-overwrite, satisfying the Review Focus race-condition item
- `alter table ... enable row level security;` on every table
- SELECT policies: authenticated users may select rows in `groups`/`group_members`/`places`/`current_statuses`/`fcm_tokens` where they are a member of that `group_id` (via `exists (select 1 from group_members gm where gm.group_id = <row>.group_id and gm.user_id = auth.uid())`); `users` SELECT allowed for self or any user sharing a group.
- No INSERT/UPDATE/DELETE policies for `anon`/`authenticated` roles — all writes go through API routes using the service-role client, which bypasses RLS.

- [ ] **Step 2: Run the schema against the Supabase project**

Paste `supabase/schema.sql` into the Supabase dashboard's SQL Editor and run it. Expected: all 6 tables + trigger created with no errors.

- [ ] **Step 3: Write `src/types/db.ts`**

Export `User`, `FcmToken`, `Group`, `GroupMember`, `Place`, `CurrentStatus` interfaces matching the schema column names/types exactly.

- [ ] **Step 4: Write `src/lib/supabase/client.ts`**

`export function createBrowserClient()` using `createBrowserClient` from `@supabase/ssr` with `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

- [ ] **Step 5: Write `src/lib/supabase/server.ts`**

`export function createServiceClient()` using `createClient` from `@supabase/supabase-js` with `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`. Add a one-line comment: server-only, never import from a client component.

- [ ] **Step 6: Commit**

```bash
git add supabase/schema.sql src/types/db.ts src/lib/supabase
git commit -m "feat: add Supabase schema, RLS policies, and client helpers"
```

---

### Task 3: Auth Pages (Signup / Login)

**Files:**
- Create: `src/app/signup/page.tsx`, `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `createBrowserClient()` from Task 2.
- Produces: after successful signup, the user lands authenticated with `child_name` stored in `auth.users.user_metadata.child_name` (consumed by Task 2's trigger) and redirected to `/dashboard`.

- [ ] **Step 1: Write `src/app/signup/page.tsx`**

Client component with email, password, and 아이 이름 (child_name) fields. On submit: `supabase.auth.signUp({ email, password, options: { data: { child_name } } })`. On success, redirect to `/dashboard`. Style per Global Constraints (pastel card, `font-jua` heading, playful copy e.g. "지훈이와 함께 시작해요! 🎈").

- [ ] **Step 2: Write `src/app/login/page.tsx`**

Client component with email/password, `supabase.auth.signInWithPassword(...)`, redirect to `/dashboard` on success, inline error message on failure.

- [ ] **Step 3: Manual verification**

Run `npm run dev`, sign up a test account, confirm a row appears in `public.users` with the right `child_name`, then log out and log back in.

- [ ] **Step 4: Commit**

```bash
git add src/app/signup src/app/login
git commit -m "feat: add signup and login pages"
```

---

### Task 4: Group Creation & Invite Join Flow

**Files:**
- Create: `src/lib/invite.ts`, `src/lib/invite.test.ts`
- Create: `src/app/api/groups/create/route.ts`
- Create: `src/app/invite/[code]/page.tsx`

**Interfaces:**
- Consumes: `createServiceClient()` (Task 2).
- Produces: `generateInviteCode(): string`, `createUniqueInviteCode(checkExists: (code: string) => Promise<boolean>): Promise<string>` — Task 9's dashboard "그룹이 없다면 초대 코드를 받으세요" empty state links here.

- [ ] **Step 1: Write the failing tests for `src/lib/invite.ts`**

```ts
import { describe, it, expect, vi } from 'vitest'
import { generateInviteCode, createUniqueInviteCode } from './invite'

describe('generateInviteCode', () => {
  it('returns an 8-character alphanumeric code', () => {
    const code = generateInviteCode()
    expect(code).toMatch(/^[A-Za-z0-9]{8}$/)
  })
})

describe('createUniqueInviteCode', () => {
  it('retries when the first code already exists', async () => {
    const exists = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    const code = await createUniqueInviteCode(exists)
    expect(exists).toHaveBeenCalledTimes(2)
    expect(code).toMatch(/^[A-Za-z0-9]{8}$/)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/lib/invite.test.ts`
Expected: FAIL — `invite.ts` does not exist yet.

- [ ] **Step 3: Implement `generateInviteCode(): string` and `createUniqueInviteCode(checkExists)` in `src/lib/invite.ts`**

Use `nanoid(8)` (alphanumeric alphabet) for `generateInviteCode`. `createUniqueInviteCode` loops: generate, call `checkExists`, return once `checkExists` resolves `false`.

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run src/lib/invite.test.ts` — Expected: PASS.

- [ ] **Step 5: Write `POST /api/groups/create` in `src/app/api/groups/create/route.ts`**

Body `{ name: string }`. Reads the authenticated user from the request's Supabase session, uses `createUniqueInviteCode` (checker queries `groups` by `invite_code` via the service client) to get a code, inserts into `groups`, then inserts the creator into `group_members`. Returns `{ group: Group }`.

- [ ] **Step 6: Write `src/app/invite/[code]/page.tsx`**

Server component reading `params.code`. If no authenticated session, redirect to `/signup?invite=<code>` (signup page reads this query param and, after successful signup, continues the join). If authenticated: look up `groups` by `invite_code`; if not found, render the "코드가 올바르지 않아요 😢" state (Review Focus item); if found, insert into `group_members` (service client, ignore duplicate-key error if already a member) and redirect to `/dashboard`.

- [ ] **Step 7: Manual verification**

Create a group via the API (e.g. with `curl` or a temporary button), copy its invite link, open it in a second logged-out browser profile, sign up, and confirm the new user appears in `group_members` for that group. Also visit `/invite/doesnotexist` and confirm the error state renders instead of crashing.

- [ ] **Step 8: Commit**

```bash
git add src/lib/invite.ts src/lib/invite.test.ts src/app/api/groups/create src/app/invite
git commit -m "feat: add group creation and invite join flow"
```

---

### Task 5: PWA Install Prompt & Manifest Wiring

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/NotificationBanner.tsx` (install-step only in this task; notification-permission logic added in Task 6)

**Interfaces:**
- Produces: `<NotificationBanner />`, mounted in `layout.tsx`, shown on every page while the FCM token isn't yet saved for the current browser.

- [ ] **Step 1: Link the manifest and theme color in `src/app/layout.tsx`**

Add `<link rel="manifest" href="/manifest.json" />` and a `<meta name="theme-color" ...>` matching `manifest.json`.

- [ ] **Step 2: Scaffold `src/components/NotificationBanner.tsx`**

Client component, playful copy exactly: "놀이터 알림을 받으려면 홈 화면에 추가하고 알림을 켜주세요! ✨" — pastel banner per Global Constraints, dismissible (local component state only, no persistence yet — Task 6 wires the real permission logic in).

- [ ] **Step 3: Manual verification**

Run `npm run dev`, build (`npm run build && npm run start`) since `next-pwa` is disabled in dev — confirm Chrome DevTools → Application → Manifest shows the app as installable and the banner renders on `/dashboard`.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/components/NotificationBanner.tsx
git commit -m "feat: wire PWA manifest and add notification banner shell"
```

---

### Task 6: Firebase Client, FCM Token Registration, Background Service Worker

**Files:**
- Create: `src/lib/firebase/client.ts`
- Create: `public/firebase-messaging-sw.js`
- Create: `src/app/api/fcm/register/route.ts`
- Modify: `src/components/NotificationBanner.tsx`

**Interfaces:**
- Consumes: `createServiceClient()` (Task 2), `<NotificationBanner />` shell (Task 5).
- Produces: `requestNotificationPermissionAndToken(): Promise<string | null>` (lib/firebase/client.ts) — returns the FCM token or `null` if permission was denied/unsupported.

- [ ] **Step 1: Write `public/firebase-messaging-sw.js`**

Classic (non-module) service worker using `importScripts` for `firebase-app-compat.js` and `firebase-messaging-compat.js`, `firebase.initializeApp({...})` with the same public Firebase config values (hardcoded here — they are public client config, not secrets), `messaging.onBackgroundMessage` showing a notification via `self.registration.showNotification`.

- [ ] **Step 2: Write `src/lib/firebase/client.ts`**

`export async function requestNotificationPermissionAndToken(): Promise<string | null>`. Steps inside: check `typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window` (return `null` if unsupported — satisfies the Review Focus degrade case); call `Notification.requestPermission()`; if not `'granted'`, return `null`; register `public/firebase-messaging-sw.js` at an explicit scope: `navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/firebase-cloud-messaging-push-scope' })` (kept separate from next-pwa's root-scope `sw.js` so the two workers don't fight over control); call `getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY, serviceWorkerRegistration })`; return the token or `null` on error (wrap in try/catch).

- [ ] **Step 3: Write `POST /api/fcm/register` in `src/app/api/fcm/register/route.ts`**

Body `{ token: string }`. Reads authenticated user, `upsert`s into `fcm_tokens` on the unique `token` column with `user_id` set, using the service client.

- [ ] **Step 4: Wire `src/components/NotificationBanner.tsx` to the real flow**

On the banner's "켜기" button click, call `requestNotificationPermissionAndToken()`; if it returns a token, `POST` it to `/api/fcm/register` and hide the banner; if it returns `null`, replace the banner content with the dismissible "알림을 켤 수 없어요 — 브라우저 설정에서 허용해주세요" message (Review Focus item) instead of retrying forever.

- [ ] **Step 5: Manual verification**

Build and run (`npm run build && npm run start`), load `/dashboard`, click "켜기", accept the browser permission prompt, confirm a row appears in `fcm_tokens`. Then block notifications in browser site settings, reload, click "켜기" again, and confirm the degrade message appears instead of a crash.

- [ ] **Step 6: Commit**

```bash
git add src/lib/firebase/client.ts public/firebase-messaging-sw.js src/app/api/fcm/register src/components/NotificationBanner.tsx
git commit -m "feat: add FCM permission flow and token registration"
```

---

### Task 7: Icon Mapping Utility

**Files:**
- Create: `src/lib/icons.ts`, `src/lib/icons.test.ts`

**Interfaces:**
- Produces: `getPlaceIcon(iconName: string): LucideIcon` (falls back to a default icon for unknown names — used by Task 8 and Task 9).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { Trees, ShoppingCart, MapPin } from 'lucide-react'
import { getPlaceIcon } from './icons'

describe('getPlaceIcon', () => {
  it('maps a known icon_name to its Lucide component', () => {
    expect(getPlaceIcon('Trees')).toBe(Trees)
    expect(getPlaceIcon('ShoppingCart')).toBe(ShoppingCart)
  })

  it('falls back to MapPin for an unknown icon_name', () => {
    expect(getPlaceIcon('NotARealIcon')).toBe(MapPin)
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run src/lib/icons.test.ts` — Expected: FAIL, `icons.ts` missing.

- [ ] **Step 3: Implement `getPlaceIcon(iconName: string): LucideIcon` in `src/lib/icons.ts`**

Maintain a small `Record<string, LucideIcon>` of the place icons the app ships with on day one (`Trees`, `ShoppingCart`, `MapPin`, `Home`, `Building2`, `Bike`), looked up by `iconName`, defaulting to `MapPin`.

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run src/lib/icons.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/icons.ts src/lib/icons.test.ts
git commit -m "feat: add icon_name to Lucide component mapping"
```

---

### Task 8: Dashboard UI — Member Status Cards

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/StatusCard.tsx`

**Interfaces:**
- Consumes: `createServiceClient()` (Task 2), `getPlaceIcon()` (Task 7), `<NotificationBanner />` (Task 6).
- Produces: dashboard renders the signed-in user's group's members; if the user has no group, renders the invite-prompt empty state (Review Focus item) instead of querying a null `group_id`.

- [ ] **Step 1: Write `src/app/dashboard/page.tsx`** (server component)

Load the authenticated user; query `group_members` for their `group_id` (take the first group — MVP is single-group-per-user). If none, render an empty state: "아직 그룹이 없어요! 초대 링크를 받아보세요 🎈" with a "그룹 만들기" button that calls `POST /api/groups/create`. If a group exists, query all `group_members` → `users` in that group plus each member's `current_statuses` (left join) and `places`, and render one `<StatusCard />` per member, plus the `<NotificationBanner />` from Task 6.

- [ ] **Step 2: Write `src/components/StatusCard.tsx`**

Props: `{ childName: string; placeName: string | null; iconName: string | null; updatedAt: string | null }`. When `placeName` is set: render the hybrid card from spec §5 (child name in `font-jua`, optionally followed by a static decorative flavor emoji such as 🏃‍♂️ — the spec defines no mood-data field, so this is fixed decoration, not derived from any stored value — relative time pill, pastel-circle-wrapped `getPlaceIcon(iconName)` at `strokeWidth={3}`, place name) with `border-4 border-gray-800 rounded-2xl` comic style and the bouncy hover/active transitions from Global Constraints. When `placeName` is `null`: render a quieter "집에 있어요 🏠" variant.

- [ ] **Step 3: Manual verification**

With two test accounts in the same group, set one user's status via a temporary `curl` call to the Task 9 API (or a stubbed button) and confirm the other user's dashboard shows the updated card on reload.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx src/components/StatusCard.tsx
git commit -m "feat: add dashboard with member status cards"
```

---

### Task 9: Place Selection & On-the-fly Place Creation

**Files:**
- Create: `src/app/api/places/create/route.ts`
- Create: `src/components/PlaceButton.tsx`, `src/components/AddPlaceButton.tsx`
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getPlaceIcon()` (Task 7), `createServiceClient()` (Task 2).
- Produces: clicking a `<PlaceButton>` or submitting `<AddPlaceButton>`'s form calls Task 10's `POST /api/status/update`.

- [ ] **Step 1: Write `POST /api/places/create` in `src/app/api/places/create/route.ts`**

Body `{ groupId: string; name: string; iconName: string }`. Inserts into `places`, returns `{ place: Place }`.

- [ ] **Step 2: Write `src/components/PlaceButton.tsx`**

Props `{ place: Place; onSelect: (placeId: string) => void }`. Renders the place's pastel-wrapped `getPlaceIcon(place.icon_name)` + name, bouncy press animation, calls `onSelect(place.id)` on click.

- [ ] **Step 3: Write `src/components/AddPlaceButton.tsx`**

Bouncy circular "+" button (Lucide `Plus`, pastel wrapper) that opens a small inline form (name text input + a fixed set of icon choices from `src/lib/icons.ts`'s known keys) which `POST`s to `/api/places/create` then calls the same `onSelect(placeId)` callback as `PlaceButton`.

- [ ] **Step 4: Modify `src/app/dashboard/page.tsx`**

Fetch the group's `places`, render them as a row of `<PlaceButton>`s followed by `<AddPlaceButton>`, both wired to a client-side handler that calls Task 10's status-update endpoint.

- [ ] **Step 5: Manual verification**

Click an existing place button and confirm `current_statuses` updates (via Task 10); add a brand-new place on the fly, confirm it appears in `places` and immediately becomes selectable.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/places/create src/components/PlaceButton.tsx src/components/AddPlaceButton.tsx src/app/dashboard/page.tsx
git commit -m "feat: add place selection and on-the-fly place creation"
```

---

### Task 10: Status Update API & Push Notification Sending

**Files:**
- Create: `src/lib/status.ts`, `src/lib/status.test.ts`
- Create: `src/lib/push.ts`, `src/lib/push.test.ts`
- Create: `src/lib/firebase/admin.ts`
- Create: `src/app/api/status/update/route.ts`

**Interfaces:**
- Consumes: `createServiceClient()` (Task 2).
- Produces: `buildStatusUpsertRow(userId, groupId, placeId): CurrentStatus` (status.ts), `formatPushPayload(childName: string, placeName: string): { title: string; body: string }` (push.ts), `sendGroupPush(messaging: admin.messaging.Messaging, tokens: string[], payload: { title: string; body: string }): Promise<{ successTokens: string[]; failedTokens: string[] }>` (push.ts — `messaging` is injected so the function is testable without the real Admin SDK).

- [ ] **Step 1: Write the failing tests for `src/lib/status.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { buildStatusUpsertRow } from './status'

describe('buildStatusUpsertRow', () => {
  it('builds a row with the given place_id', () => {
    const row = buildStatusUpsertRow('user-1', 'group-1', 'place-1')
    expect(row).toMatchObject({ user_id: 'user-1', group_id: 'group-1', place_id: 'place-1' })
  })

  it('builds a cleared row (place_id null) for going home', () => {
    const row = buildStatusUpsertRow('user-1', 'group-1', null)
    expect(row.place_id).toBeNull()
  })
})
```

- [ ] **Step 2: Run, verify failure** — `npx vitest run src/lib/status.test.ts`

- [ ] **Step 3: Implement `buildStatusUpsertRow(userId, groupId, placeId): CurrentStatus`** in `src/lib/status.ts` — returns `{ user_id: userId, group_id: groupId, place_id: placeId, updated_at: new Date().toISOString() }`.

- [ ] **Step 4: Run, verify pass** — `npx vitest run src/lib/status.test.ts`

- [ ] **Step 5: Write the failing tests for `src/lib/push.ts`**

```ts
import { describe, it, expect, vi } from 'vitest'
import { formatPushPayload, sendGroupPush } from './push'

describe('formatPushPayload', () => {
  it('formats the exact spec copy, with a static app-name title', () => {
    expect(formatPushPayload('지훈', '단지 내 놀이터')).toEqual({
      title: '나랑 놀자 🎈',
      body: '지훈이가 단지 내 놀이터에 나왔어요! 같이 놀아요! 🎈',
    })
  })
})

describe('sendGroupPush', () => {
  it('returns success/failed tokens split from a multicast response, pruning failures', async () => {
    const messaging = {
      sendEachForMulticast: vi.fn().mockResolvedValue({
        responses: [{ success: true }, { success: false }],
      }),
    }
    const result = await sendGroupPush(messaging as any, ['tok-ok', 'tok-dead'], {
      title: 't', body: 'b',
    })
    expect(result.successTokens).toEqual(['tok-ok'])
    expect(result.failedTokens).toEqual(['tok-dead'])
  })
})
```

- [ ] **Step 6: Run, verify failure** — `npx vitest run src/lib/push.test.ts`

- [ ] **Step 7: Implement `formatPushPayload` and `sendGroupPush` in `src/lib/push.ts`**

`formatPushPayload(childName, placeName)` returns `{ title: '나랑 놀자 🎈', body: \`${childName}가 ${placeName}에 나왔어요! 같이 놀아요! 🎈\` }` — the body matches spec §6's payload text exactly (the spec's own example always uses "가" regardless of the child name's final consonant, so the implementation does too, with no grammar branching). `sendGroupPush(messaging, tokens, payload)` calls `messaging.sendEachForMulticast({ tokens, notification: payload })`, zips `responses` against `tokens` by index, and splits into `successTokens`/`failedTokens`.

- [ ] **Step 8: Run, verify pass** — `npx vitest run src/lib/push.test.ts`

- [ ] **Step 9: Write `src/lib/firebase/admin.ts`**

`export function getAdminMessaging()` — lazily calls `admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!)) })` once, returns `admin.messaging()`.

- [ ] **Step 10: Write `POST /api/status/update` in `src/app/api/status/update/route.ts`**

Body `{ groupId: string; placeId: string | null }`. Reads authenticated user + their `child_name`. Builds the row via `buildStatusUpsertRow` and `upsert`s into `current_statuses` (service client). If `placeId` is not `null`: look up the place's `name`, format the payload via `formatPushPayload`, fetch all `fcm_tokens` for the group's other members, call `sendGroupPush(getAdminMessaging(), tokens, payload)`, and `delete` any `failedTokens` from `fcm_tokens` (satisfies the stale-token Review Focus item). If `placeId` is `null` (귀가/home), skip the push entirely per Global Constraints.

- [ ] **Step 11: Manual verification**

With two accounts in the same group and both having registered FCM tokens (Task 6), set one user's status to a place via the dashboard and confirm the other user receives a real browser push with the exact spec copy. Click "🏠 귀가" and confirm `current_statuses.place_id` clears with no push sent.

- [ ] **Step 12: Commit**

```bash
git add src/lib/status.ts src/lib/status.test.ts src/lib/push.ts src/lib/push.test.ts src/lib/firebase/admin.ts src/app/api/status/update
git commit -m "feat: add status update API with multicast push notification sending"
```

---

### Task 11: Home (귀가) Button

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `POST /api/status/update` with `placeId: null` (Task 10).

- [ ] **Step 1: Add a "🏠 귀가" button to the dashboard's place row**

Always rendered alongside the `<PlaceButton>`s from Task 9; on click, calls `POST /api/status/update` with `{ groupId, placeId: null }` and optimistically clears the current user's own card to the "집에 있어요 🏠" variant.

- [ ] **Step 2: Manual verification**

Set a status to a place, click "🏠 귀가", confirm the card reverts and no push notification is received by group members.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: add home button to clear status"
```

---

### Task 12: End-to-End Manual Verification Pass

**Files:** none (verification only)

- [ ] **Step 1: Full flow with two real browser profiles (or one browser + one incognito window)**

Profile A: sign up, create a group, copy the invite link. Profile B: open the invite link, sign up, confirm landing on the dashboard inside A's group. Both: enable notifications (Task 6). Profile A: pick a place, confirm Profile B receives the push with the exact spec copy and sees A's card update without a manual reload needed (poll or reload as the MVP requires). Profile A: click 귀가, confirm the card clears and no push fires.

- [ ] **Step 2: Edge cases from Review Focus**

Visit an invalid invite code; view the dashboard as a brand-new user with no group; deny notification permission and confirm the degrade message; rapidly click two different place buttons and confirm only the last one sticks in `current_statuses` with no duplicate-key error.

- [ ] **Step 3: Record results**

Note any failures found as follow-up tasks rather than silently patching scope into this plan.
