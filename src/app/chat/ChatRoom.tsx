"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import type {
  RealtimeChannel,
  RealtimePostgresInsertPayload,
} from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase/client";
import FcmTokenSync from "@/components/FcmTokenSync";
import {
  MAX_MESSAGE_LENGTH,
  QUICK_MESSAGES,
  directPair,
  mergeMessages,
  normalizeMessage,
  toChatMessage,
  type ChatMessage,
  type ChatMessageRow,
} from "@/lib/chat";

export type { ChatMessage };

/** Which conversation the screen shows (serializable: built on the server). */
export type ChatConversation =
  | { kind: "group"; groupId: string }
  | {
      kind: "direct";
      /** My child this conversation is for. */
      childId: string;
      friendChildId: string;
    };

interface ChatRoomProps {
  conversation: ChatConversation;
  /** Header text, e.g. the group name or "지훈이네와 채팅". */
  title: string;
  backHref: string;
  myUserId: string;
  initialMessages: ChatMessage[];
  /** child id -> "지훈이네" */
  familyLabels: Record<string, string>;
}

type RealtimeRow = ChatMessageRow & { child_high?: string };

const timeFormat = new Intl.DateTimeFormat("ko-KR", {
  hour: "numeric",
  minute: "2-digit",
});
const dayFormat = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "short",
});

/** Retry delay after the live channel drops (only while on screen). */
const RECONNECT_MS = 3000;

/**
 * Chat screen for a group or a 1:1 conversation: messages (mine on the
 * right), a date line when the day changes, one-tap quick questions and an
 * input. Sending goes through the API (which also notifies the others).
 *
 * Staying current: Realtime only delivers rows inserted while the socket is
 * joined — nothing missed while the phone slept or the PWA sat in the
 * background is replayed. So the screen also refetches the newest messages
 * from the API every time the channel (re)joins and whenever the app comes
 * back (visible / focus / online / pageshow), rejoins a dropped channel, and
 * merges everything by id.
 */
export default function ChatRoom({
  conversation,
  title,
  backHref,
  myUserId,
  initialMessages,
  familyLabels,
}: ChatRoomProps) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  // Primitive keys so a server re-render (new `conversation` object) does
  // not tear down the live channel.
  const kind = conversation.kind;
  const primaryId =
    conversation.kind === "group" ? conversation.groupId : conversation.childId;
  const friendChildId =
    conversation.kind === "direct" ? conversation.friendChildId : "";

  const api = useMemo(() => {
    if (kind === "group") {
      return {
        endpoint: "/api/groups/messages",
        query: new URLSearchParams({ groupId: primaryId }).toString(),
        sendFields: { groupId: primaryId } as Record<string, string>,
        table: "group_messages",
        filter: `group_id=eq.${primaryId}`,
        matches: (row: RealtimeRow) => !!row,
      };
    }
    const { low, high } = directPair(primaryId, friendChildId);
    return {
      endpoint: "/api/direct/messages",
      query: new URLSearchParams({ childId: primaryId, friendChildId }).toString(),
      sendFields: { childId: primaryId, friendChildId } as Record<string, string>,
      table: "direct_messages",
      // Realtime filters on one column; the other half of the pair is
      // checked here.
      filter: `child_low=eq.${low}`,
      matches: (row: RealtimeRow) => row.child_high === high,
    };
  }, [kind, primaryId, friendChildId]);

  const labelsRef = useRef(familyLabels);
  labelsRef.current = familyLabels;
  const refreshedFor = useRef(new Set<string>());

  const addMessages = useCallback(
    (incoming: ChatMessage[]) => {
      if (incoming.length === 0) return;
      setMessages((current) => mergeMessages(current, incoming));
      // A family that joined after this page loaded: fetch its label (once).
      const unknown = incoming.some(
        (m) =>
          m.childId &&
          !labelsRef.current[m.childId] &&
          !refreshedFor.current.has(m.childId)
      );
      if (unknown) {
        incoming.forEach((m) => m.childId && refreshedFor.current.add(m.childId));
        router.refresh();
      }
    },
    [router]
  );

  // A server re-render (router.refresh) brings fresh initial messages.
  useEffect(() => {
    setMessages((current) => mergeMessages(current, initialMessages));
  }, [initialMessages]);

  // Catch up from the API. One request at a time; overlapping triggers
  // (focus + visibilitychange fire together) share it.
  const inFlight = useRef<Promise<void> | null>(null);
  const fetchLatest = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    const run = (async () => {
      try {
        const res = await fetch(`${api.endpoint}?${api.query}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { messages?: ChatMessage[] };
        if (Array.isArray(data.messages)) addMessages(data.messages);
      } catch {
        // Offline: the `online` event triggers another try.
      } finally {
        inFlight.current = null;
      }
    })();
    inFlight.current = run;
    return run;
  }, [api, addMessages]);

  const fetchLatestRef = useRef(fetchLatest);
  fetchLatestRef.current = fetchLatest;
  const addMessagesRef = useRef(addMessages);
  addMessagesRef.current = addMessages;

  // Live messages. The socket must carry the user's token before joining,
  // or RLS filters every row out. Every successful join refetches, which
  // also covers the gap between the server render and the first join.
  useEffect(() => {
    const supabase = createBrowserClient();
    let disposed = false;
    let channel: RealtimeChannel | null = null;
    let joined = false;
    let connecting = false;
    let failures = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    async function connect() {
      if (disposed || connecting) return;
      connecting = true;
      clearTimeout(retryTimer);
      try {
        if (channel) {
          const old = channel;
          channel = null;
          joined = false;
          await supabase.removeChannel(old);
        }
        // getSession() refreshes an access token that expired while the
        // app was in the background.
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (disposed) return;
        if (session) supabase.realtime.setAuth(session.access_token);

        const next: RealtimeChannel = supabase
          .channel(`${api.table}-${primaryId}-${Math.random().toString(36).slice(2, 8)}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: api.table, filter: api.filter },
            (payload: RealtimePostgresInsertPayload<RealtimeRow>) => {
              if (api.matches(payload.new)) {
                addMessagesRef.current([toChatMessage(payload.new)]);
              }
            }
          )
          .subscribe((status) => {
            if (disposed || channel !== next) return;
            if (status === "SUBSCRIBED") {
              joined = true;
              failures = 0;
              void fetchLatestRef.current();
            } else {
              // CHANNEL_ERROR / TIMED_OUT / CLOSED: rejoin while on screen
              // (backing off up to 30s); in the background the return
              // handler does it.
              joined = false;
              clearTimeout(retryTimer);
              if (document.visibilityState === "visible") {
                const delay = Math.min(RECONNECT_MS * 2 ** failures, 30000);
                failures += 1;
                retryTimer = setTimeout(() => void connect(), delay);
              }
            }
          });
        channel = next;
      } finally {
        connecting = false;
      }
    }

    function onReturn() {
      if (disposed || document.visibilityState !== "visible") return;
      void fetchLatestRef.current();
      if (!joined || !supabase.realtime.isConnected()) void connect();
    }

    void connect();
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    window.addEventListener("online", onReturn);
    window.addEventListener("pageshow", onReturn);

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
      window.removeEventListener("online", onReturn);
      window.removeEventListener("pageshow", onReturn);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [api, primaryId]);

  // Keep the newest message in view unless the reader scrolled up.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list && stickToBottom.current) list.scrollTop = list.scrollHeight;
  }, [messages]);

  function onScroll() {
    const list = listRef.current;
    if (!list) return;
    stickToBottom.current =
      list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  }

  async function send(text: string) {
    const body = normalizeMessage(text);
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(api.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...api.sendFields, body }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: ChatMessageRow;
        error?: string;
      };
      if (!res.ok || !data.message) {
        setError(data.error ?? "메시지를 보내지 못했어요. 다시 시도해주세요.");
        return;
      }
      stickToBottom.current = true;
      addMessages([toChatMessage(data.message)]);
      setDraft("");
    } catch {
      setError("메시지를 보내지 못했어요. 다시 시도해주세요.");
    } finally {
      setSending(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  return (
    <main className="mx-auto flex h-[100dvh] w-full max-w-md flex-col px-4 pb-3 pt-4">
      <FcmTokenSync />
      <header className="mb-2 flex items-center gap-3">
        <Link
          href={backHref}
          aria-label="홈으로"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-4 border-gray-800 bg-white shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95"
        >
          <ArrowLeft size={20} strokeWidth={2.5} className="text-pink-700" />
        </Link>
        <h1 className="truncate rounded-full bg-white/85 px-4 py-1.5 font-jua text-xl text-pink-700 shadow-sm">
          💬 {title}
        </h1>
      </header>

      <div
        ref={listRef}
        onScroll={onScroll}
        className="flex flex-1 flex-col gap-2 overflow-y-auto overscroll-contain rounded-3xl border-4 border-gray-800 bg-white/70 p-3 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] backdrop-blur-sm"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <p className="m-auto text-center text-sm font-bold text-gray-500">
            첫 메시지를 보내보세요 🎈
            <br />
            아래 버튼으로 바로 물어볼 수도 있어요
          </p>
        )}
        {messages.map((message, index) => {
          const mine = message.userId === myUserId;
          const date = new Date(message.createdAt);
          const previous = messages[index - 1];
          const newDay =
            !previous ||
            new Date(previous.createdAt).toDateString() !== date.toDateString();
          const sameSender =
            !newDay &&
            previous?.userId === message.userId &&
            previous?.childId === message.childId;

          return (
            <div key={message.id} className="flex flex-col">
              {newDay && (
                <p className="my-2 self-center rounded-full bg-gray-100 px-3 py-0.5 text-[11px] font-bold text-gray-500">
                  {dayFormat.format(date)}
                </p>
              )}
              {!mine && !sameSender && (
                <span className="mb-0.5 ml-1 font-jua text-sm text-blue-900">
                  {(message.childId && familyLabels[message.childId]) || "친구네"}
                </span>
              )}
              <div
                className={`flex items-end gap-1.5 ${mine ? "flex-row-reverse" : ""}`}
              >
                <p
                  className={`max-w-[78%] whitespace-pre-wrap break-words rounded-2xl border-2 px-3 py-2 text-[15px] leading-snug ${
                    mine
                      ? "rounded-br-md border-pink-300 bg-pink-200 text-pink-950"
                      : "rounded-bl-md border-gray-200 bg-white text-gray-800"
                  }`}
                >
                  {message.body}
                </p>
                <span className="shrink-0 text-[10px] font-bold text-gray-400">
                  {timeFormat.format(date)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
        {QUICK_MESSAGES.map((quick) => (
          <button
            key={quick}
            type="button"
            disabled={sending}
            onClick={() => void send(quick)}
            className="shrink-0 rounded-full border-2 border-gray-800 bg-yellow-100 px-3 py-1 font-jua text-sm text-yellow-900 transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            {quick}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-1 text-xs font-bold text-red-600">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-2 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void send(draft);
            }
          }}
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="메시지를 입력하세요"
          aria-label="메시지"
          className="max-h-28 min-h-[48px] flex-1 resize-none rounded-2xl border-4 border-gray-800 bg-white px-3 py-2 text-[15px] outline-none"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          aria-label="보내기"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-gray-800 bg-pink-300 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <Send size={20} strokeWidth={2.5} className="text-pink-900" />
        </button>
      </form>
    </main>
  );
}
