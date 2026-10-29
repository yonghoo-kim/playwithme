import { PartyPopper, Users } from "lucide-react";
import type { InviteContext } from "@/lib/inviteContext";

/** "○○네가 ○○ 그룹에 초대했어요" banner shown above login/signup. */
export default function InviteBanner({
  invite,
}: {
  invite: Pick<InviteContext, "groupName" | "inviterLabel">;
}) {
  const { groupName, inviterLabel } = invite;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl border-4 border-gray-800 bg-pink-100 p-3 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-300 shadow-md shadow-pink-200">
        {inviterLabel ? (
          <PartyPopper size={22} strokeWidth={2.5} className="text-pink-900" />
        ) : (
          <Users size={22} strokeWidth={2.5} className="text-pink-900" />
        )}
      </span>
      <p className="min-w-0 flex-1 break-keep font-jua text-base leading-snug text-gray-800">
        {inviterLabel ? (
          <>
            <span className="text-pink-700">{inviterLabel}</span>가{" "}
            <span className="text-blue-900">{groupName}</span> 그룹에
            초대했어요 🎈
          </>
        ) : (
          <>
            <span className="text-blue-900">{groupName}</span> 그룹에
            초대받았어요 🎈
          </>
        )}
      </p>
    </div>
  );
}
