"use client";

import { useEffect, useState } from "react";
import {
  DotsThreeIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  PowerIcon,
  TicketIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { DiscountCode, DiscountKind, DiscountState } from "@repo/types";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  adminCreateDiscount,
  adminDeleteDiscount,
  adminUpdateDiscount,
} from "@/lib/api/client";
import { getApiError, mapFieldErrors } from "@/lib/api/errors";
import { withoutErrors } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { useAdminMutation } from "../hooks/use-admin-mutation";
import { formatDateTime } from "../lib/datetime";
import {
  discountBody,
  discountBodyFrom,
  discountFormFrom,
  discountSummary,
  discountUses,
  EMPTY_DISCOUNT_FORM,
  endedReason,
  type DiscountForm,
} from "../lib/discounts";
import {
  adminDiscountsSearch,
  type AdminDiscountFilters,
} from "../lib/order-filters";
import { adminKeys } from "../keys";
import { useAdminDiscounts } from "../queries";
import { MoneyField } from "./money-field";
import { PageNav } from "./page-nav";
import { ToggleField } from "./product-form";
import { DiscountStateBadge } from "./status-badge";

const PATH = "/admin/discounts";

const tabs: { label: string; state: DiscountState | "" }[] = [
  { label: "All", state: "" },
  { label: "Active", state: "active" },
  { label: "Scheduled", state: "scheduled" },
  { label: "Ended", state: "ended" },
  { label: "Off", state: "off" },
];

type Editing = { mode: "create" } | { mode: "edit"; code: DiscountCode };

/** "From 1 Nov, 09:00 · until 30 Nov, 23:59", or "No end date". */
function whenText(code: DiscountCode): string {
  const parts = [
    code.starts_at && `From ${formatDateTime(code.starts_at)}`,
    code.ends_at && `until ${formatDateTime(code.ends_at)}`,
  ].filter(Boolean);
  if (parts.length === 0) return "No end date";
  const text = parts.join(" · ");
  return text[0]!.toUpperCase() + text.slice(1);
}

/**
 * Discount codes: create, edit, switch off and delete. Uses count the orders
 * that took a code and weren't cancelled, so a used code can't be deleted
 * or renamed (past orders show it).
 */
export function DiscountsManager({
  initial,
}: {
  initial: AdminDiscountFilters;
}) {
  const [filters, setFilters] = useState(initial);
  const [search, setSearch] = useState(initial.q);
  const debounced = useDebouncedValue(search.trim(), 300);
  const discounts = useAdminDiscounts(filters);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<DiscountCode | null>(null);

  useEffect(() => {
    setFilters((f) =>
      f.q === debounced ? f : { ...f, q: debounced, page: 1 },
    );
  }, [debounced]);

  useEffect(() => {
    window.history.replaceState(null, "", PATH + adminDiscountsSearch(filters));
  }, [filters]);

  const outOfRange =
    discounts.isError &&
    getApiError(discounts.error)?.code === "INVALID_PAGE_PARAMETER";
  useEffect(() => {
    if (outOfRange && filters.page > 1) setFilters((f) => ({ ...f, page: 1 }));
  }, [outOfRange, filters.page]);

  const remove = useAdminMutation({
    mutationFn: async (code: DiscountCode) => {
      await adminDeleteDiscount({ path: { id: code.id }, throwOnError: true });
    },
    success: (_, code) => `${code.code} was deleted`,
    failure: "Couldn't delete the code.",
    invalidate: [adminKeys.discounts()],
    onSuccess: () => setDeleting(null),
  });

  const toggle = useAdminMutation({
    mutationFn: async (code: DiscountCode) => {
      // From the saved code, not the form: the form's minute-precision dates
      // would shift its times.
      await adminUpdateDiscount({
        path: { id: code.id },
        body: discountBodyFrom(code, { is_active: !code.is_active }),
        throwOnError: true,
      });
    },
    success: (_, code) =>
      code.is_active ? `${code.code} is off` : `${code.code} is back on`,
    failure: "Couldn't change the code.",
    invalidate: [adminKeys.discounts()],
  });

  const rows = discounts.data?.data ?? [];
  const meta = discounts.data?.meta;

  return (
    <div className="space-y-5">
      <div
        role="group"
        aria-label="Discount state"
        className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0"
      >
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            aria-pressed={filters.state === tab.state}
            onClick={() =>
              setFilters((f) => ({ ...f, state: tab.state, page: 1 }))
            }
            className="-mb-px shrink-0 border-b-2 border-transparent px-3 pb-3 text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground aria-pressed:border-foreground aria-pressed:text-foreground"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search codes"
            aria-label="Search codes"
            className="h-10 pl-9"
            maxLength={32}
          />
        </div>
        <Button className="h-10" onClick={() => setEditing({ mode: "create" })}>
          <PlusIcon />
          New code
        </Button>
      </div>

      <div className="flex min-h-6 items-center justify-between gap-3 text-xs text-muted-foreground">
        <p aria-live="polite">
          {meta ? `${meta.total} ${meta.total === 1 ? "code" : "codes"}` : " "}
        </p>
        {filters.q && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFilters((f) => ({ ...f, q: "", page: 1 }));
            }}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <XIcon className="size-3" />
            Clear search
          </button>
        )}
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-panel border border-border transition-opacity",
          discounts.isPlaceholderData && "opacity-60",
        )}
      >
        <Table className="md:min-w-[44rem]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Code</TableHead>
              <TableHead className="hidden lg:table-cell">When</TableHead>
              <TableHead className="text-right">Uses</TableHead>
              <TableHead className="hidden sm:table-cell">State</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts.isPending ? (
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-10" />
                  </TableCell>
                </TableRow>
              ))
            ) : discounts.isError && !outOfRange ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-16 text-center">
                  <p className="mb-4 text-sm text-muted-foreground">
                    The discount codes couldn&apos;t load.
                  </p>
                  <Button variant="outline" onClick={() => discounts.refetch()}>
                    Try again
                  </Button>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-16 text-center">
                  <TicketIcon
                    className="mx-auto mb-3 size-8 text-muted-foreground"
                    weight="light"
                  />
                  <p className="font-serif text-2xl">
                    {filters.q || filters.state
                      ? "No codes match."
                      : "No discount codes yet."}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {filters.q || filters.state
                      ? "Try another search or tab."
                      : "Create one and share it; shoppers enter it at checkout."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((code) => {
                const reason =
                  code.state === "ended" ? endedReason(code) : null;
                return (
                  <TableRow key={code.id}>
                    <TableCell className="max-w-[20rem]">
                      <button
                        type="button"
                        onClick={() => setEditing({ mode: "edit", code })}
                        className="font-mono text-[0.8125rem] tracking-wider hover:underline"
                      >
                        {code.code}
                      </button>
                      <span className="block truncate text-[0.6875rem] text-muted-foreground">
                        {discountSummary(code)}
                      </span>
                      <span className="mt-1.5 block sm:hidden">
                        <DiscountStateBadge state={code.state} />
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                      {whenText(code)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {discountUses(code)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <DiscountStateBadge state={code.state} />
                      {reason && (
                        <span className="ml-2 text-[0.6875rem] text-muted-foreground">
                          {reason}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Actions for ${code.code}`}
                            />
                          }
                        >
                          <DotsThreeIcon className="size-5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem
                            onClick={() => setEditing({ mode: "edit", code })}
                          >
                            <PencilSimpleIcon />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={toggle.isPending}
                            onClick={() => toggle.mutate(code)}
                          >
                            <PowerIcon />
                            {code.is_active ? "Switch off" : "Switch on"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={code.uses > 0}
                            onClick={() => setDeleting(code)}
                          >
                            <TrashIcon />
                            {code.uses > 0
                              ? "Used: switch off instead"
                              : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {meta && (
        <PageNav
          page={meta.page}
          totalPages={meta.total_pages}
          href={(page) => PATH + adminDiscountsSearch({ ...filters, page })}
          onPage={(page) => {
            setFilters((f) => ({ ...f, page }));
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      <DiscountDialog editing={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.code ?? "this code"}?`}
        description="No order has used it, so nothing else changes. Shoppers who have the code will find it no longer works."
        confirmLabel="Delete code"
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </div>
  );
}

function DiscountDialog({
  editing,
  onClose,
}: {
  editing: Editing | null;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={editing !== null}
      onOpenChange={(open) => !open && !busy && onClose()}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        {editing && (
          <DiscountFormView
            key={editing.mode === "edit" ? editing.code.id : "new"}
            editing={editing}
            onBusyChange={setBusy}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DiscountFormView({
  editing,
  onBusyChange,
  onDone,
}: {
  editing: Editing;
  onBusyChange: (busy: boolean) => void;
  onDone: () => void;
}) {
  const existing = editing.mode === "edit" ? editing.code : null;
  const used = (existing?.uses ?? 0) > 0;
  const [form, setForm] = useState<DiscountForm>(
    existing ? discountFormFrom(existing) : EMPTY_DISCOUNT_FORM,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof DiscountForm>(
    key: K,
    value: DiscountForm[K],
    ...fields: string[]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => withoutErrors(e, ...fields));
  }

  const save = useAdminMutation({
    mutationFn: async (
      body: Parameters<typeof adminCreateDiscount>[0]["body"],
    ) => {
      if (existing) {
        await adminUpdateDiscount({
          path: { id: existing.id },
          body,
          throwOnError: true,
        });
      } else {
        await adminCreateDiscount({ body, throwOnError: true });
      }
    },
    quietOnFieldErrors: true,
    failure: "Couldn't save the code.",
    success: (_, body) =>
      existing
        ? `${body.code.toUpperCase()} saved`
        : `${body.code.toUpperCase()} created`,
    invalidate: [adminKeys.discounts()],
    onSuccess: () => {
      onBusyChange(false);
      onDone();
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = discountBody(form, existing ?? undefined);
    if ("errors" in result) {
      setErrors(result.errors);
      return;
    }
    onBusyChange(true);
    save.mutate(result.body, {
      onError: (error) => {
        onBusyChange(false);
        const apiError = getApiError(error);
        if (apiError?.code === "DISCOUNT_CODE_TAKEN") {
          setErrors({ code: "Another discount already uses this code" });
        } else if (apiError?.code === "DISCOUNT_IN_USE") {
          setErrors({ code: apiError.message });
        } else {
          setErrors(mapFieldErrors(apiError?.errors));
        }
      },
    });
  }

  return (
    <form onSubmit={submit} noValidate>
      <DialogHeader className="gap-1 border-b border-border px-6 py-5">
        <DialogTitle className="font-serif text-2xl font-normal">
          {existing ? `Edit ${existing.code}` : "New discount code"}
        </DialogTitle>
        <DialogDescription className="text-xs">
          {existing
            ? used
              ? `Used by ${existing.uses} ${existing.uses === 1 ? "order" : "orders"}; changes apply to the next checkouts.`
              : "Not used yet."
            : "Shoppers type the code at checkout. It comes off the items, not the shipping."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 px-6 py-6">
        <Field data-invalid={Boolean(errors.code)}>
          <FieldLabel
            htmlFor="discount-code"
            className="eyebrow !text-foreground"
          >
            Code
          </FieldLabel>
          <Input
            id="discount-code"
            value={form.code}
            onChange={(e) =>
              set(
                "code",
                e.target.value.replace(/\s/g, "").toUpperCase(),
                "code",
              )
            }
            maxLength={32}
            autoComplete="off"
            spellCheck={false}
            disabled={used}
            placeholder="WELCOME10"
            className="font-mono tracking-wider uppercase"
            aria-invalid={Boolean(errors.code)}
            aria-describedby={used ? "discount-code-used" : undefined}
          />
          {used && (
            <p
              id="discount-code-used"
              className="text-xs text-muted-foreground"
            >
              Orders show this code, so it can&apos;t be renamed.
            </p>
          )}
          <FieldError>{errors.code}</FieldError>
        </Field>

        <div className="space-y-2">
          <p className="eyebrow !text-foreground">Discount</p>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
            <div
              role="radiogroup"
              aria-label="Kind"
              className="inline-flex h-10 rounded-control border border-border p-0.5"
            >
              {(
                [
                  ["percent", "% off"],
                  ["fixed", "$ off"],
                ] as [DiscountKind, string][]
              ).map(([kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  role="radio"
                  aria-checked={form.kind === kind}
                  onClick={() => {
                    setForm((f) =>
                      f.kind === kind ? f : { ...f, kind, value: "" },
                    );
                    setErrors((e) => withoutErrors(e, "value"));
                  }}
                  className="rounded-[calc(var(--radius-control)*0.75)] px-3 text-[0.8125rem] text-muted-foreground transition-colors aria-checked:bg-foreground aria-checked:text-background"
                >
                  {label}
                </button>
              ))}
            </div>
            {form.kind === "percent" ? (
              <Field data-invalid={Boolean(errors.value)}>
                <FieldLabel htmlFor="discount-value" className="sr-only">
                  Percent off
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="discount-value"
                    inputMode="numeric"
                    value={form.value}
                    onChange={(e) =>
                      set(
                        "value",
                        e.target.value.replace(/\D/g, "").slice(0, 3),
                        "value",
                      )
                    }
                    placeholder="10"
                    className="pr-8 tabular-nums"
                    aria-invalid={Boolean(errors.value)}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
                <FieldError>{errors.value}</FieldError>
              </Field>
            ) : (
              <div className="[&_label]:sr-only">
                <MoneyField
                  id="discount-value"
                  label="Amount off"
                  value={form.value}
                  onChange={(v) => set("value", v, "value")}
                  error={errors.value}
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <MoneyField
            id="discount-min"
            label="Minimum spend"
            optional
            value={form.minSpend}
            onChange={(v) => set("minSpend", v, "min_subtotal")}
            error={errors.min_subtotal}
          />
          <Field data-invalid={Boolean(errors.max_redemptions)}>
            <FieldLabel
              htmlFor="discount-limit"
              className="eyebrow !text-foreground"
            >
              Use limit
              <span className="ml-1 tracking-normal normal-case text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <Input
              id="discount-limit"
              inputMode="numeric"
              value={form.limit}
              onChange={(e) =>
                set(
                  "limit",
                  e.target.value.replace(/\D/g, "").slice(0, 7),
                  "max_redemptions",
                )
              }
              placeholder="No limit"
              className="tabular-nums"
              aria-invalid={Boolean(errors.max_redemptions)}
            />
            <FieldError>{errors.max_redemptions}</FieldError>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.starts_at)}>
            <FieldLabel
              htmlFor="discount-starts"
              className="eyebrow !text-foreground"
            >
              Starts
              <span className="ml-1 tracking-normal normal-case text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <Input
              id="discount-starts"
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) =>
                set("startsAt", e.target.value, "starts_at", "ends_at")
              }
              aria-invalid={Boolean(errors.starts_at)}
            />
            <FieldError>{errors.starts_at}</FieldError>
          </Field>
          <Field data-invalid={Boolean(errors.ends_at)}>
            <FieldLabel
              htmlFor="discount-ends"
              className="eyebrow !text-foreground"
            >
              Ends
              <span className="ml-1 tracking-normal normal-case text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <Input
              id="discount-ends"
              type="datetime-local"
              value={form.endsAt}
              min={form.startsAt || undefined}
              onChange={(e) => set("endsAt", e.target.value, "ends_at")}
              aria-invalid={Boolean(errors.ends_at)}
            />
            <FieldError>{errors.ends_at}</FieldError>
          </Field>
        </div>

        <div className="space-y-4 border-t border-border pt-5">
          <ToggleField
            id="discount-once"
            label="Once per customer"
            description="Each shopper can use the code on one order."
            checked={form.once}
            onChange={(v) => set("once", v)}
          />
          <ToggleField
            id="discount-active"
            label="Active"
            description="Off: checkout refuses the code, whatever its dates."
            checked={form.active}
            onChange={(v) => set("active", v)}
          />
        </div>
      </div>

      <DialogFooter className="border-t border-border px-6 py-4">
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          disabled={save.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : existing ? "Save" : "Create code"}
        </Button>
      </DialogFooter>
    </form>
  );
}
