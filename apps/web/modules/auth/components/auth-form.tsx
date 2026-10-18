"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { revalidateLogic } from "@tanstack/react-form";
import {
  LoginBodySchema,
  RegisterBodySchema,
  type LoginBody,
  type RegisterBody,
} from "@repo/types";
import { FieldGroup } from "@/components/ui/field";
import { safeNextPath } from "@/lib/auth/redirect";
import { applyApiErrors } from "@/lib/form/api-errors";
import { useAppForm } from "@/lib/form/form";
import { schemaErrors } from "@/lib/form/validate";

type AuthFormProps =
  | {
      mode: "login";
      onSubmit: (body: LoginBody) => Promise<unknown>;
    }
  | {
      mode: "register";
      onSubmit: (body: RegisterBody) => Promise<unknown>;
    };

export function AuthForm(props: AuthFormProps) {
  const isRegister = props.mode === "register";
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));

  const form = useAppForm({
    defaultValues: { name: "", email: "", password: "" },
    validationLogic: revalidateLogic(),
    validators: {
      // The schemas word their own messages ("Enter a valid email address");
      // sign-in's leaves the unused name out.
      onDynamic: ({ value }) =>
        schemaErrors(isRegister ? RegisterBodySchema : LoginBodySchema, value),
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        if (props.mode === "register") {
          await props.onSubmit(RegisterBodySchema.parse(value));
        } else {
          await props.onSubmit(LoginBodySchema.parse(value));
        }
      } catch (error) {
        // The mutation already showed a toast; add per-field messages.
        applyApiErrors(formApi, error);
      }
    },
  });

  const otherHref = `${isRegister ? "/auth/login" : "/auth/register"}${
    next ? `?next=${encodeURIComponent(next)}` : ""
  }`;

  return (
    <form.AppForm>
      <form.Form className="w-full max-w-sm">
        <div className="mb-10 space-y-3">
          <p className="eyebrow animate-rise">
            {isRegister ? "Join cartspace" : "Welcome back"}
          </p>
          <h1
            className="display animate-rise text-5xl sm:text-6xl"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            {isRegister ? (
              <>
                Create your <em>account.</em>
              </>
            ) : (
              <>
                Sign <em>in.</em>
              </>
            )}
          </h1>
          <p
            className="animate-rise text-sm text-muted-foreground"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            {isRegister
              ? "Save your bag, check out faster and track every order."
              : "Pick up where you left off."}
          </p>
        </div>

        <FieldGroup>
          {isRegister && (
            <form.AppField name="name">
              {(field) => <field.TextField label="Name" autoComplete="name" />}
            </form.AppField>
          )}
          <form.AppField name="email">
            {(field) => (
              <field.TextField
                label="Email"
                type="email"
                autoComplete="email"
              />
            )}
          </form.AppField>
          <form.AppField name="password">
            {(field) => (
              <field.PasswordField
                label="Password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                hint={isRegister ? "8 to 72 characters." : undefined}
              />
            )}
          </form.AppField>
          {!isRegister && (
            <Link
              href="/auth/forgot"
              className="-mt-3 self-end text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          )}

          <form.SubmitButton
            className="mt-2 w-full"
            size="lg"
            pendingLabel={isRegister ? "Creating account…" : "Signing in…"}
          >
            {isRegister ? "Create account" : "Sign in"}
          </form.SubmitButton>
          {isRegister && (
            <p className="-mt-2 text-center text-xs text-muted-foreground">
              By creating an account you agree to our{" "}
              <Link href="/terms" className="underline underline-offset-4">
                terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline underline-offset-4">
                privacy policy
              </Link>
              .
            </p>
          )}
        </FieldGroup>

        <p className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
          {isRegister ? "Already have an account?" : "New to cartspace?"}{" "}
          <Link
            className="font-medium text-foreground underline underline-offset-4"
            href={otherHref}
          >
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </form.Form>
    </form.AppForm>
  );
}
