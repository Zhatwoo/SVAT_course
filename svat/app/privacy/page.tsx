import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | One Traders",
  description: "Privacy Policy for One Traders education platform.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-outline-variant bg-surface-container-lowest px-lg py-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link className="font-headline-md text-headline-md font-bold text-primary" href="/">
            One Traders
          </Link>
          <Link className="font-label-sm text-label-sm text-secondary hover:underline" href="/auth/login">
            Back to login
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-lg py-xl">
        <h1 className="font-headline-lg text-headline-lg mb-md text-primary">Privacy Policy</h1>
        <p className="mb-lg font-body-sm text-body-sm text-on-surface-variant">
          Last updated: July 2026
        </p>

        <div className="space-y-lg font-body-md text-body-md text-on-surface-variant">
          <section>
            <h2 className="font-headline-sm text-headline-sm mb-sm text-primary">1. Introduction</h2>
            <p>
              One Traders (&quot;we&quot;, &quot;us&quot;) operates an online trading education
              platform. This Privacy Policy explains how we collect, use, and protect your
              information when you use our website and services.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-headline-sm mb-sm text-primary">2. Information We Collect</h2>
            <ul className="list-disc space-y-sm pl-lg">
              <li>Account information: name, email address, and authentication credentials.</li>
              <li>Access code data: codes redeemed at signup and linked to your account.</li>
              <li>Learning progress: episodes watched, completion status, and course progress.</li>
              <li>Security events: screenshot attempts, tab visibility changes, and related metadata logged to protect course content.</li>
              <li>Technical data: browser type, device information, and usage logs necessary to operate the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline-sm text-headline-sm mb-sm text-primary">3. How We Use Your Information</h2>
            <ul className="list-disc space-y-sm pl-lg">
              <li>Provide access to courses and track your learning progress.</li>
              <li>Verify enrollment through access codes.</li>
              <li>Protect proprietary content and investigate suspected misuse.</li>
              <li>Communicate important account or service updates.</li>
              <li>Improve platform performance and security.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline-sm text-headline-sm mb-sm text-primary">4. Data Storage</h2>
            <p>
              We use Firebase (Google Cloud) for authentication, database, and file storage.
              Your data is stored securely and accessed only as needed to provide our services.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-headline-sm mb-sm text-primary">5. Sharing of Information</h2>
            <p>
              We do not sell your personal information. We may share data only with service
              providers that help us operate the platform (such as Firebase), when required by
              law, or to protect our rights and users.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-headline-sm mb-sm text-primary">6. Your Rights</h2>
            <p>
              You may request access, correction, or deletion of your account data by contacting
              us. You may stop using the service at any time. Some data may be retained as
              required by law or for legitimate business purposes.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-headline-sm mb-sm text-primary">7. Contact</h2>
            <p>
              For privacy-related questions, contact One Traders support through your
              administrator or the help channels provided on the platform.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
