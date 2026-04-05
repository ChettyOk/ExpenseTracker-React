"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim() || undefined, email, password }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(data?.error ?? "Registration failed.");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    setLoading(false);

    if (signInRes?.error) {
      router.push("/login");
      return;
    }

    router.push(signInRes?.url ?? "/dashboard");
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
              Create account
            </h1>
            <p className="text-sm text-slate-600 dark:text-zinc-400">
              Start tracking in minutes
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-zinc-400">
          Set up login credentials. You can add expenses after signing in.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
              Name (optional)
            </span>
            <input
              className="ui-input mt-1.5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
              Email
            </span>
            <input
              className="ui-input mt-1.5"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
              Password
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

          {error ? (
            <p className="rounded-xl border border-red-200/80 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              {error}
            </p>
          ) : null}

          <button className="ui-btn-primary w-full py-3" type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600 dark:text-zinc-400">
          Already have an account?{" "}
          <a className="ui-link no-underline hover:underline" href="/login">
            Sign in
          </a>
        </div>
      </main>
    </div>
  );
}
