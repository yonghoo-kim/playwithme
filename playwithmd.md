# Project Specification: 나랑 놀자 (Play With Me) - PWA + FCM App

## 1. Project Overview & Tech Stack
- **App Name:** 나랑 놀자 (Play With Me)
- **App Concept:** A Progressive Web App (PWA) for parents to share their real-time outdoor status (e.g., "Playground", "Supermarket") with a private group of friends via Web Push Notifications.
- **Tech Stack:** Next.js (App Router), Tailwind CSS, Supabase (Auth + PostgreSQL), Firebase Cloud Messaging (FCM) for Web Push, next-pwa, lucide-react.

## 2. UI/UX & Design Guidelines (CRITICAL: CUTE & PLAYFUL)
The app must have a "Cute, Playful, Childlike, and Mischievous" aesthetic. Since we are using lucide-react (which is naturally line-art and modern), you MUST apply the following rules to make them look like playful cartoon UI elements:
1. **Thicker Strokes:** Always use `strokeWidth={2.5}` or `strokeWidth={3}` on all Lucide icons to make them look chunky and cute.
2. **Playful Foreground Colors:** Never use boring grays or plain black. Use deep playful colors for the icons (e.g., `text-blue-900`, `text-pink-700`, `text-yellow-800`).
3. **Colorful Pastel Wrappers:** Wrap every icon in a bright, colorful pastel background (e.g., `bg-yellow-200`, `bg-pink-300`, `bg-blue-300`). Use squircles or perfect circles (`rounded-2xl`, `rounded-full`) and add soft but noticeable drop shadows (e.g., `shadow-md shadow-pink-200`).
4. **Jelly/Bouncy Animations:** Elements should feel alive. On hover or tap, use bouncy CSS animations (e.g., `transition-transform hover:scale-110 hover:-translate-y-1 active:scale-90 active:rotate-3`). Add thick borders (`border-4 border-gray-800`) to cards/buttons for a comic-book style if appropriate.
5. **Typography:** Import and use a playful Korean web font from Google Fonts (e.g., 'Jua' or 'Dongle').

### [ADD-ON] 2.5. Lucide + Emoji Hybrid Design Rules
To balance the UI between system utility and childlike playfulness, strictly follow this hybrid rule:
- **System & Utility (Lucide Icons):** 
  - Use for Navigation (Home, Settings), Action Buttons (Add Place, Close), and Place Metaphors (`Trees` for playground, `ShoppingCart` for mart). 
  - *Constraint:* Must always follow the "Thicker Strokes" and "Pastel Wrappers" rules mentioned above.
- **Emotion & Content Points (Emoji):** 
  - Use for Child's current mood/status (😎 신남, 😭 피곤함, 🏃‍♂️ 뛰는 중), quick reactions (❤️, 👍), and playful typography accents (Hero banners).
  - *Example:* "놀이터 알림을 켜주세요! ✨", "지훈이 등장! 🎈"

## 3. Core User Flows
1. **Invite & Join (초대 및 자동 가입):**
  - A user creates a group and shares the invite link (e.g., `myapp.com/invite/[invite_code]`) via KakaoTalk manually.
  - The invitee clicks the link -> Signs up (Email + Child's name) -> Automatically inserted into `group_members`.
2. **PWA & FCM Setup (앱 설치 및 푸시 권한):**
  - Show a cute, cartoonish banner: "놀이터 알림을 받으려면 홈 화면에 추가하고 알림을 켜주세요! ✨"
  - Request permission, get the FCM token, and save it to the DB.
3. **Status Chaining & On-the-fly Places (상태 변경 및 장소 즉석 추가):**
  - Dashboard shows group members as cute cards with their current status icon (Lucide icon mapped from DB + Status Emoji).
  - User clicks a predefined place button OR adds a new place on the fly.
  - Status updates -> Triggers Next.js API -> Sends FCM Push to all group members.
  - User clicks "🏠 귀가 (Home)" -> Status clears.

## 4. Database Schema (Supabase PostgreSQL)
- `users`: id (PK), email, child_name, created_at
- `fcm_tokens`: id (PK), user_id (FK), token (unique), created_at
- `groups`: id (PK), name, invite_code (unique), created_at
- `group_members`: group_id (FK), user_id (FK), joined_at (PK: group_id, user_id)
- `places`: id (PK), group_id (FK), name, icon_name (Store the string name of a Lucide icon, e.g., 'Trees', 'ShoppingCart')
- `current_statuses`: user_id (PK), group_id (FK), place_id (FK, nullable), updated_at

## 5. Development Step-by-Step Instructions for Claude
- **Step 1: Setup & Initialization**
  - Initialize Next.js, Tailwind, and lucide-react. Apply the playful design guidelines from Section 2 to `globals.css` and `tailwind.config.ts`. Set up next-pwa.
- **Step 2: Database & Auth**
  - Execute SQL to create tables. Build a simple, cute Signup/Login page focusing on the `child_name` input.
- **Step 3: The Invite URL Logic**
  - Create route `app/invite/[code]/page.tsx`. If authenticated, verify `invite_code`, insert into `group_members`, and redirect to dashboard.
- **Step 4: PWA Registration & FCM Setup**
  - Implement a playful UI banner asking for Notification permissions. Save the FCM token to `fcm_tokens`.
- **Step 5: Dashboard UI (The Playground) & Hybrid Component Implementation**
  - Display members and their `current_statuses` using chunky UI cards.
  - Map the string `icon_name` from the DB to dynamic lucide-react components. Render them with `strokeWidth={3}` inside colorful circle wrappers.
  - Implement a bouncy "Add Place (+)" button.
  - *Code standard for Dashboard Cards (Hybrid example):*
    ```tsx
    // Example of mixing Lucide (Utility/Place) and Emoji (Mood/Content)
    <div className="border-4 border-gray-800 rounded-2xl p-4 bg-white shadow-[4px_4px_0px_rgba(31,41,55,1)] transition-transform hover:-translate-y-1 hover:scale-105 active:scale-95 cursor-pointer">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xl font-bold font-jua">지훈이 🏃‍♂️</span> {/* Emoji for playfulness */}
        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold">10분 전</span>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <div className="p-3 bg-green-300 rounded-full shadow-sm">
          <Trees size={28} strokeWidth={3} className="text-green-900" /> {/* Lucide for chunky place icon */}
        </div>
        <span className="text-lg font-bold text-gray-800">단지 내 놀이터</span>
      </div>
    </div>
    ```
- **Step 6: Status Update & Push Notification (Backend)**
  - Create `POST /api/status/update`.
  - DB Action: Upsert `current_statuses`.
  - FCM Action: Fetch `fcm_tokens` for the group and send multicast push notification. Payload: "[Child Name]가 [Place Name]에 나왔어요! 같이 놀아요! 🎈" (Include Emoji in payload).