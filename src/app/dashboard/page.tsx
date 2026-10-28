import { redirect } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { createGroupForUser } from "@/lib/groups";
import NotificationBanner from "@/components/NotificationBanner";
import StatusCard from "@/components/StatusCard";
import PlaceSelector from "@/components/PlaceSelector";
import type { Place } from "@/types/db";

/**
 * Server Action backing the empty-state "그룹 만들기" form — the no-JS
 * form path onto the same `createGroupForUser` logic that
 * `POST /api/groups/create` uses, so group creation has one
 * implementation. Redirects back to `/dashboard` so the page re-fetches
 * and renders the new group immediately.
 */
async function createGroupAction(formData: FormData) {
  "use server";

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) {
    return;
  }

  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await createGroupForUser(createServiceClient(), user.id, name);

  redirect("/dashboard");
}

function EmptyGroupState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-yellow-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border-4 border-gray-800 bg-white p-6 text-center shadow-[4px_4px_0px_rgba(31,41,55,1)]">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-200 shadow-md shadow-yellow-200">
          <PartyPopper
            size={28}
            strokeWidth={2.5}
            className="text-yellow-800"
          />
        </span>

        <h1 className="mb-2 text-2xl font-jua text-pink-700">
          아직 그룹이 없어요! 초대 링크를 받아보세요 🎈
        </h1>
        <p className="mb-5 text-sm text-gray-600">
          또는 새 그룹을 직접 만들어보세요.
        </p>

        <form action={createGroupAction} className="flex flex-col gap-3">
          <input
            type="text"
            name="name"
            required
            placeholder="그룹 이름"
            className="w-full rounded-2xl border-2 border-gray-800 bg-yellow-50 px-3 py-2 text-center outline-none"
          />
          <button
            type="submit"
            className="w-full rounded-2xl border-4 border-gray-800 bg-blue-300 py-2 font-jua text-lg text-blue-900 shadow-md shadow-blue-200 transition-transform hover:scale-110 hover:-translate-y-1 active:scale-90 active:rotate-3"
          >
            그룹 만들기 ✨
          </button>
        </form>
      </div>
    </main>
  );
}

interface MemberStatus {
  userId: string;
  childName: string;
  placeName: string | null;
  iconName: string | null;
  updatedAt: string | null;
}

export default async function DashboardPage() {
  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = createServiceClient();

  // MVP is single-group-per-user: take the first group_members row.
  const { data: membershipRows } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)
    .limit(1);

  const groupId = membershipRows?.[0]?.group_id as string | undefined;

  if (!groupId) {
    return <EmptyGroupState />;
  }

  const { data: memberRows } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  const userIds = (memberRows ?? []).map((row) => row.user_id as string);

  const [{ data: userRows }, { data: statusRows }, { data: groupPlaceRows }] =
    await Promise.all([
      supabase.from("users").select("id, child_name").in("id", userIds),
      supabase
        .from("current_statuses")
        .select("user_id, place_id, updated_at")
        .in("user_id", userIds),
      supabase
        .from("places")
        .select("id, group_id, name, icon_name, created_at")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true }),
    ]);

  const places: Place[] = (groupPlaceRows ?? []) as Place[];

  const placeIds = Array.from(
    new Set(
      (statusRows ?? [])
        .map((row) => row.place_id as string | null)
        .filter((id): id is string => !!id)
    )
  );

  const { data: placeRows } =
    placeIds.length > 0
      ? await supabase
          .from("places")
          .select("id, name, icon_name")
          .in("id", placeIds)
      : { data: [] as { id: string; name: string; icon_name: string }[] };

  const placesById = new Map(
    (placeRows ?? []).map((place) => [place.id, place])
  );
  const statusByUser = new Map(
    (statusRows ?? []).map((row) => [row.user_id, row])
  );

  const members: MemberStatus[] = (userRows ?? []).map((userRow) => {
    const status = statusByUser.get(userRow.id);
    const place = status?.place_id ? placesById.get(status.place_id) : undefined;

    return {
      userId: userRow.id,
      childName: userRow.child_name,
      placeName: place?.name ?? null,
      iconName: place?.icon_name ?? null,
      updatedAt: status?.updated_at ?? null,
    };
  });

  return (
    <main className="min-h-screen bg-yellow-50 px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <NotificationBanner />

        <h1 className="text-center text-2xl font-jua text-pink-700">
          우리 그룹 🎈
        </h1>

        <div className="flex flex-col gap-3">
          {members.map((member) => (
            <StatusCard
              key={member.userId}
              childName={member.childName}
              placeName={member.placeName}
              iconName={member.iconName}
              updatedAt={member.updatedAt}
            />
          ))}
        </div>

        <h2 className="text-center text-xl font-jua text-blue-900">
          어디 갈까요? 🗺️
        </h2>

        <PlaceSelector groupId={groupId} places={places} />
      </div>
    </main>
  );
}
