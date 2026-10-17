import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { LegalList, LegalPage } from "@/modules/legal/components/legal-page";

export const metadata: Metadata = {
  title: "Terms",
  description: `The terms for shopping at ${site.name}: accounts, orders, prices, payment, reviews and returns.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      path="/terms"
      eyebrow="Help"
      title="Terms"
      intro={`The ground rules for shopping at ${site.name}, in plain words. By creating an account or placing an order you agree to them.`}
      sections={[
        {
          id: "account",
          title: "Your account",
          body: (
            <LegalList
              items={[
                "You need an account to fill a bag and check out. Use your real name and an email address you can read: it’s where your receipts and shipping updates go.",
                "Keep your password to yourself. If you think someone else has it, change it in account settings, which also signs out your other devices.",
                "We may close an account that is used to abuse the store, its payments or other shoppers.",
              ]}
            />
          ),
        },
        {
          id: "prices",
          title: "Prices and offers",
          body: (
            <p>
              Prices are in US dollars. An offer price applies until the end
              date shown with it. If a price changes while a piece is in your
              bag, the bag and the checkout show the new price before you pay,
              and you pay what the checkout shows.
            </p>
          ),
        },
        {
          id: "orders",
          title: "Orders and stock",
          body: (
            <>
              <p>
                When you start checkout we hold the pieces in your bag for{" "}
                <strong>{site.checkoutHoldMinutes} minutes</strong> while you
                pay. If payment isn’t completed in that time, the hold ends and
                the pieces go back on sale; nothing is charged.
              </p>
              <p>
                Your order is confirmed once payment succeeds, and we email you
                a receipt. In the rare case that a payment arrives after the
                hold ended and a piece sold out in between, we’ll tell you and
                refund it in full.
              </p>
            </>
          ),
        },
        {
          id: "payment",
          title: "Payment",
          body: (
            <p>
              Payments are taken by Stripe on its own secure page; we never see
              your card details. Your card is charged once, for the total shown
              at checkout, shipping included.
            </p>
          ),
        },
        {
          id: "shipping",
          title: "Shipping, returns and refunds",
          body: (
            <p>
              How we ship, where to, and how to send something back are set out
              in <Link href="/shipping-returns">shipping &amp; returns</Link>.
              In short: free returns within {site.returnDays} days of delivery,
              refunded in full to your card.
            </p>
          ),
        },
        {
          id: "reviews",
          title: "Reviews",
          body: (
            <p>
              Only shoppers who bought a piece can review it, once per product.
              Reviews appear with your first name and last initial. Keep them
              honest and about the product; we may hide reviews that are
              abusive, off topic or contain personal details.
            </p>
          ),
        },
        {
          id: "liability",
          title: "Our responsibility",
          body: (
            <p>
              We describe and photograph every piece as accurately as we can,
              but colours vary a little between screens. If something is wrong
              with your order we’ll repair, replace or refund it. Nothing in
              these terms limits rights you have under the law where you live.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes to these terms",
          body: (
            <p>
              We may update these terms; the date at the top shows when they
              last changed. The terms that applied when you placed an order are
              the ones that apply to it. See also our{" "}
              <Link href="/privacy">privacy policy</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
