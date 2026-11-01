"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  RealtimeChannel,
  RealtimePostgresInsertPayload,
} from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  addIncomingMessage,
  conversationKeyForRow,
  toUnreadMap,
  totalUnread,
  type UnreadMap,
} from "@/lib/unread";

type MessageTable = "group_messages" | "direct_messages";

interface MessageInsertRow {
  user_id?: string;
  group_id?: string | null;
  child_low?: string | null;
  child_high?: string | null;
}

const TABLES: MessageTable[] = ["group_messages", "direct_messages"];

/**
 * Live unread counts for the dashboard badges, starting from the server's
 * unread_counts(). New group/1:1 messages from others (Realtime; RLS keeps
 * it to my conversations) add one; the counts are refetched whenever the
 * page comes back into view or the channel (re)joins — which also clears
 * badges after reading a chat, even when the router serves a cached page.
 *
 * `initial` null means the counts aren't available (migration 0014 not
 * applied, or the lookup failed): no badges, and live messages don't
 * create any until a refetch succeeds. The app icon badge mirrors the
 * total where supported.
 */
export function useUnreadCounts(
  initial: UnreadMap | null,
  myUserId: string
): UnreadMap | null {
  const [counts, setCounts] = useState<UnreadMap | null>(initial);

  // Fresh server data (router.refresh, child switch) replaces local state.
  useEffect(() => {
    setCounts(initial);
  }, [initial]);

  const inFlight = useRef<Promise<void> | null>(null);
  const refetch = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    const run = (async () => {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase.rpc("unread_counts");
        setCounts(error ? null : toUnreadMap(data));
      } catch {
        // Offline: keep what is shown; the next return refetches.
      } finally {
        inFlight.current = null;
      }
    })();
    inFlight.current = run;
    return run;
  }, []);

  useEffect(() => {
    const supabase = createBrowserClient();
    let disposed = false;
    let channel: RealtimeChannel | null = null;

    const onInsert =
      (table: MessageTable) =>
      (payload: RealtimePostgresInsertPayload<MessageInsertRow>) => {
        const row = payload.new;
        setCounts((current) =>
          current
            ? addIncomingMessage(
                current,
                conversationKeyForRow(table, row),
                row.user_id,
                myUserId
              )
            : current
        );
      };

    (async () => {
      // The socket must carry the user's token, or RLS filters every row.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (disposed) return;
      if (session) supabase.realtime.setAuth(session.access_token);

      let next = supabase.channel(
        `unread-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      );
      for (const table of TABLES) {
        next = next.on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table },
          onInsert(table)
        );
      }
      channel = next.subscribe((status) => {
        // Covers anything sent between the server render and the join.
        if (!disposed && status === "SUBSCRIBED") void refetch();
      });
    })();

    function onReturn() {
      if (!disposed && document.visibilityState === "visible") void refetch();
    }
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    window.addEventListener("pageshow", onReturn);
    window.addEventListener("online", onReturn);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
      window.removeEventListener("pageshow", onReturn);
      window.removeEventListener("online", onReturn);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [myUserId, refetch]);

  // App icon badge (installed PWA, where supported).
  useEffect(() => {
    if (!counts) return;
    const total = totalUnread(counts);
    const nav = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    try {
      if (total > 0) void nav.setAppBadge?.(total)?.catch(() => {});
      else void nav.clearAppBadge?.()?.catch(() => {});
    } catch {
      // Unsupported or not allowed: the in-page badges are enough.
    }
  }, [counts]);

  return counts;
}
