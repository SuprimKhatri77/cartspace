"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { revalidateLogic, useStore } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckIcon,
  LockSimpleIcon,
  PlusIcon,
  TruckIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  AddressInputSchema,
  MAX_ADDRESSES,
  type Address,
  type Cart,
  type CheckoutBody,
} from "@repo/types";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/hooks/use-hydrated";
import { startCheckout } from "@/lib/api/client";
import { getApiError } from "@/lib/api/errors";
import { applyApiErrors } from "@/lib/form/api-errors";
import { useAppForm } from "@/lib/form/form";
import { schemaErrors } from "@/lib/form/validate";
import { formatPrice } from "@/lib/money";
import { shippingFor } from "@/lib/shipping";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { CartTotals } from "@/modules/cart/components/cart-summary";
import { cartKeys } from "@/modules/cart/keys";
import { optionSummary } from "@/modules/cart/lib/cart-math";
import { useCart } from "@/modules/cart/queries";
import { discountKeys } from "../keys";
import { countryName } from "../lib/countries";
import { loadDiscountCode, saveDiscountCode } from "../lib/discount-code";
import { useAddresses, useDiscountPreview } from "../queries";
import {
  ADDRESS_LABELS,
  AddressFields,
  EMPTY_ADDRESS,
  type AddressValues,
} from "./address-form";
import { DefaultTag } from "./default-tag";
import { DiscountField } from "./discount-field";

const NEW = "new";

/**
 * Checkout: who it's for, where it goes and what it costs. Paying hands
 * over to Stripe's hosted page, which returns to /checkout/success.
 */
export function CheckoutView({ seeded }: { seeded: boolean }) {
  const hydrated = useHydrated();
  const user = useAuth((s) => s.user);
  const cartQuery = useCart();
  const cart = seeded || hydrated ? cartQuery.data : undefined;
  const addresses = useAddresses();

  if (!cart && hydrated && cartQuery.isError) {
    return (
      <Shell>
        <EmptyState
          eyebrow="Something went wrong"
          title="We couldn't load your bag."
          action={
            <Button variant="outline" onClick={() => void cartQuery.refetch()}>
              Try again
            </Button>
          }
        />
      </Shell>
    );
  }

  if (!cart) {
    return (
      <Shell>
        <div className="grid gap-12 lg:grid-cols-[1fr_26rem]">
          <Skeleton className="h-96" />
          <Skeleton className="h-80" />
        </div>
      </Shell>
    );
  }

  if (cart.items.length === 0) {
    return (
      <Shell>
        <EmptyState
          eyebrow="Nothing to check out"
          title="Your bag is empty."
          action={
            <Link href="/shop" className={buttonVariants()}>
              Start shopping
            </Link>
          }
        />
      </Shell>
    );
  }

  if (cart.has_issues) {
    return (
      <Shell>
        <EmptyState
          eyebrow="Almost there"
          title="Some items in your bag need attention."
          action={
            <Link href="/cart" className={buttonVariants()}>
              Review your bag
            </Link>
          }
        >
          An item sold out or changed since you added it. Update your bag, then
          come back to check out.
        </EmptyState>
      </Shell>
    );
  }

  return (
    <Shell>
      <CheckoutForm
        cart={cart}
        email={user?.email ?? ""}
        saved={addresses.data}
        savedLoading={addresses.isPending}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page pt-8 pb-24 sm:pt-14">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <h1 className="display animate-rise text-[clamp(3rem,6vw,5rem)]">
          Checkout.
        </h1>
        <ol className="flex items-center gap-3 font-mono text-[0.6875rem] tracking-[0.16em] uppercase">
          {["Bag", "Details", "Payment"].map((step, i) => (
            <li key={step} className="flex items-center gap-3">
              {i > 0 && <span className="h-px w-6 bg-border" aria-hidden />}
              {i === 0 ? (
                <Link
                  href="/cart"
                  className="link-underline text-muted-foreground hover:text-foreground"
                >
                  {step}
                </Link>
              ) : (
                <span
                  className={cn(
                    i === 1 ? "text-foreground" : "text-muted-foreground",
                  )}
                  aria-current={i === 1 ? "step" : undefined}
                >
                  {step}
                </span>
              )}
            </li>
          ))}
        </ol>
      </header>
      {children}
    </div>
  );
}

function CheckoutForm({
  cart,
  email,
  saved,
  savedLoading,
}: {
  cart: Cart;
  email: string;
  saved: Address[] | undefined;
  savedLoading: boolean;
}) {
  // Until the shopper picks, use the first saved address (the default, else
  // the newest) or a new one.
  const [picked, setPicked] = useState<string | null>(null);
  const choice = picked ?? saved?.[0]?.id ?? NEW;
  const [save, setSave] = useState(true);
  // Ticked until the shopper says otherwise if they have no default yet.
  const [makeDefaultChoice, setMakeDefault] = useState<boolean | null>(null);
  const makeDefault = makeDefaultChoice ?? !saved?.some((a) => a.is_default);
  // The API saves no more than this many; past it, it ignores the box.
  const bookFull = (saved?.length ?? 0) >= MAX_ADDRESSES;
  const [redirecting, setRedirecting] = useState(false);
  const queryClient = useQueryClient();

  // The code applied in this tab survives a trip to Stripe and back; it is
  // read once hydrated (the server renders without it).
  const hydrated = useHydrated();
  const [chosenCode, setChosenCode] = useState<string | null | undefined>();
  const discountCode =
    chosenCode !== undefined
      ? chosenCode
      : hydrated
        ? loadDiscountCode()
        : null;
  function setDiscountCode(code: string | null) {
    setChosenCode(code);
    saveDiscountCode(code);
  }
  const preview = useDiscountPreview(discountCode, cart.subtotal);
  const discountError =
    discountCode && preview.isError
      ? (getApiError(preview.error)?.message ?? "We couldn't check that code.")
      : null;
  const applied =
    discountCode && preview.data && !preview.isError ? preview.data : undefined;

  const checkout = useMutation({
    mutationFn: async (body: CheckoutBody) => {
      const { data } = await startCheckout({ body, throwOnError: true });
      return data.data;
    },
    onSuccess: ({ checkout_url }) => {
      setRedirecting(true);
      window.location.assign(checkout_url);
    },
  });

  const form = useAppForm({
    defaultValues: EMPTY_ADDRESS,
    validationLogic: revalidateLogic(),
    validators: {
      // A saved address was checked when it was saved.
      onDynamic: ({ value }) =>
        choice === NEW
          ? schemaErrors(AddressInputSchema, addressBody(value), {
              labels: ADDRESS_LABELS,
            })
          : undefined,
    },
    onSubmit: async ({ value, formApi }) => {
      const discount = applied ? { discount_code: applied.code } : {};
      const body: CheckoutBody =
        choice !== NEW
          ? { address_id: choice, ...discount }
          : {
              address: AddressInputSchema.parse(addressBody(value)),
              save_address: save && !bookFull,
              make_default: save && !bookFull && makeDefault,
              ...discount,
            };
      try {
        await checkout.mutateAsync(body);
      } catch (error) {
        const apiError = getApiError(error);
        // Something sold out (or the bag emptied) since this page loaded:
        // the fresh cart switches the page to "Review your bag".
        if (
          apiError?.code === "CART_HAS_ISSUES" ||
          apiError?.code === "CART_EMPTY"
        ) {
          void queryClient.invalidateQueries({ queryKey: cartKeys.all });
        }
        // The code stopped applying (used up, expired) since it was checked:
        // check it again so the field says why.
        if (apiError?.code?.startsWith("DISCOUNT_")) {
          void queryClient.invalidateQueries({ queryKey: discountKeys.all });
        }
        // Field errors come back as "address.city"; the form uses "city".
        applyApiErrors(formApi, error, {
          rename: (name) => name.replace(/^address\./, ""),
        });
        toast.error(apiError?.message ?? "Couldn't start checkout. Try again.");
      }
    },
  });
  const submitting = useStore(form.store, (s) => s.isSubmitting);

  const shipping = applied ? applied.shipping : shippingFor(cart.subtotal);
  const total = cart.subtotal - (applied?.discount ?? 0) + shipping;
  const checkingCode = Boolean(discountCode) && preview.isFetching;
  const busy = submitting || redirecting;

  return (
    <form.AppForm>
      <form.Form className="grid items-start gap-12 lg:grid-cols-[1fr_26rem] lg:gap-16">
        <div className="space-y-12">
          <Section number={1} title="Contact">
            <p className="text-sm">{email}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your receipt and shipping updates go here.
            </p>
          </Section>

          <Section number={2} title="Shipping address">
            {savedLoading ? (
              <Skeleton className="h-28" />
            ) : (
              <div className="space-y-6">
                {saved && saved.length > 0 && (
                  <div
                    role="radiogroup"
                    aria-label="Shipping address"
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    {saved.map((a) => (
                      <AddressCard
                        key={a.id}
                        selected={choice === a.id}
                        onSelect={() => setPicked(a.id)}
                      >
                        <span className="flex items-center gap-2 font-medium">
                          {a.full_name}
                          {a.is_default && <DefaultTag />}
                        </span>
                        <span>
                          {a.line1}
                          {a.line2 ? `, ${a.line2}` : ""}
                        </span>
                        <span>
                          {a.city}
                          {a.region ? `, ${a.region}` : ""} {a.postal_code}
                        </span>
                        <span>{countryName(a.country)}</span>
                      </AddressCard>
                    ))}
                    <AddressCard
                      selected={choice === NEW}
                      onSelect={() => setPicked(NEW)}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <PlusIcon className="size-4" /> A new address
                      </span>
                    </AddressCard>
                  </div>
                )}

                {choice === NEW && (
                  <div className="animate-rise space-y-6">
                    <AddressFields form={form} />
                    {bookFull ? (
                      // The API wouldn't save it, so don't offer to.
                      <p className="text-[0.8125rem] text-muted-foreground">
                        You have {MAX_ADDRESSES} saved addresses, the most we
                        keep. To save this one, remove one in{" "}
                        <Link
                          href="/account/addresses"
                          className="underline underline-offset-4 hover:text-foreground"
                        >
                          your addresses
                        </Link>
                        .
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 text-sm">
                          <input
                            type="checkbox"
                            checked={save}
                            onChange={(e) => setSave(e.target.checked)}
                            className="size-4 accent-[var(--primary)]"
                          />
                          Save this address for next time
                        </label>
                        {save && (
                          <label className="animate-rise flex items-center gap-3 pl-7 text-sm">
                            <input
                              type="checkbox"
                              checked={makeDefault}
                              onChange={(e) => setMakeDefault(e.target.checked)}
                              className="size-4 accent-[var(--primary)]"
                            />
                            Make it my default address
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Section>

          <Section number={3} title="Delivery">
            <div className="flex items-center gap-4 rounded-panel border border-border p-4 text-sm">
              <TruckIcon
                weight="light"
                className="size-6 text-muted-foreground"
              />
              <div className="flex-1">
                <p>Standard delivery</p>
                <p className="text-xs text-muted-foreground">
                  2–4 working days
                </p>
              </div>
              <p className="tabular-nums">
                {shipping === 0 ? "Free" : formatPrice(shipping)}
              </p>
            </div>
          </Section>
        </div>

        <aside
          aria-label="Order summary"
          className="space-y-6 rounded-panel border border-border bg-surface/60 p-6 lg:sticky lg:top-24"
        >
          <div className="flex items-baseline justify-between gap-4">
            <p className="eyebrow">Order summary</p>
            <Link
              href="/cart"
              className="link-underline text-xs text-muted-foreground hover:text-foreground"
            >
              Edit bag
            </Link>
          </div>
          <ul className="max-h-80 space-y-4 overflow-y-auto pr-1">
            {cart.items.map((line) => (
              <li key={line.variant_id} className="flex gap-4">
                <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-media bg-background">
                  {line.image && (
                    <Image
                      src={line.image}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  )}
                  <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-primary font-mono text-[0.625rem] text-primary-foreground">
                    {line.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate">{line.product_name}</p>
                  {line.options.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {optionSummary(line)}
                    </p>
                  )}
                </div>
                <p className="text-sm tabular-nums">
                  {formatPrice(line.line_total)}
                </p>
              </li>
            ))}
          </ul>
          <DiscountField
            code={discountCode}
            onChange={setDiscountCode}
            preview={applied}
            checking={checkingCode}
            error={discountError}
            disabled={busy}
          />
          <CartTotals
            cart={cart}
            discount={
              applied
                ? { code: applied.code, amount: applied.discount }
                : undefined
            }
          />
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={busy || checkingCode}
          >
            <LockSimpleIcon />
            {redirecting
              ? "Opening secure payment…"
              : submitting
                ? "Reserving your items…"
                : `Pay ${formatPrice(total)}`}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            You&apos;ll pay on Stripe&apos;s secure page. Items are held for you
            for {site.checkoutHoldMinutes} minutes. By paying you agree to our{" "}
            <Link href="/terms" className="underline underline-offset-4">
              terms
            </Link>
            .
          </p>
        </aside>
      </form.Form>
    </form.AppForm>
  );
}

/** A new address as the API takes it: blank optional lines left out. */
function addressBody(address: AddressValues) {
  return {
    ...address,
    line2: address.line2 || undefined,
    region: address.region || undefined,
  };
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="animate-rise space-y-5"
      style={{ "--i": number } as React.CSSProperties}
    >
      <h2 className="flex items-baseline gap-3 font-serif text-3xl">
        <span className="font-mono text-xs text-muted-foreground">
          0{number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function AddressCard({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "relative flex min-h-28 flex-col items-start gap-0.5 border p-4 text-left text-[0.8125rem] transition-colors",
        selected
          ? "border-foreground bg-background"
          : "border-border text-muted-foreground hover:border-foreground/40",
      )}
    >
      {selected && (
        <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckIcon weight="bold" className="size-3" />
        </span>
      )}
      {children}
    </button>
  );
}
