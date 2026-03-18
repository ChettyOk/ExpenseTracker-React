import { Suspense } from "react";

import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 dark:bg-black">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Loading sign-in…
          </p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

