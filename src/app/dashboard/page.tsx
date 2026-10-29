import Link from "next/link";
import { redirect } from "next/navigation";
import { Baby, ChevronRight, Users } from "lucide-react";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { familyPlaces, getGuardedChildIds } from "@/lib/childAccess";
import ChildSwitcher from "@/components/ChildSwitcher";
import ActiveChildStatus from "./ActiveChildStatus";
import CreateGroupForm from "./CreateGroupForm";
import NotificationNudge from "./NotificationNudge";
import type { Child, CurrentStatus, Group } from "@/types/db";

/**
 * Child-first dashboard (depth 1): my children as name pills; the active
 * child's live status + place controls; then that child's groups (depth 2),
 * each linking to `/groups/<id>` where the friends are.
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
      supabase
        .from("current_statuses")
        .select("child_id, place_id, updated_at")
        .eq("child_id", activeChild.id)
        .maybeSingle(),
      supabase
        .from("child_groups")
        .select("group_id, joined_at")
        .eq("child_id", activeChild.id)
        .order("joined_at", { ascending: true }),
    ]);

  const groupIds = (membershipRows ?? []).map((row) => row.group_id as string);

  const [{ data: groupRows }, { data: groupChildRows }] =
    groupIds.length > 0
      ? await Promise.all([
          supabase.from("groups").select("id, name").in("id", groupIds),
          supabase
            .from("child_groups")
            .select("group_id")
            .in("group_id", groupIds),
        ])
      : [{ data: [] }, { data: [] }];

  const groupsById = new Map(
    ((groupRows ?? []) as Pick<Group, "id" | "name">[]).map((group) => [
      group.id,
      group,
    ])
  );
  const childCountByGroup = new Map<string, number>();
  for (const row of (groupChildRows ?? []) as { group_id: string }[]) {
    childCountByGroup.set(
      row.group_id,
      (childCountByGroup.get(row.group_id) ?? 0) + 1
    );
  }
  // In the order the child joined them.
  const childGroups = groupIds
    .map((id) => groupsById.get(id))
    .filter((group): group is Pick<Group, "id" | "name"> => !!group);

  const status = statusRow as CurrentStatus | null;

  return (
    <main className="min-h-screen bg-yellow-50 px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <p className="font-jua text-xl text-pink-700">나랑 놀자 🎈</p>
          <Link
            href="/settings"
            className="flex items-center rounded-full border-4 border-gray-800 bg-white px-3 py-1 font-jua text-sm text-blue-900 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95"
          >
            설정 ⚙️
          </Link>
        </header>

        <NotificationNudge />

        <ChildSwitcher
          myChildren={myChildren.map((child) => ({
            id: child.id,
            name: child.name,
          }))}
          activeChildId={activeChild.id}
        />

        <section className="flex flex-col gap-3" aria-labelledby="my-child">
          <h1
            id="my-child"
            className="flex items-center gap-2 font-jua text-2xl text-pink-700"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-200 shadow-md shadow-blue-200">
              <Baby size={18} strokeWidth={2.5} className="text-blue-800" />
            </span>
            {activeChild.name} 지금 어디예요?
          </h1>
          <p className="-mt-1 px-1 text-xs font-bold text-gray-500">
            모든 그룹 친구들에게 똑같이 보여요
          </p>

          <ActiveChildStatus
            key={activeChild.id}
            child={{
              childId: activeChild.id,
              childName: activeChild.name,
              placeId: status?.place_id ?? null,
              updatedAt: status?.updated_at ?? null,
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
            className="flex items-center gap-2 font-jua text-xl text-pink-700"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-300 shadow-md shadow-yellow-200">
              <Users size={16} strokeWidth={2.5} className="text-yellow-900" />
            </span>
            {activeChild.name}의 그룹
          </h2>

          {childGroups.length === 0 ? (
            <p className="rounded-2xl border-4 border-dashed border-gray-300 bg-white/60 p-4 text-center text-sm font-bold text-gray-600">
              아직 그룹이 없어요 — 그룹을 만들거나 초대받아보세요 🎈
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {childGroups.map((group) => (
                <li key={group.id}>
                  <Link
                    href={`/groups/${group.id}`}
                    className="flex items-center gap-3 rounded-2xl border-4 border-gray-800 bg-white p-4 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-200 shadow-md shadow-green-200">
                      <Users
                        size={20}
                        strokeWidth={2.5}
                        className="text-green-900"
                      />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-jua text-lg text-blue-900">
                        {group.name}
                      </span>
                      <span className="text-xs font-bold text-gray-500">
                        아이 {childCountByGroup.get(group.id) ?? 0}명
                      </span>
                    </span>
                    <ChevronRight
                      size={22}
                      strokeWidth={3}
                      className="shrink-0 text-gray-500"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <CreateGroupForm
            key={activeChild.id}
            childId={activeChild.id}
            childName={activeChild.name}
          />
        </section>
      </div>
    </main>
  );
}
