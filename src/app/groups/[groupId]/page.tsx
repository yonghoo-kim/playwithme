import { redirect } from "next/navigation";

interface GroupPageProps {
  params: { groupId: string };
}

/**
 * Old group page. A group's friends now open inline on the dashboard, so
 * this only forwards there with that group open (the dashboard checks it is
 * one of the active child's groups and handles sign-in).
 */
export default function GroupPage({ params }: GroupPageProps) {
  redirect(`/dashboard?group=${encodeURIComponent(params.groupId)}`);
}
