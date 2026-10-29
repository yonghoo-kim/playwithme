import Link from "next/link";
import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  CircleAlert,
  HeartHandshake,
  Lock,
  ShieldCheck,
  TimerOff,
} from "lucide-react";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { acceptGuardianInvite, declineGuardianInvite } from "./actions";
import {
  guardianInviteLoginPath,
  isGuardianOf,
  lookupGuardianInvite,
} from "./lookup";

function NoticeCard({
  Icon,
  iconWrapClass,
  iconClass,
  title,
  message,
  linkHref,
  linkLabel,
}: {
  Icon: LucideIcon;
  iconWrapClass: string;
  iconClass: string;
  title: string;
  message: string;
  linkHref: string;
  linkLabel: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border-4 border-gray-800 bg-white p-6 text-center shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
        <span
          className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${iconWrapClass}`}
        >
          <Icon size={28} strokeWidth={2.5} className={iconClass} />
        </span>
        <h1 className="mb-2 text-2xl font-jua text-pink-700">{title}</h1>
        <p className="mb-5 text-sm text-gray-600">{message}</p>
        <Link
          href={linkHref}
          className="block w-full rounded-2xl border-4 border-gray-800 bg-blue-300 py-2 font-jua text-lg text-blue-900 shadow-md shadow-blue-200 transition-transform hover:scale-105 active:scale-95"
        >
          {linkLabel}
        </Link>
      </div>
    </main>
  );
}

export default async function GuardianInvitePage({
  params,
}: {
  params: { code: string };
}) {
  const { code } = params;

  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const supabase = createServiceClient();
  const invite = await lookupGuardianInvite(supabase, code);

  // Someone who already guards this child (including whoever just used
  // this link) gets a friendly "already connected" card, not an error.
  if (
    user &&
    (invite.status === "ok" || invite.status === "used") &&
    (await isGuardianOf(supabase, user.id, invite.childId))
  ) {
    return (
      <NoticeCard
        Icon={ShieldCheck}
        iconWrapClass="bg-green-200 shadow-md shadow-green-200"
        iconClass="text-green-700"
        title="이미 보호자로 연결돼 있어요 🙌"
        message="대시보드에서 아이 상태를 확인할 수 있어요."
        linkHref="/dashboard"
        linkLabel="대시보드로 가기"
      />
    );
  }

  if (invite.status === "invalid") {
    return (
      <NoticeCard
        Icon={CircleAlert}
        iconWrapClass="bg-pink-200 shadow-md shadow-pink-200"
        iconClass="text-pink-700"
        title="링크가 올바르지 않아요 😢"
        message="보호자 초대 링크를 다시 확인해주세요."
        linkHref="/"
        linkLabel="처음으로 가기"
      />
    );
  }

  if (invite.status === "expired") {
    return (
      <NoticeCard
        Icon={TimerOff}
        iconWrapClass="bg-yellow-200 shadow-md shadow-yellow-200"
        iconClass="text-yellow-800"
        title="링크가 만료됐어요 ⏰"
        message="보호자 초대 링크는 7일 동안만 쓸 수 있어요. 새 링크를 받아주세요."
        linkHref="/"
        linkLabel="처음으로 가기"
      />
    );
  }

  if (invite.status === "used") {
    return (
      <NoticeCard
        Icon={Lock}
        iconWrapClass="bg-purple-200 shadow-md shadow-purple-200"
        iconClass="text-purple-700"
        title="이미 사용된 링크예요 🔒"
        message="보호자 초대 링크는 한 번만 쓸 수 있어요. 새 링크를 받아주세요."
        linkHref="/"
        linkLabel="처음으로 가기"
      />
    );
  }

  // Valid link, logged out: log in first, then come straight back here.
  if (!user) {
    redirect(guardianInviteLoginPath(code));
  }

  // Ask first. Nothing is written until "수락하기".
  const accept = acceptGuardianInvite.bind(null, code);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border-4 border-gray-800 bg-white p-6 text-center shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-pink-200 shadow-md shadow-pink-200">
          <HeartHandshake size={28} strokeWidth={2.5} className="text-pink-700" />
        </span>
        <h1 className="mb-2 text-2xl font-jua text-gray-800">
          <span className="text-pink-600">{invite.inviterLabel}</span>가{" "}
          <span className="text-blue-700">{invite.childName}</span>의 보호자로
          초대했어요. 수락할까요?
        </h1>
        <p className="mb-5 text-sm text-gray-600">
          수락하면 함께 아이의 상태를 바꾸고 친구들 소식을 받을 수 있어요.
        </p>
        <div className="flex gap-3">
          <form action={declineGuardianInvite} className="flex-1">
            <button
              type="submit"
              className="w-full rounded-2xl border-4 border-gray-800 bg-gray-100 py-2 font-jua text-lg text-gray-600 transition-transform hover:scale-105 active:scale-95"
            >
              거부하기
            </button>
          </form>
          <form action={accept} className="flex-1">
            <button
              type="submit"
              className="w-full rounded-2xl border-4 border-gray-800 bg-pink-300 py-2 font-jua text-lg text-pink-900 shadow-md shadow-pink-200 transition-transform hover:scale-105 active:scale-95"
            >
              수락하기
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
