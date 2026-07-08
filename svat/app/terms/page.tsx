import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | One Traders",
  description: "Terms of Service for One Traders education platform.",
};

export default function TermsPage() {
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
        <h1 className="font-headline-lg text-headline-lg mb-md text-primary">Terms of Service</h1>
        <p className="mb-lg font-body-sm text-body-sm text-on-surface-variant">
          Last updated: July 2026
        </p>

        <div className="space-y-lg font-body-md text-body-md text-on-surface-variant">
          <section>
            <h2 className="font-headline-sm text-headline-sm mb-sm text-primary">1. Acceptance of Terms</h2>
            <p>
              By creating an account or using One Traders, you agree to these Terms of Service.
              If you do not agree, do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-headline-sm mb-sm text-primary">2. Educational Purpose Only</h2>
            <p>
              All content on One Traders is for educational purposes only. Nothing on this
              platform constitutes financial advice, investment advice, trading advice, or a
              recommendation to buy or sell any financial instrument. Trading involves
              substantial risk of loss.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-headline-sm mb-sm text-primary">3. Account & Access Codes</h2>
            <ul className="list-disc space-y-sm pl-lg">
              <li>Each access code may only be used for one account unless otherwise stated.</li>
              <li>You are responsible for keeping your login credentials secure.</li>
              <li>Sharing, reselling, or redistributing access codes or course content is prohibited.</li>
              <li>We may suspend or terminate accounts that violate these terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline-sm text-headline-sm mb-sm text-primary">4. Intellectual Property</h2>
            <p>
              All course videos, materials, branding, and platform content are owned by One
              Traders or its licensors. You receive a limited, non-transferable license to
              access content for personal learning only. You may not copy, record, distribute,
              or publicly share course materials.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-headline-sm mb-sm text-primary">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="mt-sm list-disc space-y-sm pl-lg">
              <li>Attempt to download, screen-record, or redistribute protected content.</li>
              <li>Share your account with others.</li>
              <li>Interfere with platform security or other users&apos; access.</li>
              <li>Use the platform for any unlawful purpose.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline-sm text-headline-sm mb-sm text-primary">6. Disclaimer of Warranties</h2>
            <p>
              The platform is provided &quot;as is&quot; without warranties of any kind. We do not
              guarantee uninterrupted access, specific trading outcomes, or accuracy of all
              third-party market data displayed on the platform.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-headline-sm mb-sm text-primary">7. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, One Traders shall not be liable for any
              indirect, incidental, or consequential damages arising from your use of the
              platform or reliance on educational content.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-headline-sm mb-sm text-primary">8. Termination</h2>
            <p>
              We may suspend or terminate your access at any time for violation of these terms
              or for conduct that harms the platform or other users.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-headline-sm mb-sm text-primary">9. Changes</h2>
            <p>
              We may update these Terms from time to time. Continued use of the platform after
              changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-headline-sm mb-sm text-primary">10. Contact</h2>
            <p>
              Questions about these Terms may be directed to One Traders support through your
              administrator or official platform channels.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
