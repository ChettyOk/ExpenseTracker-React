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
    <div className="app-shell-bg min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 border-b border-slate-200/80 pb-8 dark:border-zinc-800/80 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400">
              <span aria-hidden>⚙️</span> Administrator
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-zinc-50">
              {title}
            </h1>
            {description ? (
              <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                {description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href="/dashboard" className="ui-btn-secondary text-sm">
              User app
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="ui-btn-primary bg-slate-800 text-white shadow-slate-900/20 hover:bg-slate-900 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Log out
            </button>
          </div>
        </div>
        <AdminNav />
        <div className="space-y-10">{children}</div>
      </div>
    </div>
  );
}
