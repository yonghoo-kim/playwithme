import { getInviteContext } from "@/lib/inviteContext";
import { firstParam } from "@/lib/inviteQuery";
import InviteBanner from "../InviteBanner";
import LoginForm from "./LoginForm";

/**
 * Only same-origin relative paths are allowed as a post-login destination:
 * must start with "/", must not start with "//" (protocol-relative), and
 * must not contain "\" or control/whitespace characters (browsers turn
 * "/\evil.com" or "/\t/evil.com" into "//evil.com"). Anything else is
 * dropped, so `next` can't be used as an open redirect.
 */
function safeNextPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\s\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
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
    <main className="flex min-h-screen items-center justify-center bg-yellow-50 px-4">
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
