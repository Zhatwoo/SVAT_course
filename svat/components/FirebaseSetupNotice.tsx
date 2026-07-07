"use client";

export default function FirebaseSetupNotice() {
  return (
    <div className="border-b border-error-container bg-error-container px-lg py-md text-on-error-container">
      <div className="mx-auto flex max-w-4xl items-start gap-md">
        <span className="material-symbols-outlined mt-0.5 shrink-0">warning</span>
        <div>
          <p className="font-label-md text-label-md font-bold">
            Firebase not configured
          </p>
          <p className="mt-xs font-body-sm text-body-sm">
            Copy{" "}
            <code className="rounded bg-black/10 px-1 dark:bg-white/10">.env.example</code>{" "}
            to{" "}
            <code className="rounded bg-black/10 px-1 dark:bg-white/10">.env.local</code>{" "}
            in the{" "}
            <code className="rounded bg-black/10 px-1 dark:bg-white/10">svat</code> folder,
            then paste your Firebase web app credentials. Restart{" "}
            <code className="rounded bg-black/10 px-1 dark:bg-white/10">npm run dev</code>{" "}
            after saving.
          </p>
          <p className="mt-xs font-body-sm text-body-sm opacity-80">
            See{" "}
            <code className="rounded bg-black/10 px-1 dark:bg-white/10">
              FIREBASE_SETUP.md
            </code>{" "}
            for step-by-step instructions.
          </p>
        </div>
      </div>
    </div>
  );
}
