"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { revalidateLogic, useStore } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChangePasswordBodySchema,
  type PublicUser,
  UpdateProfileBodySchema,
} from "@repo/types";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { changePassword, updateProfile } from "@/lib/api/client";
import { applyApiErrors } from "@/lib/form/api-errors";
import { useAppForm } from "@/lib/form/form";
import { schemaErrors } from "@/lib/form/validate";
import { useAuth } from "@/providers/auth-provider";

/** Account settings: the name, and the password. */
export function AccountSettings({ user }: { user: PublicUser }) {
  return (
    <div className="space-y-14">
      <header className="space-y-3">
        <p className="eyebrow animate-rise">Settings</p>
        <h1
          className="display animate-rise text-5xl sm:text-6xl"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          Your <em>details.</em>
        </h1>
      </header>
      <ProfileForm user={user} />
      <PasswordForm />
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid max-w-3xl gap-6 border-t border-border pt-8 md:grid-cols-[14rem_1fr] md:gap-12">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl">{title}</h2>
        <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function ProfileForm({ user }: { user: PublicUser }) {
  const router = useRouter();
  const setUser = useAuth((s) => s.setUser);
  // The last saved name. Not the form's defaultValues: useForm re-reads
  // those from its options on every render.
  const [saved, setSaved] = useState(user.name);

  const save = useMutation({
    mutationFn: async (body: { name: string }) => {
      const { data } = await updateProfile({ body, throwOnError: true });
      return data;
    },
    onSuccess: ({ data, message }) => {
      setUser(data);
      setSaved(data.name);
      form.setFieldValue("name", data.name);
      toast.success(message);
      // Server-rendered parts (the overview greeting) read the new token.
      router.refresh();
    },
  });

  const form = useAppForm({
    defaultValues: { name: user.name },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: ({ value }) => schemaErrors(UpdateProfileBodySchema, value),
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        await save.mutateAsync(UpdateProfileBodySchema.parse(value));
      } catch (err) {
        const { applied, message } = applyApiErrors(formApi, err);
        if (!applied) toast.error(message ?? "Couldn't save your name.");
      }
    },
  });
  const unchanged = useStore(form.store, (s) => s.values.name.trim()) === saved;

  return (
    <Section
      title="Profile"
      description="Your name appears on orders and in the emails we send."
    >
      <form.AppForm>
        <form.Form className="max-w-sm">
          <FieldGroup>
            <form.AppField name="name">
              {(field) => <field.TextField label="Name" autoComplete="name" />}
            </form.AppField>
            <Field>
              <FieldLabel htmlFor="email" className="eyebrow !text-foreground">
                Email
              </FieldLabel>
              <Input id="email" value={user.email} readOnly disabled />
              <FieldDescription className="text-xs">
                Your email signs you in, so it can&apos;t be changed here.
              </FieldDescription>
            </Field>
            <form.SubmitButton
              className="self-start"
              pendingLabel="Saving…"
              disabled={unchanged}
            >
              Save name
            </form.SubmitButton>
          </FieldGroup>
        </form.Form>
      </form.AppForm>
    </Section>
  );
}

const EMPTY = { current_password: "", new_password: "" };

function PasswordForm() {
  const change = useMutation({
    mutationFn: async (body: typeof EMPTY) => {
      const { data } = await changePassword({ body, throwOnError: true });
      return data.message;
    },
    onSuccess: (message) => {
      form.reset();
      toast.success(message);
    },
  });

  const form = useAppForm({
    defaultValues: EMPTY,
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: ({ value }) =>
        schemaErrors(ChangePasswordBodySchema, value, {
          labels: {
            current_password: "your current password",
            new_password: "a new password",
          },
        }),
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        await change.mutateAsync(ChangePasswordBodySchema.parse(value));
      } catch (err) {
        const { applied, message } = applyApiErrors(formApi, err);
        if (!applied) {
          toast.error(message ?? "Couldn't change your password.");
        }
      }
    },
  });

  return (
    <Section
      title="Password"
      description="Changing it signs you out on your other devices; you stay signed in here."
    >
      <form.AppForm>
        <form.Form className="max-w-sm">
          <FieldGroup>
            <form.AppField name="current_password">
              {(field) => (
                <field.PasswordField
                  label="Current password"
                  autoComplete="current-password"
                />
              )}
            </form.AppField>
            <form.AppField name="new_password">
              {(field) => (
                <field.PasswordField
                  label="New password"
                  autoComplete="new-password"
                  hint="8 to 72 characters."
                />
              )}
            </form.AppField>
            <form.SubmitButton className="self-start" pendingLabel="Saving…">
              Change password
            </form.SubmitButton>
          </FieldGroup>
        </form.Form>
      </form.AppForm>
    </Section>
  );
}
