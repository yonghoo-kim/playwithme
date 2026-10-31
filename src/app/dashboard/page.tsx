import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { familyPlaces, getGuardedChildIds } from "@/lib/childAccess";
import { buildInviteUrl } from "@/lib/inviteUrl";
import { firstParam } from "@/lib/inviteQuery";
import type { ChildStatusView } from "@/components/RealtimeStatusList";
import ChildSwitcher from "@/components/ChildSwitcher";
import ActiveChildStatus from "./ActiveChildStatus";
import GroupAccordion, { type AccordionGroup } from "./GroupAccordion";
import NotificationNudge from "./NotificationNudge";
import AppHeader from "@/components/AppHeader";
import WeatherHint from "@/components/WeatherHint";
import PermissionGate from "@/components/PermissionGate";
import type {
  Child,
  ChildGroup,
  CurrentStatus,
  Group,
  Place,
} from "@/types/db";

/**
 * Child-first dashboard (depth 1): my children as name pills; the active
 * child's live status + place controls; then that child's groups (depth 2)
 * as an accordion — tapping a group shows its friends right under it, on
 * this same page.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = createServiceClient();

  const [guardedChildIds, { data: userRow }] = await Promise.all([
    getGuardedChildIds(supabase, user.id),
    supabase
      .from("users")
      .select("active_child_id")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  // No children yet — Settings is where you add one.
  if (guardedChildIds.length === 0) {
    redirect("/settings");
  }

  const { data: childRows } = await supabase
    .from("children")
    .select("id, name, created_at")
    .in("id", guardedChildIds)
    .order("created_at", { ascending: true });

  const myChildren = (childRows ?? []) as Child[];
  if (myChildren.length === 0) {
    redirect("/settings");
  }

  const storedActiveId =
    (userRow?.active_child_id as string | null | undefined) ?? null;
  const activeChild =
    myChildren.find((child) => child.id === storedActiveId) ?? myChildren[0];

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

  const [places, { data: statusRow }, { data: membershipRows }] =
    await Promise.all([
      familyPlaces(supabase, activeChild.id),
      // `*` (not a column list) so this still works before migration 0012
      // adds `going`.
      supabase
        .from("current_statuses")
        .select("*")
        .eq("child_id", activeChild.id)
        .maybeSingle(),
      supabase
        .from("child_groups")
        .select("group_id, joined_at")
        .eq("child_id", activeChild.id)
        .order("joined_at", { ascending: true }),
    ]);

  const groupIds = (membershipRows ?? []).map((row) => row.group_id as string);

  // Every child in any of the active child's groups, in join order.
  const [{ data: groupRows }, { data: groupChildRows }] =
    groupIds.length > 0
      ? await Promise.all([
          supabase
            .from("groups")
            .select("id, name, invite_code")
            .in("id", groupIds),
          supabase
            .from("child_groups")
            .select("group_id, child_id, joined_at")
            .in("group_id", groupIds)
            .order("joined_at", { ascending: true }),
        ])
      : [{ data: [] }, { data: [] }];

  const groupsById = new Map(
    ((groupRows ?? []) as Pick<Group, "id" | "name" | "invite_code">[]).map(
      (group) => [group.id, group]
    )
  );

  // Friends = children in those groups that I don't guard (siblings I guard
  // are never shown as friends).
  const guarded = new Set(guardedChildIds);
  const childIdsByGroup = new Map<string, string[]>();
  for (const row of (groupChildRows ?? []) as Pick<
    ChildGroup,
    "group_id" | "child_id"
  >[]) {
    const ids = childIdsByGroup.get(row.group_id) ?? [];
    ids.push(row.child_id);
    childIdsByGroup.set(row.group_id, ids);
  }
  const friendIds = Array.from(
    new Set(
      ((groupChildRows ?? []) as Pick<ChildGroup, "child_id">[])
        .map((row) => row.child_id)
        .filter((id) => !guarded.has(id))
    )
  );

  const [{ data: friendRows }, { data: friendStatusRows }] =
    friendIds.length > 0
      ? await Promise.all([
          supabase.from("children").select("id, name").in("id", friendIds),
          supabase
            .from("current_statuses")
            .select("*")
            .in("child_id", friendIds),
        ])
      : [{ data: [] }, { data: [] }];

  const friendStatuses = (friendStatusRows ?? []) as CurrentStatus[];

  // Friends' places belong to other families — fetch exactly the places
  // their statuses point at.
  const friendPlaceIds = Array.from(
    new Set(
      friendStatuses
        .map((row) => row.place_id)
        .filter((id): id is string => !!id)
    )
  );
  const { data: friendPlaceRows } =
    friendPlaceIds.length > 0
      ? await supabase
          .from("places")
          .select("id, created_by, name, icon_name, created_at")
          .in("id", friendPlaceIds)
      : { data: [] };
  const friendPlaces = (friendPlaceRows ?? []) as Place[];

  const friendStatusById = new Map(
    friendStatuses.map((row) => [row.child_id, row])
  );
  const friends: ChildStatusView[] = (
    (friendRows ?? []) as Pick<Child, "id" | "name">[]
  ).map((child) => {
    const friendStatus = friendStatusById.get(child.id);
    return {
      childId: child.id,
      childName: child.name,
      placeId: friendStatus?.place_id ?? null,
      updatedAt: friendStatus?.updated_at ?? null,
      going: friendStatus?.going === true,
    };
  });

  // In the order the child joined them. The active child is in every one,
  // so invites are attributed to it ("지훈이네가 초대했어요").
  const childGroups: AccordionGroup[] = groupIds
    .map((id) => groupsById.get(id))
    .filter(
      (group): group is Pick<Group, "id" | "name" | "invite_code"> => !!group
    )
    .map((group) => {
      const memberIds = childIdsByGroup.get(group.id) ?? [];
      return {
        id: group.id,
        name: group.name,
        childCount: memberIds.length,
        inviteUrl: buildInviteUrl(group.invite_code, activeChild.id),
        friendIds: memberIds.filter((id) => !guarded.has(id)),
      };
    });

  // `?group=<id>` (after creating/joining) opens that group if it is one of
  // the active child's; otherwise a lone group starts open.
  const requestedGroupId = firstParam(searchParams.group);
  const focusGroupId =
    requestedGroupId && childGroups.some((g) => g.id === requestedGroupId)
      ? requestedGroupId
      : null;
  const initialOpenIds = focusGroupId
    ? [focusGroupId]
    : childGroups.length === 1
      ? [childGroups[0].id]
      : [];

  const status = statusRow as CurrentStatus | null;

  return (
    <AppHeader
      lead={
        <ChildSwitcher
          myChildren={myChildren.map((child) => ({
            id: child.id,
            name: child.name,
          }))}
          activeChildId={activeChild.id}
        />
      }
      aside={<NotificationNudge />}
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <WeatherHint />
        <PermissionGate />

        <section className="flex flex-col gap-3" aria-labelledby="my-child">
          <h1 id="my-child" className="sr-only">
            {activeChild.name} 지금 어디예요?
          </h1>
          <ActiveChildStatus
            key={activeChild.id}
            child={{
              childId: activeChild.id,
              childName: activeChild.name,
              placeId: status?.place_id ?? null,
              updatedAt: status?.updated_at ?? null,
              going: status?.going === true,
            }}
            places={places}
          />
        </section>

        <section
          className="mt-2 flex flex-col gap-3"
          aria-labelledby="child-groups"
        >
          <h2
            id="child-groups"
            className="on-sky flex items-center gap-2 font-jua text-xl text-pink-700"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-300 shadow-md shadow-yellow-200">
              <Users size={16} strokeWidth={2.5} className="text-yellow-900" />
            </span>
            그룹
          </h2>

          {childGroups.length === 0 ? (
            <p className="rounded-2xl border-4 border-dashed border-gray-300 bg-white/60 p-4 text-center text-sm font-bold text-gray-600">
              아직 그룹이 없어요 — 설정에서 그룹을 만들거나 초대받아보세요 🎈
            </p>
          ) : (
            // Keyed per child so a switch never keeps the previous child's
            // groups. Groups are view-only here; managing them is in 설정.
            <GroupAccordion
              key={`groups-${activeChild.id}`}
              groups={childGroups}
              friends={friends}
              places={friendPlaces}
              initialOpenIds={initialOpenIds}
              focusGroupId={focusGroupId}
            />
          )}
        </section>
      </div>
    </AppHeader>
  );
}
