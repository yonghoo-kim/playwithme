import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Bell, Baby, PartyPopper, Users } from "lucide-react";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { buildInviteUrl } from "@/lib/inviteUrl";
import GroupListWithInvites from "@/components/GroupListWithInvites";
import NotificationSettingsToggle from "@/components/NotificationSettingsToggle";
import CreateGroupForm from "./CreateGroupForm";
import GroupChildManager from "./GroupChildManager";
import type { Child, Group } from "@/types/db";

function SectionHeading({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <h2 className="flex items-center gap-2 font-jua text-xl text-pink-700">
      {icon}
      {title}
    </h2>
  );
}

export default async function SettingsPage() {
  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = createServiceClient();

  const [{ data: membershipRows }, { data: guardianRows }] = await Promise.all([
    supabase
      .from("group_members")
      .select("group_id, joined_at")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true }),
    supabase.from("child_guardians").select("child_id").eq("user_id", user.id),
  ]);

  const groupIds = (membershipRows ?? []).map((row) => row.group_id as string);
  const myChildIds = new Set(
    (guardianRows ?? []).map((row) => row.child_id as string)
  );

  const [{ data: groupRows }, { data: childRows }] =
    groupIds.length > 0
      ? await Promise.all([
          supabase
            .from("groups")
            .select("id, name, invite_code")
            .in("id", groupIds),
          supabase
            .from("children")
            .select("id, group_id, name, created_at")
            .in("group_id", groupIds)
            .order("created_at", { ascending: true }),
        ])
      : [{ data: [] }, { data: [] }];

  const groupsById = new Map(
    ((groupRows ?? []) as Pick<Group, "id" | "name" | "invite_code">[]).map(
      (group) => [group.id, group]
    )
  );
  // Keep membership (joined_at) order.
  const groups = groupIds
    .map((id) => groupsById.get(id))
    .filter((group): group is Pick<Group, "id" | "name" | "invite_code"> =>
      !!group
    );
  const children = (childRows ?? []) as Child[];

  // Attribute each group's link to the first child I guard there (if any).
  const groupsWithInvites = groups.map((group) => {
    const myFirstChild = children.find(
      (child) => child.group_id === group.id && myChildIds.has(child.id)
    );
    return {
      id: group.id,
      name: group.name,
      inviteUrl: buildInviteUrl(group.invite_code, myFirstChild?.id),
    };
  });

  return (
    <main className="min-h-screen bg-yellow-50 px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center gap-3">
          {groups.length > 0 && (
            <Link
              href="/dashboard"
              aria-label="대시보드로 돌아가기"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-gray-800 bg-white shadow-md shadow-pink-200 transition-transform hover:scale-105 active:scale-95"
            >
              <ArrowLeft size={18} strokeWidth={3} className="text-pink-700" />
            </Link>
          )}
          <h1 className="text-2xl font-jua text-pink-700">설정 ⚙️</h1>
        </div>

        <section className="flex flex-col gap-3">
          <SectionHeading
            icon={
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-200 shadow-md shadow-yellow-200">
                <Users size={16} strokeWidth={2.5} className="text-yellow-800" />
              </span>
            }
            title="내 그룹"
          />
          <GroupListWithInvites groups={groupsWithInvites} />
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeading
            icon={
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-200 shadow-md shadow-pink-200">
                <PartyPopper
                  size={16}
                  strokeWidth={2.5}
                  className="text-pink-800"
                />
              </span>
            }
            title="새 그룹 만들기"
          />
          <CreateGroupForm />
        </section>

        {groups.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionHeading
              icon={
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-200 shadow-md shadow-blue-200">
                  <Baby size={16} strokeWidth={2.5} className="text-blue-800" />
                </span>
              }
              title="내 아이들 · 아이 추가/연결"
            />
            {groups.map((group) => {
              const groupChildren = children.filter(
                (child) => child.group_id === group.id
              );
              return (
                <GroupChildManager
                  key={group.id}
                  groupId={group.id}
                  groupName={group.name}
                  myChildren={groupChildren
                    .filter((child) => myChildIds.has(child.id))
                    .map(({ id, name }) => ({ id, name }))}
                  joinableChildren={groupChildren
                    .filter((child) => !myChildIds.has(child.id))
                    .map(({ id, name }) => ({ id, name }))}
                />
              );
            })}
          </section>
        )}

        <section className="flex flex-col gap-3">
          <SectionHeading
            icon={
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-200 shadow-md shadow-green-200">
                <Bell size={16} strokeWidth={2.5} className="text-green-800" />
              </span>
            }
            title="알림"
          />
          <NotificationSettingsToggle />
        </section>
      </div>
    </main>
  );
}
