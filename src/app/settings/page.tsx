import AppHeader from "@/components/AppHeader";
import { redirect } from "next/navigation";
import { Baby, Bell, UserPlus } from "lucide-react";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { getGuardedChildIds } from "@/lib/childAccess";
import NotificationSettingsToggle from "@/components/NotificationSettingsToggle";
import MyChildCard from "./MyChildCard";
import AddChildForm from "./AddChildForm";

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

/**
 * Settings: the children I guard (with their groups and a guardian invite
 * link each), adding a child, and notifications. Only ever shows MY
 * children — never another family's child, and no group/child "connect"
 * controls. Having children but no groups is normal here.
 */
export default async function SettingsPage() {
  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = createServiceClient();
  const childIds = await getGuardedChildIds(supabase, user.id);

  const [{ data: childRows }, { data: childGroupRows }] =
    childIds.length > 0
      ? await Promise.all([
          supabase
            .from("children")
            .select("id, name, created_at")
            .in("id", childIds)
            .order("created_at", { ascending: true }),
          supabase
            .from("child_groups")
            .select("child_id, group_id, joined_at")
            .in("child_id", childIds)
            .order("joined_at", { ascending: true }),
        ])
      : [{ data: [] }, { data: [] }];

  const links = (childGroupRows ?? []) as {
    child_id: string;
    group_id: string;
  }[];
  const groupIds = Array.from(new Set(links.map((row) => row.group_id)));

  const { data: groupRows } =
    groupIds.length > 0
      ? await supabase.from("groups").select("id, name").in("id", groupIds)
      : { data: [] };

  const groupNameById = new Map(
    ((groupRows ?? []) as { id: string; name: string }[]).map((group) => [
      group.id,
      group.name,
    ])
  );

  const myChildren = ((childRows ?? []) as { id: string; name: string }[]).map(
    (child) => ({
      id: child.id,
      name: child.name,
      groups: links
        .filter((row) => row.child_id === child.id)
        .map((row) => ({
          id: row.group_id,
          name: groupNameById.get(row.group_id),
        }))
        .filter((group): group is { id: string; name: string } => !!group.name),
    })
  );

  return (
    <AppHeader>
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <h1 className="sr-only">설정</h1>

        <section className="flex flex-col gap-3">
          <SectionHeading
            icon={
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-200 shadow-md shadow-blue-200">
                <Baby size={16} strokeWidth={2.5} className="text-blue-800" />
              </span>
            }
            title="내 아이들"
          />
          {myChildren.length === 0 ? (
            <p className="rounded-2xl border-4 border-gray-800 bg-white p-4 text-center text-sm font-bold text-blue-900 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
              아직 등록된 아이가 없어요. 아래에서 아이를 추가해주세요 👶
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {myChildren.map((child) => (
                <li key={child.id}>
                  <MyChildCard
                    childId={child.id}
                    name={child.name}
                    groups={child.groups}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeading
            icon={
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-200 shadow-md shadow-pink-200">
                <UserPlus size={16} strokeWidth={2.5} className="text-pink-800" />
              </span>
            }
            title="아이 추가"
          />
          <AddChildForm />
        </section>

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
    </AppHeader>
  );
}
