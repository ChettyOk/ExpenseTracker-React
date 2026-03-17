import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  if (!session || !user?.id) return null;
  return { id: user.id };
}

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session || !user?.id || user?.role !== "ADMIN") return null;
  return { id: user.id };
}

