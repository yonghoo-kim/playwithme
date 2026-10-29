import { redirect } from "next/navigation";
import { Frown, Users } from "lucide-react";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { firstParam, inviteQuery } from "@/lib/inviteQuery";
import { confirmJoin, declineJoin } from "./confirm-actions";

function InvalidCodeState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-yellow-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border-4 border-gray-800 bg-white p-6 text-center shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-pink-200 shadow-md shadow-pink-200">
          <Frown size={28} strokeWidth={2.5} className="text-pink-700" />
        </span>
        <h1 className="mb-2 text-2xl font-jua text-pink-700">
          코드가 올바르지 않아요 😢
        </h1>
        <p className="text-sm text-gray-600">초대 링크를 다시 확인해주세요.</p>
      </div>
    </main>
  );
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: { code: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { code } = params;
  const from = firstParam(searchParams.from);

  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  // Logged out: most invitees already have an account, so land on login
  // (which shows "○○네가 초대했어요" and links on to signup).
  if (!user) {
    redirect(`/login${inviteQuery(code, from)}`);
  }

  const supabase = createServiceClient();

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("invite_code", code)
    .maybeSingle();

  if (!group) {
    return <InvalidCodeState />;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (membership) {
    redirect("/dashboard");
  }

  // Not a member yet: ask first. Nothing is written until "참여하기".
  const confirm = confirmJoin.bind(null, code);

  return (
    <main className="flex min-h-screen items-center justify-center bg-yellow-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border-4 border-gray-800 bg-white p-6 text-center shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-200 shadow-md shadow-blue-200">
          <Users size={28} strokeWidth={2.5} className="text-blue-700" />
        </span>
        <h1 className="mb-2 text-2xl font-jua text-gray-800">
          <span className="text-pink-600">{group.name}</span> 그룹에
          참여할까요? 🎈
        </h1>
        <p className="mb-5 text-sm text-gray-600">
          참여하면 아이를 추가하고 친구들과 함께 놀 수 있어요.
        </p>
        <div className="flex gap-3">
          <form action={declineJoin} className="flex-1">
            <button
              type="submit"
              className="w-full rounded-2xl border-4 border-gray-800 bg-gray-100 py-2 font-jua text-lg text-gray-600 transition-transform hover:scale-105 active:scale-95"
            >
              거부하기
            </button>
          </form>
          <form action={confirm} className="flex-1">
            <button
              type="submit"
              className="w-full rounded-2xl border-4 border-gray-800 bg-pink-300 py-2 font-jua text-lg text-pink-900 shadow-md shadow-pink-200 transition-transform hover:scale-105 active:scale-95"
            >
              참여하기
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
