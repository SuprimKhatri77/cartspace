import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** A dollar amount typed as "12.50" (convert with toCents). */
export function MoneyField({
  id,
  label,
  value,
  onChange,
  error,
  optional,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  optional?: boolean;
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id} className="eyebrow !text-foreground">
        {label}
        {optional && (
          <span className="ml-1 tracking-normal normal-case text-muted-foreground">
            (optional)
          </span>
        )}
      </FieldLabel>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) =>
            onChange(e.target.value.replace(/[^\d.]/g, "").slice(0, 10))
          }
          className="pl-7 tabular-nums"
          aria-invalid={Boolean(error)}
        />
      </div>
      <FieldError>{error}</FieldError>
    </Field>
  );
}
