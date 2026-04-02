"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useRef } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/expenses", label: "Expenses" },
  { href: "/summary", label: "Summary" },
  { href: "/recurring", label: "Recurring" },
  { href: "/settings/rules", label: "Import & rules" },
] as const;

function isNavActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClass(active: boolean) {
  const base = "rounded-lg px-2 py-1.5 text-xs font-medium";
  if (active) {
    return `${base} bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900`;
  }
  return `${base} text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50`;
}

export type AppShellMaxWidth = "max-w-xl" | "max-w-3xl" | "max-w-5xl" | "max-w-6xl";

type AppShellProps = {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
  /** Max width for header + main column (default max-w-6xl). */
  contentMaxWidth?: AppShellMaxWidth;
  /** Omit page heading row (title/description/headerExtra); use for loading-only states. */
  hidePageHeader?: boolean;
};

export default function AppShell({
  title,
  description,
  children,
  headerExtra,
  contentMaxWidth = "max-w-6xl",
  hidePageHeader = false,
}: AppShellProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const showAdmin = session?.user?.role === "ADMIN";
  const mobileNavRef = useRef<HTMLDetailsElement>(null);

  function closeMobileNav() {
    mobileNavRef.current?.removeAttribute("open");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="sticky top-0 z-40 border-b border-zinc-200/90 bg-zinc-50/95 backdrop-blur-md dark:border-zinc-800 dark:bg-black/90">
        {/* Header is full viewport width (not tied to page contentMaxWidth) so the nav stays usable on narrow layouts. */}
        <div className="mx-auto grid w-full max-w-7xl grid-cols-[1fr_auto] items-center gap-x-2 gap-y-2 px-4 py-2.5 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-x-4 lg:px-8">
          <Link
            href="/dashboard"
            className="col-start-1 row-start-1 min-w-0 shrink-0 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Expense Tracker
          </Link>

          <nav
            className="hidden min-w-0 flex-wrap items-center justify-center gap-x-0.5 gap-y-1 lg:col-start-2 lg:row-start-1 lg:flex"
            aria-label="Main"
          >
            {navItems.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap ${navLinkClass(active)}`}
                >
                  {item.label}
                </Link>
              );
            })}
            {showAdmin ? (
              <Link
                href="/admin"
                className={`whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-medium ${
                  isNavActive(pathname, "/admin")
                    ? "bg-amber-700 text-white dark:bg-amber-600"
                    : "text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-950/50"
                }`}
              >
                Admin
              </Link>
            ) : null}
          </nav>

          <div className="col-start-2 row-start-1 flex shrink-0 items-center justify-self-end gap-2 lg:col-start-3">
            <details ref={mobileNavRef} className="relative lg:hidden">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 [&::-webkit-details-marker]:hidden">
                <span className="flex h-4 w-4 flex-col justify-center gap-0.5" aria-hidden>
                  <span className="h-0.5 rounded-full bg-current" />
                  <span className="h-0.5 rounded-full bg-current" />
                  <span className="h-0.5 rounded-full bg-current" />
                </span>
                Menu
              </summary>
              <div className="absolute right-0 z-50 mt-1 w-[min(100vw-2rem,16rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                {navItems.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobileNav}
                      className={`block px-3 py-2 ${
                        active
                          ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                          : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                {showAdmin ? (
                  <Link
                    href="/admin"
                    onClick={closeMobileNav}
                    className={`block border-t border-zinc-100 px-3 py-2 dark:border-zinc-800 ${
                      isNavActive(pathname, "/admin")
                        ? "bg-amber-50 font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                        : "text-amber-800 hover:bg-amber-50/80 dark:text-amber-300 dark:hover:bg-amber-950/30"
                    }`}
                  >
                    Admin
                  </Link>
                ) : null}
              </div>
            </details>

            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {session?.user?.name?.[0]?.toUpperCase() ??
                    session?.user?.email?.[0]?.toUpperCase() ??
                    "U"}
                </span>
                <span className="hidden max-w-40 truncate sm:inline">
                  {session?.user?.name ?? session?.user?.email ?? "Account"}
                </span>
              </summary>
              <div className="absolute right-0 z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                <Link
                  href="/profile"
                  className="block px-3 py-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Profile settings
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="block w-full px-3 py-2 text-left text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Log out
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main
        className={`mx-auto w-full space-y-6 px-4 py-8 sm:px-6 lg:px-8 ${contentMaxWidth}`}
      >
        {!hidePageHeader ? (
          <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {title}
              </h1>
              {description ? (
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</div>
              ) : null}
            </div>
            {headerExtra ? (
              <div className="flex shrink-0 flex-col gap-3 sm:items-end">{headerExtra}</div>
            ) : null}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
