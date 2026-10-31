import { redirect } from "next/navigation";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import {
  getGroupChatAccess,
  loadFamilyLabels,
  loadGroupMessages,
} from "@/lib/chatAccess";
import ChatRoom from "../ChatRoom";

// Always render from the database: never serve a cached copy of the chat.
export const dynamic = "force-dynamic";

/**
 * A group's chat. Only families with a child in the group get in; the last
 * 50 messages render on the server, ChatRoom refetches on open/return and
 * receives new ones live.
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
  const [access, messages] = await Promise.all([
    getGroupChatAccess(supabase, user.id, params.groupId),
    loadGroupMessages(supabase, params.groupId),
  ]);
  if (!access) {
    redirect("/dashboard");
  }

  // Family labels for everyone in the group now, plus past senders.
  const { labels } = await loadFamilyLabels(supabase, [
    ...access.memberChildIds,
    ...messages.map((m) => m.childId).filter((id): id is string => !!id),
  ]);

  return (
    <ChatRoom
      conversation={{ kind: "group", groupId: access.groupId }}
      title={access.groupName}
      backHref={`/dashboard?group=${encodeURIComponent(access.groupId)}`}
      myUserId={user.id}
      initialMessages={messages}
      familyLabels={labels}
    />
  );
}
