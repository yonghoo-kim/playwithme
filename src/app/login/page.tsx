import type { Metadata } from "next";
import { getInviteContext } from "@/lib/inviteContext";
import { inviteMetadata } from "@/lib/inviteMetadata";
import { firstParam } from "@/lib/inviteQuery";
import { safeNextPath } from "@/lib/safeNext";
import InviteBanner from "../InviteBanner";
import LoginForm from "./LoginForm";

// A logged-out invite link lands here, so link previews read these tags.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}): Promise<Metadata> {
  const code = firstParam(searchParams.invite);
  return inviteMetadata(
    code ? await getInviteContext(code, firstParam(searchParams.from)) : null
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const inviteParam = firstParam(searchParams.invite);
  const fromParam = firstParam(searchParams.from);
  const nextPath = safeNextPath(firstParam(searchParams.next));

  // Only carry an invite through if the code is real.
  const invite = inviteParam
    ? await getInviteContext(inviteParam, fromParam)
    : null;

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {invite && <InviteBanner invite={invite} />}
        <LoginForm
          inviteCode={invite?.code ?? null}
          fromChildId={invite ? fromParam : null}
          nextPath={nextPath}
        />
      </div>
    </main>
  );
}
