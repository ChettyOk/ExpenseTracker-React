import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import SummaryClient from "./ui";

export default async function SummaryPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return <SummaryClient />;
}

