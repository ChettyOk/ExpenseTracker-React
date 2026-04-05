"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin", label: "Users", icon: "👥" },
  { href: "/admin/expenses", label: "All Expenses", icon: "💳" },
  { href: "/admin/stats", label: "System Stats", icon: "📊" },
] as const;

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-10 flex flex-wrap gap-1 rounded-2xl border border-slate-200/90 bg-slate-100/80 p-1.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80"
      aria-label="Admin sections"
    >
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/admin"
            ? pathname === "/admin" || pathname?.startsWith("/admin/users")
            : pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-900/25 ring-2 ring-amber-400/35 transition duration-200 dark:bg-amber-600 dark:text-white dark:ring-amber-300/40"
                : "inline-flex items-center gap-1.5 rounded-xl border border-transparent px-4 py-2.5 text-sm font-medium text-slate-600 transition duration-200 hover:border-slate-200 hover:bg-white hover:text-slate-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            }
          >
            <span aria-hidden>{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
