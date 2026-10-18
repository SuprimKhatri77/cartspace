"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { clearServerErrors } from "./api-errors";
import { useFormContext } from "./context";

const FOCUSABLE =
  'input, select, textarea, button, [tabindex]:not([tabindex="-1"])';

/**
 * Focuses the first invalid field inside root and scrolls it into view, so
 * the shopper lands on what needs fixing (the errors can be far above the
 * submit button on a phone). Fields mark themselves with aria-invalid; a
 * group (the star rating) passes focus to its first focusable child.
 */
function focusFirstInvalid(root: HTMLElement | null) {
  const invalid = root?.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (!invalid) return;
  const target = invalid.matches(FOCUSABLE)
    ? invalid
    : invalid.querySelector<HTMLElement>(FOCUSABLE);
  target?.focus({ preventScroll: true });
  invalid.scrollIntoView({ block: "center", behavior: "smooth" });
}

/**
 * The <form> element: submits through the form (sending again clears the
 * last server errors), and after each submit that leaves errors, from the
 * validators or the API, focuses the first one.
 */
export function Form({
  children,
  ...props
}: Omit<React.ComponentProps<"form">, "onSubmit" | "noValidate" | "ref">) {
  const form = useFormContext();
  const ref = useRef<HTMLFormElement>(null);
  const attempts = useStore(form.store, (s) => s.submissionAttempts);
  const submitting = useStore(form.store, (s) => s.isSubmitting);

  useEffect(() => {
    if (attempts === 0 || submitting) return;
    focusFirstInvalid(ref.current);
  }, [attempts, submitting]);

  return (
    <form
      {...props}
      ref={ref}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        // A form nested in a portal (a dialog) mustn't submit its host.
        event.stopPropagation();
        clearServerErrors(form);
        void form.handleSubmit();
      }}
    >
      {children}
    </form>
  );
}

/** The submit button: disabled, with pendingLabel, while the form sends. */
export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "type"> & {
  pendingLabel: React.ReactNode;
}) {
  const form = useFormContext();
  const submitting = useStore(form.store, (s) => s.isSubmitting);
  return (
    <Button {...props} type="submit" disabled={submitting || disabled}>
      {submitting ? pendingLabel : children}
    </Button>
  );
}
