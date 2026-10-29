import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { buildInviteUrl } from "@/lib/inviteUrl";
import ChildSwitcher, { type SwitcherChild } from "@/components/ChildSwitcher";
import RealtimeStatusList, {
  type ChildStatusView,
} from "@/components/RealtimeStatusList";
import InviteCopyButton from "./InviteCopyButton";
import NotificationNudge from "./NotificationNudge";
import type { Child, CurrentStatus, Group, Place } from "@/types/db";

/**
 * Child-first dashboard: the active child decides the group. Lists every
 * child the user guards (all groups) in the switcher, then shows the active
 * child's group split into "내 아이" (with status controls) and "친구들"
 * (read-only) — rendered live by `RealtimeStatusList`.
 */
export default async function DashboardPage() {
  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = createServiceClient();

  const [{ data: membershipRows }, { data: guardianRows }, { data: userRow }] =
    await Promise.all([
      supabase.from("group_members").select("group_id").eq("user_id", user.id),
      supabase.from("child_guardians").select("child_id").eq("user_id", user.id),
      supabase
        .from("users")
        .select("active_child_id")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

  const memberGroupIds = new Set(
    (membershipRows ?? []).map((row) => row.group_id as string)
  );

  // No group at all — Settings is where you create or join one.
  if (memberGroupIds.size === 0) {
    redirect("/settings");
  }

  const guardedChildIds = (guardianRows ?? []).map(
    (row) => row.child_id as string
  );

  const { data: guardedChildRows } =
    guardedChildIds.length > 0
      ? await supabase
          .from("children")
          .select("id, group_id, name, created_at")
          .in("id", guardedChildIds)
          .order("created_at", { ascending: true })
      : { data: [] as Child[] };

  // Only children in groups the user is still a member of.
  const myAllChildren = ((guardedChildRows ?? []) as Child[]).filter((child) =>
    memberGroupIds.has(child.group_id)
  );

  // Groups but no child anywhere — add/join one per group in Settings.
  if (myAllChildren.length === 0) {
    redirect("/settings");
  }

  const storedActiveId =
    (userRow?.active_child_id as string | null | undefined) ?? null;
  const activeChild =
    myAllChildren.find((child) => child.id === storedActiveId) ??
    myAllChildren[0];

  if (activeChild.id !== storedActiveId) {
    // Persist the fallback so it sticks. Non-fatal: the page still renders
    // with the fallback even if this write fails.
    const { error: persistError } = await supabase
      .from("users")
      .update({ active_child_id: activeChild.id })
      .eq("id", user.id);
    if (persistError) {
      console.error("Failed to persist active child", persistError.message);
    }
  }

  const groupId = activeChild.group_id;
  const switcherGroupIds = Array.from(
    new Set(myAllChildren.map((child) => child.group_id))
  );

  const [
    { data: groupRows },
    { data: groupChildRows },
    { data: placeRows },
    { data: statusRows },
  ] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, invite_code")
      .in("id", switcherGroupIds),
    supabase
      .from("children")
      .select("id, group_id, name, created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true }),
    supabase
      .from("places")
      .select("id, group_id, name, icon_name, created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true }),
    supabase
      .from("current_statuses")
      .select("child_id, group_id, place_id, updated_at")
      .eq("group_id", groupId),
  ]);

  const groupsById = new Map(
    ((groupRows ?? []) as Pick<Group, "id" | "name" | "invite_code">[]).map(
      (group) => [group.id, group]
    )
  );
  const activeGroup = groupsById.get(groupId);
  const activeGroupName = activeGroup?.name ?? "우리 그룹";

  const switcherChildren: SwitcherChild[] = myAllChildren.map((child) => ({
    id: child.id,
    name: child.name,
    groupId: child.group_id,
    groupName: groupsById.get(child.group_id)?.name ?? "",
  }));

  const groupChildren = (groupChildRows ?? []) as Child[];
  const groupPlaces = (placeRows ?? []) as Place[];
  const statusByChild = new Map(
    ((statusRows ?? []) as CurrentStatus[]).map((row) => [row.child_id, row])
  );
  const myChildIdSet = new Set(myAllChildren.map((child) => child.id));

  const toView = (child: Child): ChildStatusView => {
    const status = statusByChild.get(child.id);
    return {
      childId: child.id,
      childName: child.name,
      placeId: status?.place_id ?? null,
      updatedAt: status?.updated_at ?? null,
    };
  };

  // Only the switched-to child is shown as "내 아이"; my other children in
  // this group are reached through the switcher, not listed here.
  const myChildrenHere = groupChildren
    .filter((child) => child.id === activeChild.id)
    .map(toView);
  const hiddenMyChildIds = groupChildren
    .filter((child) => child.id !== activeChild.id && myChildIdSet.has(child.id))
    .map((child) => child.id);
  const friends = groupChildren
    .filter((child) => !myChildIdSet.has(child.id))
    .map(toView);

  const inviteUrl = activeGroup ? buildInviteUrl(activeGroup.invite_code) : null;

  return (
    <main className="min-h-screen bg-yellow-50 px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <p className="font-jua text-xl text-pink-700">나랑 놀자 🎈</p>
          <Link
            href="/settings"
            className="flex items-center rounded-full border-4 border-gray-800 bg-white px-3 py-1 font-jua text-sm text-blue-900 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-110 hover:-translate-y-1 active:scale-90 active:rotate-3"
          >
            설정 ⚙️
          </Link>
        </header>

        <NotificationNudge />

        <ChildSwitcher
          myChildren={switcherChildren}
          activeChildId={activeChild.id}
        />

        <div className="flex items-center gap-3 rounded-2xl border-4 border-gray-800 bg-yellow-100 p-3 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-300 shadow-md shadow-yellow-200">
            <Users size={20} strokeWidth={2.5} className="text-yellow-900" />
          </span>
          <h1 className="min-w-0 flex-1 truncate font-jua text-2xl text-pink-700">
            {activeGroupName}
          </h1>
          {inviteUrl && (
            <InviteCopyButton
              groupName={activeGroupName}
              inviteUrl={inviteUrl}
            />
          )}
        </div>

        <RealtimeStatusList
          key={activeChild.id}
          groupId={groupId}
          myChildren={myChildrenHere}
          friends={friends}
          hiddenChildIds={hiddenMyChildIds}
          groupPlaces={groupPlaces}
        />
      </div>
    </main>
  );
}
