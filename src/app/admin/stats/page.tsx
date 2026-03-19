import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/apiAuth";
import AdminShell from "../AdminShell";
import AdminStats from "../AdminStats";

export default async function AdminStatsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login?callbackUrl=/admin/stats");

  return (
    <AdminShell
      title="Admin – System Stats"
      description="Overview of users, expenses, and spending."
    >
      <AdminStats />
    </AdminShell>
  );
}
