import { getInviteContext } from "@/lib/inviteContext";
import { firstParam } from "@/lib/inviteQuery";
import { safeNextPath } from "@/lib/safeNext";
import InviteBanner from "../InviteBanner";
import SignupForm from "./SignupForm";

export default async function SignupPage({
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
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {invite && <InviteBanner invite={invite} />}
        <SignupForm
          inviteCode={invite?.code ?? null}
          fromChildId={invite ? fromParam : null}
          nextPath={nextPath}
        />
      </div>
    </main>
  );
}
