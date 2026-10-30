"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase/client";
import FcmTokenSync from "@/components/FcmTokenSync";
import { MAX_MESSAGE_LENGTH, QUICK_MESSAGES, normalizeMessage } from "@/lib/chat";

export interface ChatMessage {
  id: string;
  userId: string;
  childId: string | null;
  body: string;
  createdAt: string;
}

interface MessageRow {
  id: string;
  group_id: string;
  user_id: string;
  child_id: string | null;
  body: string;
  created_at: string;
}

interface ChatRoomProps {
  groupId: string;
  groupName: string;
  myUserId: string;
  initialMessages: ChatMessage[];
  /** child id -> "지훈이네" */
  familyLabels: Record<string, string>;
}

const timeFormat = new Intl.DateTimeFormat("ko-KR", {
  hour: "numeric",
  minute: "2-digit",
});
const dayFormat = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "short",
});

function fromRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    userId: row.user_id,
    childId: row.child_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

/**
 * Group chat screen: messages (mine on the right), a date line when the day
 * changes, one-tap quick questions and an input. New messages arrive via
 * Supabase Realtime (RLS limits them to my groups); sending goes through
 * `/api/groups/messages`, which also notifies the other families.
 */
export default function ChatRoom({
  groupId,
  groupName,
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

  const addMessage = useCallback(
    (message: ChatMessage) => {
      setMessages((current) =>
        current.some((m) => m.id === message.id) ? current : [...current, message]
      );
      // A family that joined after this page loaded: fetch its label.
      if (message.childId && !familyLabels[message.childId]) {
        router.refresh();
      }
    },
    [familyLabels, router]
  );

  // Live messages for this group. The socket must carry the user's token
  // before joining, or RLS filters every row out.
  useEffect(() => {
    const supabase = createBrowserClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);
      channel = supabase
        .channel(`chat-${groupId}-${Math.random().toString(36).slice(2, 8)}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "group_messages",
            filter: `group_id=eq.${groupId}`,
          },
          (payload: RealtimePostgresInsertPayload<MessageRow>) =>
            addMessage(fromRow(payload.new))
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [groupId, addMessage]);

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
      const res = await fetch("/api/groups/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, body }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: MessageRow;
        error?: string;
      };
      if (!res.ok || !data.message) {
        setError(data.error ?? "메시지를 보내지 못했어요. 다시 시도해주세요.");
        return;
      }
      stickToBottom.current = true;
      addMessage(fromRow(data.message));
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
          href={`/dashboard?group=${encodeURIComponent(groupId)}`}
          aria-label="홈으로"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-4 border-gray-800 bg-white shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95"
        >
          <ArrowLeft size={20} strokeWidth={2.5} className="text-pink-700" />
        </Link>
        <h1 className="truncate rounded-full bg-white/85 px-4 py-1.5 font-jua text-xl text-pink-700 shadow-sm">
          💬 {groupName}
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
                  {(message.childId && familyLabels[message.childId]) ?? "친구네"}
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
