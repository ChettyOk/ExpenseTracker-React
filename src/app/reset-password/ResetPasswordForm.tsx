"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (token.length < 32) {
      setError("Invalid or missing reset link. Open the link from your email again.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? "Could not reset password.");
      return;
    }

    router.push("/login?reset=1");
  }

  return (
    <div className="ui-auth-shell">
      <main className="ui-auth-panel">
        <div className="mb-6 flex items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-teal-500 to-teal-700 text-sm font-bold text-white shadow-lg shadow-teal-900/25 dark:from-teal-400 dark:to-teal-600 dark:text-zinc-950"
            aria-hidden
          >
            e
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
              Set new password
            </h1>
            <p className="text-sm text-slate-600 dark:text-zinc-400">Choose a strong password</p>
          </div>
        </div>

        {!token ? (
          <div className="space-y-4">
            <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/35 dark:text-amber-200">
              This page needs a reset token from your email. Request a new link from{" "}
              <Link className="ui-link font-medium" href="/forgot-password">
                forgot password
              </Link>
              .
            </p>
            <Link className="ui-link text-sm no-underline hover:underline" href="/login">
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                  New password
                </span>
                <input
                  className="ui-input mt-1.5"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Confirm password
                </span>
                <input
                  className="ui-input mt-1.5"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                />
              </label>

              {error ? (
                <p className="rounded-xl border border-red-200/80 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
                  {error}
                </p>
              ) : null}

              <button className="ui-btn-primary w-full py-3" type="submit" disabled={loading}>
                {loading ? "Saving…" : "Update password"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600 dark:text-zinc-400">
              <Link className="ui-link no-underline hover:underline" href="/login">
                ← Back to sign in
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
