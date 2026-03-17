import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import RecurringClient from "./ui";

export default async function RecurringPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return <RecurringClient />;
}

