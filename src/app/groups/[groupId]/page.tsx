import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { getGuardedChildIds } from "@/lib/childAccess";
import { buildInviteUrl } from "@/lib/inviteUrl";
import RealtimeStatusList, {
  type ChildStatusView,
} from "@/components/RealtimeStatusList";
import InviteCopyButton from "@/app/dashboard/InviteCopyButton";
import type { Child, CurrentStatus, Group, Place } from "@/types/db";

interface GroupPageProps {
  params: { groupId: string };
}

/**
 * A group (depth 2): my child(ren) in it as compact read-only lines, then
 * every other child in it ("친구들", read-only), all live via Realtime.
 * Only reachable when at least one child I guard is in the group.
 */
export default async function GroupPage({ params }: GroupPageProps) {
  const { groupId } = params;

  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = createServiceClient();

  const [guardedChildIds, { data: groupRow }, { data: memberRows }, { data: userRow }] =
    await Promise.all([
      getGuardedChildIds(supabase, user.id),
      supabase
        .from("groups")
        .select("id, name, invite_code")
        .eq("id", groupId)
        .maybeSingle(),
      supabase
        .from("child_groups")
        .select("child_id, joined_at")
        .eq("group_id", groupId)
        .order("joined_at", { ascending: true }),
      supabase
        .from("users")
        .select("active_child_id")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

  const group = groupRow as Pick<Group, "id" | "name" | "invite_code"> | null;
  const groupChildIds = (memberRows ?? []).map((row) => row.child_id as string);
  const guarded = new Set(guardedChildIds);
  const myChildIdsHere = groupChildIds.filter((id) => guarded.has(id));

  // Not my group (or no such group) — back to my children.
  if (!group || myChildIdsHere.length === 0) {
    redirect("/dashboard");
  }

  const [{ data: childRows }, { data: statusRows }] = await Promise.all([
    supabase.from("children").select("id, name, created_at").in("id", groupChildIds),
    supabase
      .from("current_statuses")
      .select("child_id, place_id, updated_at")
      .in("child_id", groupChildIds),
  ]);

  const statuses = (statusRows ?? []) as CurrentStatus[];

  // Friends' places belong to other families — fetch exactly the places the
  // shown statuses point at.
  const placeIds = Array.from(
    new Set(
      statuses
        .map((row) => row.place_id)
        .filter((id): id is string => !!id)
    )
  );
  const { data: placeRows } =
    placeIds.length > 0
      ? await supabase
          .from("places")
          .select("id, created_by, name, icon_name, created_at")
          .in("id", placeIds)
      : { data: [] };
  const places = (placeRows ?? []) as Place[];

  const childrenById = new Map(
    ((childRows ?? []) as Child[]).map((child) => [child.id, child])
  );
  const statusByChild = new Map(statuses.map((row) => [row.child_id, row]));

  const toView = (childId: string): ChildStatusView | null => {
    const child = childrenById.get(childId);
    if (!child) return null;
    const status = statusByChild.get(childId);
    return {
      childId,
      childName: child.name,
      placeId: status?.place_id ?? null,
      updatedAt: status?.updated_at ?? null,
    };
  };

  // Group order = join order.
  const myChildren = myChildIdsHere
    .map(toView)
    .filter((view): view is ChildStatusView => !!view);
  const friends = groupChildIds
    .filter((id) => !guarded.has(id))
    .map(toView)
    .filter((view): view is ChildStatusView => !!view);

  // Attribute the shared link to my active child if it's here, else to my
  // first child in this group ("지훈이네가 초대했어요").
  const activeChildId =
    (userRow?.active_child_id as string | null | undefined) ?? null;
  const inviterChildId =
    activeChildId && myChildIdsHere.includes(activeChildId)
      ? activeChildId
      : myChildIdsHere[0];
  const inviteUrl = buildInviteUrl(group.invite_code, inviterChildId);

  return (
    <main className="min-h-screen bg-yellow-50 px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 rounded-full border-4 border-gray-800 bg-white px-3 py-1 font-jua text-sm text-blue-900 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95"
          >
            <ArrowLeft size={16} strokeWidth={3} aria-hidden />
            돌아가기
          </Link>
          <p className="font-jua text-xl text-pink-700">나랑 놀자 🎈</p>
        </header>

        <div className="flex items-center gap-3 rounded-2xl border-4 border-gray-800 bg-yellow-100 p-3 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-300 shadow-md shadow-yellow-200">
            <Users size={20} strokeWidth={2.5} className="text-yellow-900" />
          </span>
          <h1 className="min-w-0 flex-1 truncate font-jua text-2xl text-pink-700">
            {group.name}
          </h1>
          <InviteCopyButton groupName={group.name} inviteUrl={inviteUrl} />
        </div>

        <RealtimeStatusList
          key={group.id}
          myChildren={myChildren}
          friends={friends}
          places={places}
        />
      </div>
    </main>
  );
}
