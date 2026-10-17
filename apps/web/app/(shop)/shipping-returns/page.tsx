import type { Metadata } from "next";
import Link from "next/link";
import { SHIPPING_COUNTRIES } from "@repo/types";
import { formatPriceShort } from "@/lib/money";
import { FLAT_SHIPPING, FREE_SHIPPING_FROM } from "@/lib/shipping";
import { site } from "@/lib/site";
import { countryName } from "@/modules/checkout/lib/countries";
import { LegalList, LegalPage } from "@/modules/legal/components/legal-page";

export const metadata: Metadata = {
  title: "Shipping & returns",
  description: `Free shipping over ${formatPriceShort(FREE_SHIPPING_FROM)}, delivery in two to four working days and free returns within ${site.returnDays} days.`,
  alternates: { canonical: "/shipping-returns" },
};

const countries = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction",
}).format(SHIPPING_COUNTRIES.map(countryName));

export default function ShippingReturnsPage() {
  return (
    <LegalPage
      path="/shipping-returns"
      eyebrow="Help"
      title="Shipping & returns"
      intro={`Free shipping over ${formatPriceShort(FREE_SHIPPING_FROM)}, two to four working days to your door, and ${site.returnDays} days to change your mind.`}
      sections={[
        {
          id: "rates",
          title: "Shipping rates",
          body: (
            <>
              <p>
                Standard shipping is <strong>free</strong> on orders of{" "}
                {formatPriceShort(FREE_SHIPPING_FROM)} or more. Below that it’s
                a flat <strong>{formatPriceShort(FLAT_SHIPPING)}</strong> per
                order, however many pieces are in it.
              </p>
              <p>
                The rate is worked out from your bag before you pay, and the
                checkout shows the exact total, shipping included.
              </p>
            </>
          ),
        },
        {
          id: "delivery",
          title: "Delivery times",
          body: (
            <>
              <p>
                Orders leave us within one working day and arrive in{" "}
                <strong>two to four working days</strong>. When your order ships
                we email you, with a tracking number when the carrier gives one.
                You can follow every order in{" "}
                <Link href="/account/orders">your account</Link>.
              </p>
            </>
          ),
        },
        {
          id: "countries",
          title: "Where we ship",
          body: <p>We currently ship to {countries}.</p>,
        },
        {
          id: "returns",
          title: "Returns",
          body: (
            <>
              <p>
                Changed your mind? Send it back within{" "}
                <strong>{site.returnDays} days of delivery</strong>, on us.
              </p>
              <LegalList
                items={[
                  "Pieces should be unworn and unwashed, with their tags.",
                  `Write to ${site.contactEmail} with your order number and we’ll send a prepaid label.`,
                  "Pack the pieces securely and drop the parcel with the carrier.",
                ]}
              />
            </>
          ),
        },
        {
          id: "refunds",
          title: "Refunds",
          body: (
            <p>
              Once a return reaches us we refund the full order total, shipping
              included, to the card you paid with. Refunds go back through
              Stripe and usually show on your statement within five to ten
              working days. We email you when it’s on its way, and the order in
              your account shows the refund date.
            </p>
          ),
        },
        {
          id: "problems",
          title: "Damaged or wrong items",
          body: (
            <p>
              If something arrives damaged or isn’t what you ordered, write to
              us within {site.returnDays} days with your order number and a
              photo. We’ll put it right at no cost to you.
            </p>
          ),
        },
      ]}
    />
  );
}
