import { redirect } from "next/navigation";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { directChatTitle } from "@/lib/chat";
import {
  getDirectChatAccess,
  loadDirectMessages,
  loadFamilyLabels,
} from "@/lib/chatAccess";
import ChatRoom from "../../ChatRoom";

// Always render from the database: never serve a cached copy of the chat.
export const dynamic = "force-dynamic";

/**
 * 1:1 chat between my child's family and a friend child's family. `?child=`
 * says which of my children (pushes carry it); otherwise the active child,
 * as long as it shares a group with the friend.
 */
export default async function DirectChatPage({
  params,
  searchParams,
}: {
  params: { friendChildId: string };
  searchParams: { child?: string | string[] };
}) {
  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const requested =
    typeof searchParams.child === "string" ? searchParams.child : null;
  const supabase = createServiceClient();
  const access = await getDirectChatAccess(
    supabase,
    user.id,
    params.friendChildId,
    requested
  );
  if (!access) {
    redirect("/dashboard");
  }

  const [messages, { labels, names }] = await Promise.all([
    loadDirectMessages(supabase, access.low, access.high),
    loadFamilyLabels(supabase, [access.myChildId, access.friendChildId]),
  ]);

  return (
    <ChatRoom
      conversation={{
        kind: "direct",
        childId: access.myChildId,
        friendChildId: access.friendChildId,
      }}
      title={directChatTitle(names[access.friendChildId] ?? "친구")}
      backHref="/dashboard"
      myUserId={user.id}
      initialMessages={messages}
      familyLabels={labels}
    />
  );
}
