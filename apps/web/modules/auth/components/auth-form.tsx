"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { z } from "zod";
import {
  LoginBodySchema,
  RegisterBodySchema,
  type LoginBody,
  type RegisterBody,
} from "@repo/types";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getApiError, mapFieldErrors } from "@/lib/api/errors";
import { safeNextPath } from "@/lib/auth/redirect";

type AuthFormProps =
  | {
      mode: "login";
      isPending: boolean;
      onSubmit: (body: LoginBody) => Promise<unknown>;
    }
  | {
      mode: "register";
      isPending: boolean;
      onSubmit: (body: RegisterBody) => Promise<unknown>;
    };

type FormValues = { name: string; email: string; password: string };
type FieldName = keyof FormValues;

function issuesToFieldErrors(error: z.ZodError): Record<string, string> {
  return mapFieldErrors(
    error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  );
}

export function AuthForm(props: AuthFormProps) {
  const isRegister = props.mode === "register";
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));

  const [values, setValues] = useState<FormValues>({
    name: "",
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function updateField(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const rest = { ...current };
      delete rest[field];
      return rest;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    try {
      if (props.mode === "register") {
        const parsed = RegisterBodySchema.safeParse(values);
        if (!parsed.success) {
          setFieldErrors(issuesToFieldErrors(parsed.error));
          return;
        }
        await props.onSubmit(parsed.data);
      } else {
        const parsed = LoginBodySchema.safeParse({
          email: values.email,
          password: values.password,
        });
        if (!parsed.success) {
          setFieldErrors(issuesToFieldErrors(parsed.error));
          return;
        }
        await props.onSubmit(parsed.data);
      }
    } catch (error) {
      // The mutation already showed a toast; add per-field messages.
      setFieldErrors(mapFieldErrors(getApiError(error)?.errors));
    }
  }

  function field(name: FieldName, label: string, input: React.ReactNode) {
    return (
      <Field data-invalid={Boolean(fieldErrors[name])}>
        <FieldLabel htmlFor={name}>{label}</FieldLabel>
        {input}
        <FieldError>{fieldErrors[name]}</FieldError>
      </Field>
    );
  }

  const otherHref = `${isRegister ? "/auth/login" : "/auth/register"}${
    next ? `?next=${encodeURIComponent(next)}` : ""
  }`;

  return (
    <form
      className="w-full max-w-sm border border-border bg-card p-6 text-card-foreground shadow-sm"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="mb-6 space-y-1">
        <h1 className="text-xl font-semibold">
          {isRegister ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isRegister
            ? "Sign up to save your cart and orders."
            : "Sign in to your cartspace account."}
        </p>
      </div>

      <FieldGroup>
        {isRegister &&
          field(
            "name",
            "Name",
            <Input
              id="name"
              name="name"
              autoComplete="name"
              value={values.name}
              onChange={(e) => updateField("name", e.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
            />,
          )}
        {field(
          "email",
          "Email",
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => updateField("email", e.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
          />,
        )}
        {field(
          "password",
          "Password",
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={values.password}
            onChange={(e) => updateField("password", e.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
          />,
        )}

        <Button
          className="w-full"
          size="lg"
          type="submit"
          disabled={props.isPending}
        >
          {props.isPending
            ? isRegister
              ? "Creating account…"
              : "Signing in…"
            : isRegister
              ? "Create account"
              : "Sign in"}
        </Button>
      </FieldGroup>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {isRegister ? "Already have an account?" : "New to cartspace?"}{" "}
        <Link
          className="font-medium text-foreground underline underline-offset-4"
          href={otherHref}
        >
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
