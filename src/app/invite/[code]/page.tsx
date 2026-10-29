import { redirect } from "next/navigation";
import { Frown, Users } from "lucide-react";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { firstParam, inviteQuery } from "@/lib/inviteQuery";
import { confirmJoin, declineJoin } from "./confirm-actions";

function InvalidCodeState() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
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

const ERROR_COPY: Record<string, string> = {
  pick: "아이를 한 명 이상 골라주세요",
  name: "아이 이름을 입력해주세요",
  same: "이미 같은 이름의 그룹에 들어가 있어요",
};

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: { code: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { code } = params;
  const from = firstParam(searchParams.from);
  const errorKey = firstParam(searchParams.error);
  const errorMessage = errorKey ? ERROR_COPY[errorKey] ?? null : null;

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
    .select("id, name")
    .eq("invite_code", code)
    .maybeSingle();

  if (!group) {
    return <InvalidCodeState />;
  }

  // The children this user guards, and which of them are already in the
  // invited group.
  const { data: guardianRows, error: guardianError } = await supabase
    .from("child_guardians")
    .select("child_id")
    .eq("user_id", user.id);

  if (guardianError) {
    throw new Error("보호자 정보를 불러오지 못했어요.");
  }

  const guardedIds = (guardianRows ?? []).map((row) => row.child_id as string);

  let children: { id: string; name: string }[] = [];
  const joinedIds = new Set<string>();

  if (guardedIds.length > 0) {
    const [childrenResult, joinedResult] = await Promise.all([
      supabase
        .from("children")
        .select("id, name")
        .in("id", guardedIds)
        .order("created_at", { ascending: true }),
      supabase
        .from("child_groups")
        .select("child_id")
        .eq("group_id", group.id)
        .in("child_id", guardedIds),
    ]);

    if (childrenResult.error) {
      throw new Error("아이 정보를 불러오지 못했어요.");
    }
    if (joinedResult.error) {
      throw new Error("그룹 정보를 불러오지 못했어요.");
    }

    children = (childrenResult.data ?? []).map((c) => ({
      id: c.id as string,
      name: c.name as string,
    }));
    for (const row of joinedResult.data ?? []) {
      joinedIds.add(row.child_id as string);
    }
  }

  // Every child of this family is already in the group: nothing to ask.
  if (children.length > 0 && children.every((c) => joinedIds.has(c.id))) {
    redirect(`/dashboard?group=${encodeURIComponent(group.id)}`);
  }

  const firstUnjoinedId = children.find((c) => !joinedIds.has(c.id))?.id;

  // Nothing is written until "참여하기". The action gets the invite code
  // (bound here, not from the form) and re-resolves the group itself.
  const confirm = confirmJoin.bind(null, code, from);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border-4 border-gray-800 bg-white p-6 text-center shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-200 shadow-md shadow-blue-200">
          <Users size={28} strokeWidth={2.5} className="text-blue-700" />
        </span>
        <h1 className="mb-2 text-2xl font-jua text-gray-800">
          <span className="text-pink-600">{group.name}</span> 그룹에
          참여할까요? 🎈
        </h1>

        <form id="join-form" action={confirm} className="mb-5 text-left">
          {children.length > 0 ? (
            <>
              <p className="mb-3 text-center text-sm text-gray-600">
                어떤 아이를 참여시킬까요?
              </p>
              <ul className="space-y-2">
                {children.map((child) => {
                  const joined = joinedIds.has(child.id);
                  return (
                    <li key={child.id}>
                      <label
                        className={`flex items-center gap-3 rounded-2xl border-4 border-gray-800 px-4 py-2 font-jua text-lg ${
                          joined
                            ? "cursor-not-allowed bg-gray-100 text-gray-400"
                            : "cursor-pointer bg-yellow-100 text-gray-800 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="childId"
                          value={child.id}
                          disabled={joined}
                          defaultChecked={joined || child.id === firstUnjoinedId}
                          className="h-5 w-5 accent-pink-500"
                        />
                        <span className="flex-1">{child.name}</span>
                        {joined && (
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">
                            이미 참여 중
                          </span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <label className="block">
              <span className="mb-2 block text-center text-sm text-gray-600">
                참여할 아이의 이름을 알려주세요.
              </span>
              <span className="mb-1 block font-jua text-gray-800">아이 이름</span>
              <input
                type="text"
                name="childName"
                required
                maxLength={20}
                autoComplete="off"
                placeholder="예: 지훈"
                className="w-full rounded-2xl border-4 border-gray-800 bg-white px-4 py-2 font-jua text-lg text-gray-800 outline-none focus:border-pink-500"
              />
            </label>
          )}
          {errorMessage && (
            <p role="alert" className="mt-3 text-center text-sm font-bold text-pink-600">
              {errorMessage}
            </p>
          )}
        </form>

        <div className="flex gap-3">
          <form action={declineJoin} className="flex-1">
            <button
              type="submit"
              className="w-full rounded-2xl border-4 border-gray-800 bg-gray-100 py-2 font-jua text-lg text-gray-600 transition-transform hover:scale-105 active:scale-95"
            >
              거부하기
            </button>
          </form>
          <button
            type="submit"
            form="join-form"
            className="flex-1 rounded-2xl border-4 border-gray-800 bg-pink-300 py-2 font-jua text-lg text-pink-900 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95"
          >
            참여하기
          </button>
        </div>
      </div>
    </main>
  );
}
