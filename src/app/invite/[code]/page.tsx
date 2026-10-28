import { redirect } from "next/navigation";
import { Frown } from "lucide-react";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";

function InvalidCodeState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-yellow-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border-4 border-gray-800 bg-white p-6 text-center shadow-[4px_4px_0px_rgba(31,41,55,1)]">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-pink-200 shadow-md shadow-pink-200">
          <Frown size={28} strokeWidth={2.5} className="text-pink-700" />
        </span>
        <h1 className="mb-2 text-2xl font-jua text-pink-700">
          코드가 올바르지 않아요 😢
        </h1>
        <p className="text-sm text-gray-600">초대 링크를 다시 확인해주세요.</p>
      </div>
    </main>
  );
}

export default async function InvitePage({
  params,
}: {
  params: { code: string };
}) {
  const { code } = params;

  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect(`/signup?invite=${code}`);
  }

  const supabase = createServiceClient();

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("invite_code", code)
    .maybeSingle();

  if (!group) {
    return <InvalidCodeState />;
  }

  const { error: joinError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id });

  // Ignore "already a member" duplicate-key errors; any other error is
  // a real failure worth surfacing.
  if (joinError && joinError.code !== "23505") {
    throw new Error(joinError.message);
  }

  redirect("/dashboard");
}
