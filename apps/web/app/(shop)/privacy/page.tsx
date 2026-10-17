import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { LegalList, LegalPage } from "@/modules/legal/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What ${site.name} stores about you, why, who else sees it and the cookies the store uses.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      path="/privacy"
      eyebrow="Help"
      title="Privacy"
      intro="We keep only what it takes to run your account and your orders. No ads, no analytics, no selling your data."
      sections={[
        {
          id: "what-we-store",
          title: "What we store",
          body: (
            <LegalList
              items={[
                <>
                  <strong>Your account:</strong> your name, your email address
                  and a hash of your password (never the password itself).
                </>,
                <>
                  <strong>Addresses:</strong> the shipping addresses you save,
                  and a copy of the one each order was sent to.
                </>,
                <>
                  <strong>Orders:</strong> what you bought, the prices and
                  totals, the order’s status and tracking number.
                </>,
                <>
                  <strong>Your bag, wishlist and reviews.</strong> Reviews are
                  shown with your first name and last initial.
                </>,
                <>
                  <strong>Sign-in sessions:</strong> for each device you sign in
                  on, the browser it reported and the IP address it came from,
                  so a session can be recognised and ended.
                </>,
              ]}
            />
          ),
        },
        {
          id: "why",
          title: "Why we use it",
          body: (
            <p>
              To sign you in, take your orders, ship them, email you about them
              and handle returns and refunds. We don’t use your data for
              advertising and we don’t build profiles of you.
            </p>
          ),
        },
        {
          id: "who-else",
          title: "Who else sees it",
          body: (
            <>
              <p>
                A few services do part of the work for us, and get only what
                that part needs:
              </p>
              <LegalList
                items={[
                  <>
                    <strong>Stripe</strong> takes payments. You enter your card
                    on Stripe’s page, so we never see or store your card
                    details.
                  </>,
                  <>
                    <strong>Our email provider</strong> delivers order and
                    password-reset emails to your address.
                  </>,
                  <>
                    <strong>Cloudinary</strong> hosts the product photos. It
                    receives nothing about you beyond what any image request
                    carries.
                  </>,
                ]}
              />
              <p>We don’t sell or rent your data to anyone.</p>
            </>
          ),
        },
        {
          id: "cookies",
          title: "Cookies and local storage",
          body: (
            <>
              <p>
                The store uses only the cookies it needs to work. There are no
                tracking or advertising cookies.
              </p>
              <LegalList
                items={[
                  <>
                    <strong>access_token</strong> and{" "}
                    <strong>refresh_token</strong> keep you signed in. The first
                    lasts 15 minutes and is renewed by the second, which lasts
                    up to 30 days. Neither can be read by scripts on the page.
                  </>,
                  <>
                    <strong>is_logged_in</strong> only tells the page that you
                    are signed in, so it can show your account menu.
                  </>,
                  <>
                    <strong>cs-theme</strong> remembers the theme you picked in
                    the demo theme picker, when it is shown.
                  </>,
                  <>
                    Your browser also keeps your recent searches (local storage)
                    and, while you sign in, what you were about to do, such as
                    adding to your bag (session storage). Neither leaves your
                    device.
                  </>,
                ]}
              />
            </>
          ),
        },
        {
          id: "how-long",
          title: "How long we keep it",
          body: (
            <p>
              Account details, addresses and orders are kept while your account
              is open. Order records are kept after that for as long as tax and
              accounting rules require. A sign-in session ends after 30 days
              without use, or 90 days after you signed in at the latest, and is
              deleted once it ends.
            </p>
          ),
        },
        {
          id: "your-choices",
          title: "Your choices",
          body: (
            <>
              <p>
                You can change your name and password in{" "}
                <Link href="/account/settings">account settings</Link>, and
                remove saved addresses in{" "}
                <Link href="/account/addresses">your address book</Link>.
                Changing your password signs out your other devices.
              </p>
              <p>
                To get a copy of your data, correct your email address or close
                your account, write to us at {site.contactEmail}.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
