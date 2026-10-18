"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { revalidateLogic } from "@tanstack/react-form";
import { ForgotPasswordBodySchema } from "@repo/types";
import { FieldGroup } from "@/components/ui/field";
import { forgotPassword } from "@/lib/api/client";
import { LOGIN_PATH } from "@/lib/auth/redirect";
import { applyApiErrors } from "@/lib/form/api-errors";
import { useAppForm } from "@/lib/form/form";
import { schemaErrors } from "@/lib/form/validate";

/**
 * Asks for an email and sends a reset link. The answer is the same whether
 * or not the email has an account, so the page says "if".
 */
export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: async (body: { email: string }) => {
      await forgotPassword({ body, throwOnError: true });
    },
    onSuccess: (_data, body) => setSentTo(body.email),
  });

  const form = useAppForm({
    defaultValues: { email: "" },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: ({ value }) =>
        schemaErrors(ForgotPasswordBodySchema, { email: value.email.trim() }),
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        await send.mutateAsync({ email: value.email.trim() });
      } catch (err) {
        const { applied, message } = applyApiErrors(formApi, err);
        if (!applied) {
          toast.error(
            message ?? "Couldn't send the link. Try again in a moment.",
          );
        }
      }
    },
  });

  if (sentTo) {
    return (
      <div className="w-full max-w-sm space-y-6" role="status">
        <p className="eyebrow animate-rise">Check your email</p>
        <h1 className="display animate-rise text-5xl sm:text-6xl">
          Link <em>sent.</em>
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          If an account uses <span className="text-foreground">{sentTo}</span>,
          a link to choose a new password is on its way. It works once, for the
          next hour. Nothing there? Check spam, or try again in a minute.
        </p>
        <div className="flex flex-wrap gap-3 border-t border-border pt-6">
          <Link
            href={LOGIN_PATH}
            className="text-sm font-medium underline underline-offset-4"
          >
            Back to sign in
          </Link>
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Use another email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form.AppForm>
      <form.Form className="w-full max-w-sm">
        <div className="mb-10 space-y-3">
          <p className="eyebrow animate-rise">Forgot your password?</p>
          <h1
            className="display animate-rise text-5xl sm:text-6xl"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            Reset <em>it.</em>
          </h1>
          <p
            className="animate-rise text-sm text-muted-foreground"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            Enter your account&apos;s email and we&apos;ll send you a link to
            choose a new password.
          </p>
        </div>

        <FieldGroup>
          <form.AppField name="email">
            {(field) => (
              <field.TextField
                label="Email"
                type="email"
                autoComplete="email"
              />
            )}
          </form.AppField>
          <form.SubmitButton
            className="mt-2 w-full"
            size="lg"
            pendingLabel="Sending…"
          >
            Send reset link
          </form.SubmitButton>
        </FieldGroup>

        <p className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link
            href={LOGIN_PATH}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </form.Form>
    </form.AppForm>
  );
}
