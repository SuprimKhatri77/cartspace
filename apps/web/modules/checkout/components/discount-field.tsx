"use client";

import { useState } from "react";
import { TicketIcon, XIcon } from "@phosphor-icons/react";
import type { DiscountPreview } from "@repo/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/money";

/**
 * The checkout's discount code: a "Have a code?" link that opens a field,
 * then the applied code as a chip. `code` is what the shopper applied;
 * `preview` is the API's answer for it (or its refusal).
 */
export function DiscountField({
  code,
  onChange,
  preview,
  checking,
  error,
  disabled,
}: {
  code: string | null;
  onChange: (code: string | null) => void;
  preview: DiscountPreview | undefined;
  checking: boolean;
  error: string | null;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(code ?? "");

  if (code && !error) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-control border border-dashed border-border px-3 py-2.5 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <TicketIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-mono text-[0.8125rem] tracking-wider">
            {code}
          </span>
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {checking || !preview
              ? "Checking…"
              : `−${formatPrice(preview.discount)}`}
          </span>
        </span>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setDraft("");
            setOpen(false);
          }}
          disabled={disabled}
          aria-label={`Remove ${code}`}
          className="-mr-1 rounded-control p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <XIcon className="size-4" />
        </button>
      </div>
    );
  }

  if (!open && !code) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="link-underline text-xs text-muted-foreground hover:text-foreground"
      >
        Have a discount code?
      </button>
    );
  }

  function apply() {
    const next = (draft || code || "").trim().toUpperCase();
    if (next) onChange(next);
  }

  return (
    <div className="space-y-2">
      <label htmlFor="discount-code" className="eyebrow block">
        Discount code
      </label>
      <div className="flex gap-2">
        <Input
          id="discount-code"
          value={draft || (code ?? "")}
          onChange={(e) => {
            setDraft(e.target.value.replace(/\s/g, "").toUpperCase());
            // Typing again sets the refused code aside.
            if (code) onChange(null);
          }}
          onKeyDown={(e) => {
            // Enter applies the code instead of submitting the order.
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          maxLength={32}
          autoComplete="off"
          spellCheck={false}
          autoFocus={!code}
          className="h-10 font-mono tracking-wider uppercase"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "discount-code-error" : undefined}
        />
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={apply}
          disabled={disabled || checking || !(draft || code)}
        >
          {checking ? "Checking…" : "Apply"}
        </Button>
      </div>
      {error && (
        <p
          id="discount-code-error"
          role="alert"
          className="animate-rise text-xs text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
