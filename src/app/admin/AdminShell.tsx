"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import AdminNav from "./AdminNav";

type AdminShellProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
};

export default function AdminShell({
  children,
  title = "Admin",
  description,
}: AdminShellProps) {
  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              User app
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Log out
            </button>
          </div>
        </div>
        <AdminNav />
        {children}
      </div>
    </div>
  );
}

