import { Suspense } from "react";

import ForgotPasswordForm from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 dark:bg-black">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">Loading…</p>
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
