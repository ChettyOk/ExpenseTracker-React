import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/apiAuth";
import AdminShell from "../AdminShell";
import AdminAllExpenses from "../AdminAllExpenses";

export default async function AdminExpensesPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login?callbackUrl=/admin/expenses");

  return (
    <AdminShell
      title="Admin – All Expenses"
      description="View all users' expenses. Filter by user, category, or date."
    >
      <AdminAllExpenses />
    </AdminShell>
  );
}
