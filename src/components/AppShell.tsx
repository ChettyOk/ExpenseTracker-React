"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useRef } from "react";

import { BrandLogo } from "./BrandLogo";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/expenses", label: "Expenses", icon: "💳" },
  { href: "/summary", label: "Summary", icon: "📈" },
  { href: "/recurring", label: "Recurring", icon: "🔁" },
  { href: "/settings/rules", label: "Import & rules", icon: "📥" },
] as const;

function isNavActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function desktopNavLinkClass(active: boolean) {
  const base =
    "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600/50 dark:focus-visible:outline-teal-400/50";
  if (active) {
    return `${base} border border-teal-600/25 bg-teal-600 text-white shadow-md shadow-teal-900/25 ring-2 ring-teal-400/35 dark:border-teal-400/30 dark:bg-teal-500 dark:text-zinc-950 dark:shadow-teal-950/30 dark:ring-teal-300/40`;
  }
  return `${base} border border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100/90 hover:text-slate-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50`;
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
    <div className="app-shell-bg">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/80">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-[1fr_auto] items-center gap-x-2 gap-y-2 px-4 py-3 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-x-4 lg:px-8">
          <Link
            href="/dashboard"
            className="col-start-1 row-start-1 flex min-w-0 shrink-0 items-center gap-2.5 text-sm font-semibold tracking-tight text-slate-900 transition hover:text-teal-800 dark:text-zinc-50 dark:hover:text-teal-300"
          >
            <span className="inline-flex shrink-0" aria-hidden>
              <BrandLogo size={32} className="h-8 w-8" />
            </span>
            <span className="leading-tight">
              Expense
              <span className="hidden font-normal text-slate-500 sm:inline dark:text-zinc-400">
                {" "}
                Tracker
              </span>
            </span>
          </Link>

          <nav
            className="hidden min-w-0 flex-wrap items-center justify-center gap-1 lg:col-start-2 lg:row-start-1 lg:flex"
            aria-label="Main"
          >
            {navItems.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap ${desktopNavLinkClass(active)}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span aria-hidden>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            {showAdmin ? (
              <Link
                href="/admin"
                className={`whitespace-nowrap rounded-xl border-2 border-transparent px-3 py-2 text-sm font-medium transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 ${
                  isNavActive(pathname, "/admin")
                    ? "border-amber-500/40 bg-amber-600 text-white shadow-md shadow-amber-900/20 dark:bg-amber-500 dark:text-zinc-950"
                    : "text-amber-900 hover:border-amber-200 hover:bg-amber-50 dark:text-amber-300 dark:hover:border-amber-900/50 dark:hover:bg-amber-950/60"
                }`}
              >
                Admin
              </Link>
            ) : null}
          </nav>

          <div className="col-start-2 row-start-1 flex shrink-0 items-center justify-self-end gap-2 lg:col-start-3">
            <details ref={mobileNavRef} className="relative lg:hidden">
              <summary className="ui-btn-secondary flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs transition [&::-webkit-details-marker]:hidden">
                <span className="flex h-4 w-4 flex-col justify-center gap-0.5" aria-hidden>
                  <span className="h-0.5 rounded-full bg-current" />
                  <span className="h-0.5 rounded-full bg-current" />
                  <span className="h-0.5 rounded-full bg-current" />
                </span>
                Menu
              </summary>
              <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,17rem)] overflow-hidden rounded-2xl border border-slate-200/90 bg-white py-2 text-sm shadow-xl shadow-slate-900/15 ring-1 ring-slate-900/5 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/40 dark:ring-white/5">
                {navItems.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobileNav}
                      className={`flex items-center gap-2 px-4 py-2.5 transition ${
                        active
                          ? "border-l-4 border-teal-500 bg-teal-50 font-semibold text-teal-900 dark:bg-teal-950/55 dark:text-teal-200"
                          : "text-slate-700 hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
                      }`}
                    >
                      <span aria-hidden>{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
                {showAdmin ? (
                  <Link
                    href="/admin"
                    onClick={closeMobileNav}
                    className={`block border-t border-slate-100 px-4 py-2.5 dark:border-zinc-800 ${
                      isNavActive(pathname, "/admin")
                        ? "bg-amber-50 font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                        : "text-amber-900 hover:bg-amber-50/80 dark:text-amber-300 dark:hover:bg-amber-950/25"
                    }`}
                  >
                    Admin
                  </Link>
                ) : null}
              </div>
            </details>

            <details className="relative">
              <summary className="ui-btn-secondary flex cursor-pointer list-none items-center gap-2 py-2 pl-2 pr-2.5 transition sm:pr-3 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-slate-800 to-slate-950 text-xs font-bold text-white shadow-inner dark:from-zinc-600 dark:to-zinc-800">
                  {session?.user?.name?.[0]?.toUpperCase() ??
                    session?.user?.email?.[0]?.toUpperCase() ??
                    "U"}
                </span>
                <span className="hidden max-w-32 truncate text-sm sm:inline sm:max-w-40">
                  {session?.user?.name ?? session?.user?.email ?? "Account"}
                </span>
              </summary>
              <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-sm shadow-xl shadow-slate-900/15 ring-1 ring-slate-900/5 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/40 dark:ring-white/5">
                <Link
                  href="/profile"
                  className="block px-4 py-2.5 text-slate-700 transition hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Profile settings
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="block w-full px-4 py-2.5 text-left text-slate-700 transition hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Log out
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main
        className={`mx-auto w-full space-y-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 ${contentMaxWidth}`}
      >
        {!hidePageHeader ? (
          <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-10 dark:border-zinc-800/80 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-zinc-50">
                {title}
              </h1>
              {description ? (
                <div className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                  {description}
                </div>
              ) : null}
            </div>
            {headerExtra ? (
              <div className="flex w-full min-w-0 shrink-0 flex-col items-center gap-3 sm:w-auto sm:items-end">
                {headerExtra}
              </div>
            ) : null}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
