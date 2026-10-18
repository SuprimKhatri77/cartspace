"use client";

import { useEffect, useRef } from "react";
import type { AnyFieldApi } from "@tanstack/react-form";
import { PasswordInput } from "@/components/forms/password-input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { clearServerError } from "./api-errors";
import { useFieldContext } from "./context";
import { firstError } from "./validate";

/** A field name as an element id: "features[1]" is "features-1". */
export function fieldId(name: string): string {
  return name.replace(/[^\w-]+/g, "-").replace(/-+$/, "");
}

/** What a control needs to sit in a FieldShell. */
export type ControlProps = {
  id: string;
  name: string;
  onBlur: () => void;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
  /** Set for a group (a radiogroup of stars), which a <label> can't name. */
  "aria-labelledby"?: string;
};

type ShellProps = {
  label: React.ReactNode;
  /** Shown under the control while it has no error. */
  hint?: React.ReactNode;
  optional?: boolean;
  /** Defaults to the field name ("features[1]" → "features-1"). */
  id?: string;
  /** For the field's wrapper (a grid span), not the control. */
  fieldClassName?: string;
};

/**
 * A field's label, hint and error around its control, for the field
 * components and custom inputs: the control points at its error (else its
 * hint) for screen readers, and a server error goes once the value
 * changes. A `group` control (several buttons) is named by the label's id
 * instead of a <label for>.
 */
export function FieldShell({
  label,
  hint,
  optional,
  id: idProp,
  fieldClassName,
  group,
  children,
}: ShellProps & {
  group?: boolean;
  children: (control: ControlProps) => React.ReactNode;
}) {
  const field = useFieldContext<unknown>();
  useClearServerErrorOnChange(field);
  const id = idProp ?? fieldId(field.name);
  const error = firstError(field.state.meta.errors);
  const showHint = Boolean(hint) && !error;

  return (
    <Field data-invalid={Boolean(error)} className={fieldClassName}>
      <FieldLabel
        {...(group ? { id: `${id}-label` } : { htmlFor: id })}
        className="eyebrow !text-foreground"
      >
        {label}
        {optional && (
          <span className="ml-1 tracking-normal normal-case text-muted-foreground">
            (optional)
          </span>
        )}
      </FieldLabel>
      {children({
        id,
        name: field.name,
        onBlur: field.handleBlur,
        "aria-invalid": Boolean(error),
        "aria-describedby": error
          ? `${id}-error`
          : showHint
            ? `${id}-hint`
            : undefined,
        ...(group && { "aria-labelledby": `${id}-label` }),
      })}
      {showHint && (
        <FieldDescription id={`${id}-hint`} className="text-xs">
          {hint}
        </FieldDescription>
      )}
      {/* key: a new message replays the entrance. */}
      <FieldError key={error} id={`${id}-error`} className="animate-rise">
        {error}
      </FieldError>
    </Field>
  );
}

function useClearServerErrorOnChange(field: AnyFieldApi) {
  const value: unknown = field.state.value;
  const last = useRef(value);
  useEffect(() => {
    if (Object.is(last.current, value)) return;
    last.current = value;
    clearServerError(field);
  }, [field, value]);
}

type InputProps = Omit<
  React.ComponentProps<typeof Input>,
  "id" | "name" | "value" | "onChange" | "onBlur"
>;

/** A text input; `normalize` rewrites what's typed (upper-casing a code). */
export function TextField({
  label,
  hint,
  optional,
  id,
  fieldClassName,
  normalize,
  ...input
}: ShellProps & InputProps & { normalize?: (value: string) => string }) {
  const field = useFieldContext<string>();
  return (
    <FieldShell {...{ label, hint, optional, id, fieldClassName }}>
      {(control) => (
        <Input
          {...input}
          {...control}
          value={field.state.value}
          onChange={(e) =>
            field.handleChange(
              normalize ? normalize(e.target.value) : e.target.value,
            )
          }
        />
      )}
    </FieldShell>
  );
}

/** A password input with its show/hide toggle. */
export function PasswordField({
  label,
  hint,
  optional,
  id,
  fieldClassName,
  ...input
}: ShellProps & Omit<InputProps, "type">) {
  const field = useFieldContext<string>();
  return (
    <FieldShell {...{ label, hint, optional, id, fieldClassName }}>
      {(control) => (
        <PasswordInput
          {...input}
          {...control}
          value={field.state.value}
          onChange={(e) => field.handleChange(e.target.value)}
        />
      )}
    </FieldShell>
  );
}

/** A multi-line text input. */
export function TextareaField({
  label,
  hint,
  optional,
  id,
  fieldClassName,
  ...textarea
}: ShellProps &
  Omit<
    React.ComponentProps<typeof Textarea>,
    "id" | "name" | "value" | "onChange" | "onBlur"
  >) {
  const field = useFieldContext<string>();
  return (
    <FieldShell {...{ label, hint, optional, id, fieldClassName }}>
      {(control) => (
        <Textarea
          {...textarea}
          {...control}
          value={field.state.value}
          onChange={(e) => field.handleChange(e.target.value)}
        />
      )}
    </FieldShell>
  );
}

export type SelectItemOption = { value: string; label: React.ReactNode };

/** One choice from a short list. */
export function SelectField({
  label,
  hint,
  optional,
  id,
  fieldClassName,
  items,
  placeholder,
}: ShellProps & { items: SelectItemOption[]; placeholder?: string }) {
  const field = useFieldContext<string>();
  return (
    <FieldShell {...{ label, hint, optional, id, fieldClassName }}>
      {(control) => (
        <Select
          value={field.state.value}
          // Base UI reports null when a selection is cleared; a field
          // always holds one of its items.
          onValueChange={(value) => value !== null && field.handleChange(value)}
          items={items}
        >
          <SelectTrigger {...control} className="h-10 w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FieldShell>
  );
}
