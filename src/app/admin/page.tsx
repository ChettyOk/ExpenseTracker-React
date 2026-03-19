import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/apiAuth";
import AdminUsers from "./AdminUsers";
import AdminShell from "./AdminShell";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login?callbackUrl=/admin");

  return (
    <AdminShell
      title="Admin – Users"
      description="Manage users (create, edit, delete)."
    >
      <AdminUsers />
    </AdminShell>
  );
}
