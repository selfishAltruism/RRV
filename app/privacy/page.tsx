import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - crv.",
  description:
    "Privacy Policy for crv (React Code-based Rendering Visualization Tool).",
};

export default function PrivacyPage() {
  return (
    <div className="h-full bg-neutral-100">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <header className="mb-8 border-b border-neutral-200 pb-4">
          <h1 className="text-2xl font-bold text-neutral-900">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Last updated: 2025-12-07
          </p>
        </header>

        <section className="h-[calc(100vh-250px)] space-y-5 overflow-y-auto text-sm leading-relaxed text-neutral-800">
          <p>
            This Privacy Policy describes how crv (React Code-based Rendering
            Visualization Tool, the &quot;Service&quot;) handles information in
            connection with your use of the Service.
          </p>

          {/* 1. Information We Collect */}
          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              1. Information We Collect
            </h2>
            <p className="mb-2">
              The Service does not directly collect personally identifiable
              information.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                React source code you paste into the Service is not sent to any
                server; analysis is performed locally in your browser.
              </li>
              <li>
                We do not collect information that directly identifies you, such
                as your name, email address, or phone number.
              </li>
            </ul>

            <p className="mt-4 mb-2">
              However, certain information may be collected automatically in the
              following cases.
            </p>

            <h3 className="mb-1 text-sm font-semibold text-neutral-900">
              (1) Cookies and Advertising Identifiers
            </h3>
            <p className="mb-2">
              Google AdSense and/or analytics tools (if used) may automatically
              collect information such as:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Cookie identifiers</li>
              <li>Visit frequency and usage patterns</li>
              <li>Browser and device information</li>
              <li>Approximate location derived from IP address</li>
            </ul>
            <p className="mt-2">
              This information is generally processed as anonymous or
              non-identifiable data.
            </p>
          </section>

          {/* 2. How We Use Information */}
          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              2. How We Use Information
            </h2>
            <p className="mb-2">
              Automatically collected information may be used for:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Improving Service quality and features</li>
              <li>Error analysis and aggregated usage statistics</li>
              <li>
                Displaying ads and measuring ad performance (if Google AdSense
                is used)
              </li>
            </ul>
          </section>

          {/* 3. Google AdSense Notice */}
          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              3. Google AdSense Notice
            </h2>
            <p className="mb-2">
              The Service may display ads through Google AdSense. Google may use
              cookies and similar technologies to:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Provide personalized or non-personalized ads</li>
              <li>Deliver ads based on user activity</li>
              <li>Collect statistics on ad impressions and clicks</li>
            </ul>
            <p className="mt-2">
              For more information about Google&apos;s advertising and cookie
              practices, please visit:
            </p>
            <p className="mt-1 break-all text-neutral-700">
              https://policies.google.com/technologies/ads
            </p>
          </section>

          {/* 4. Sharing with Third Parties */}
          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              4. Sharing with Third Parties
            </h2>
            <p className="mb-2">
              We do not sell or share your personal information with third
              parties. Exceptions may apply only when:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Required by applicable laws or regulations</li>
              <li>
                Requested by law enforcement or government authorities through
                lawful procedures
              </li>
            </ul>
          </section>

          {/* 5. Data Retention and Deletion */}
          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              5. Data Retention and Deletion
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                React source code you input is not stored on our servers. It may
                be cleared when you refresh the page or close the browser tab.
              </li>
              <li>
                Cookies and advertising identifiers are handled according to the
                policies of third-party providers (such as Google). The Service
                operator does not directly store or manage such third-party
                data.
              </li>
            </ul>
          </section>

          {/* 6. Your Choices (Cookie Control) */}
          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              6. Your Choices and Cookie Controls
            </h2>
            <p className="mb-2">
              You can block or delete cookies at any time through your browser
              settings. Examples:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Chrome: Settings &gt; Privacy and security &gt; Cookies and
                other site data
              </li>
              <li>Safari: Settings &gt; Privacy &gt; Block all cookies</li>
              <li>
                Other browsers (Edge, Firefox, etc.) provide similar settings to
                manage cookies.
              </li>
            </ul>
          </section>

          {/* 7. Contact */}
          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              7. Contact
            </h2>
            <p className="mb-2">
              If you have questions about this Privacy Policy, please contact:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Contact person: Kyu</li>
              <li className="break-all">
                Email: <span>officialkyus@gmail.com</span>
              </li>
            </ul>
          </section>

          {/* 8. Changes to This Policy */}
          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              8. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy to reflect changes in the
              Service or applicable laws. If there are material changes, we will
              provide notice within the Service by reasonable means.
            </p>
          </section>
        </section>
      </div>
    </div>
  );
}
