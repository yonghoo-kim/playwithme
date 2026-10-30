import { redirect } from "next/navigation";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { getGuardedChildIds } from "@/lib/childAccess";
import { familyLabel } from "@/lib/chat";
import ChatRoom, { type ChatMessage } from "./ChatRoom";

const PAGE_SIZE = 50;

/**
 * A group's chat. Only families with a child in the group get in; the last
 * 50 messages render on the server, new ones arrive live in ChatRoom.
 */
export default async function ChatPage({
  params,
}: {
  params: { groupId: string };
}) {
  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = createServiceClient();
  const groupId = params.groupId;

  const [guarded, { data: group }, { data: memberRows }, { data: messageRows }] =
    await Promise.all([
      getGuardedChildIds(supabase, user.id),
      supabase.from("groups").select("id, name").eq("id", groupId).maybeSingle(),
      supabase.from("child_groups").select("child_id").eq("group_id", groupId),
      supabase
        .from("group_messages")
        .select("id, user_id, child_id, body, created_at")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE),
    ]);

  const memberChildIds = (memberRows ?? []).map((row) => row.child_id as string);
  const guardedSet = new Set(guarded);
  if (!group || !memberChildIds.some((id) => guardedSet.has(id))) {
    redirect("/dashboard");
  }

  const messages: ChatMessage[] = (
    (messageRows ?? []) as {
      id: string;
      user_id: string;
      child_id: string | null;
      body: string;
      created_at: string;
    }[]
  )
    .reverse()
    .map((row) => ({
      id: row.id,
      userId: row.user_id,
      childId: row.child_id,
      body: row.body,
      createdAt: row.created_at,
    }));

  // Family labels for everyone in the group now, plus past senders.
  const labelChildIds = Array.from(
    new Set([
      ...memberChildIds,
      ...messages.map((m) => m.childId).filter((id): id is string => !!id),
    ])
  );
  const { data: childRows } =
    labelChildIds.length > 0
      ? await supabase.from("children").select("id, name").in("id", labelChildIds)
      : { data: [] };
  const familyLabels: Record<string, string> = {};
  for (const child of (childRows ?? []) as { id: string; name: string }[]) {
    familyLabels[child.id] = familyLabel(child.name);
  }

  return (
    <ChatRoom
      groupId={group.id as string}
      groupName={group.name as string}
      myUserId={user.id}
      initialMessages={messages}
      familyLabels={familyLabels}
    />
  );
}
