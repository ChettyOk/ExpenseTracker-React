import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/apiAuth";

import AdminShell from "../../AdminShell";
import AdminUserDetail from "./AdminUserDetail";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/login?callbackUrl=/admin");

  const { id } = await params;

  return (
    <AdminShell
      title="User detail"
      description="Read-only view of this user’s expenses, budgets, recurring rules, import profiles, and categorization rules."
    >
      <AdminUserDetail userId={id} />
    </AdminShell>
  );
}
