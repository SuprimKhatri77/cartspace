"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { revalidateLogic } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ResetPasswordBodySchema } from "@repo/types";
import { buttonVariants } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { logout, resetPassword } from "@/lib/api/client";
import { getApiError } from "@/lib/api/errors";
import { LOGIN_PATH } from "@/lib/auth/redirect";
import { applyApiErrors } from "@/lib/form/api-errors";
import { useAppForm } from "@/lib/form/form";
import { schemaErrors } from "@/lib/form/validate";
import { useAuth } from "@/providers/auth-provider";

const FORGOT_PATH = "/auth/forgot";

// The token comes from the link, not the shopper: the API answers for it.
const PasswordSchema = ResetPasswordBodySchema.pick({ password: true });

/**
 * Sets a new password from the emailed link (?token=). The API signs the
 * account out everywhere, so this browser signs out too, then goes to sign
 * in with the new password.
 */
export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const queryClient = useQueryClient();
  const signedIn = useAuth((s) => Boolean(s.user));
  const setUser = useAuth((s) => s.setUser);
  const [linkDead, setLinkDead] = useState(false);

  const reset = useMutation({
    mutationFn: async (body: { token: string; password: string }) => {
      const { data } = await resetPassword({ body, throwOnError: true });
      return data.message;
    },
    onSuccess: async (message) => {
      // Its session was just revoked: drop the cookies and cached data.
      if (signedIn) await logout({}).catch(() => undefined);
      queryClient.clear();
      setUser(null);
      toast.success(message);
      router.replace(LOGIN_PATH);
      router.refresh();
    },
  });

  const form = useAppForm({
    defaultValues: { password: "" },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: ({ value }) => schemaErrors(PasswordSchema, value),
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        await reset.mutateAsync({ token, password: value.password });
      } catch (err) {
        if (getApiError(err)?.code === "INVALID_RESET_TOKEN") {
          setLinkDead(true);
          return;
        }
        const { applied, message } = applyApiErrors(formApi, err);
        if (!applied) {
          toast.error(message ?? "Couldn't change your password.");
        }
      }
    },
  });

  if (!token || linkDead) {
    return (
      <div className="w-full max-w-sm space-y-6" role="status">
        <p className="eyebrow animate-rise">Reset link</p>
        <h1 className="display animate-rise text-5xl sm:text-6xl">
          Link <em>expired.</em>
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {token
            ? "This link has expired or was already used. Each link works once, for an hour."
            : "This link is incomplete. Open it straight from the email, or ask for a new one."}
        </p>
        <Link href={FORGOT_PATH} className={buttonVariants({ size: "lg" })}>
          Send a new link
        </Link>
      </div>
    );
  }

  return (
    <form.AppForm>
      <form.Form className="w-full max-w-sm">
        <div className="mb-10 space-y-3">
          <p className="eyebrow animate-rise">Reset your password</p>
          <h1
            className="display animate-rise text-5xl sm:text-6xl"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            Choose a <em>new one.</em>
          </h1>
          <p
            className="animate-rise text-sm text-muted-foreground"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            Your other devices get signed out too. Then sign in here with the
            new one.
          </p>
        </div>

        <FieldGroup>
          <form.AppField name="password">
            {(field) => (
              <field.PasswordField
                label="New password"
                autoComplete="new-password"
                hint="8 to 72 characters."
              />
            )}
          </form.AppField>
          <form.SubmitButton
            className="mt-2 w-full"
            size="lg"
            pendingLabel="Saving…"
          >
            Set new password
          </form.SubmitButton>
        </FieldGroup>
      </form.Form>
    </form.AppForm>
  );
}
