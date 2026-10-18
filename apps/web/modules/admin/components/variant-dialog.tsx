"use client";

import { useState } from "react";
import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { revalidateLogic, useStore } from "@tanstack/react-form";
import {
  CreateVariantBodySchema,
  UpdateVariantBodySchema,
  type AdminVariant,
  type CreateVariantBody,
  type UpdateVariantBody,
  type OptionType,
} from "@repo/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminCreateVariant, adminUpdateVariant } from "@/lib/api/client";
import { applyApiErrors } from "@/lib/form/api-errors";
import { digits, FieldShell } from "@/lib/form/fields";
import { useAppForm } from "@/lib/form/form";
import { useReportSubmitting } from "@/lib/form/form-components";
import { firstError } from "@/lib/form/validate";
import { useAdminMutation } from "../hooks/use-admin-mutation";
import { adminKeys } from "../keys";
import { toLocalInput } from "../lib/datetime";
import type { StoredImage } from "../lib/upload";
import {
  variantBody,
  variantErrors,
  variantFormFrom,
} from "../lib/variant-form";
import { ImageManager } from "./image-manager";

const typeItems = [
  { value: "text", label: "Text" },
  { value: "color", label: "Colour" },
];

/** `editing` is the variant to edit, "new" to add one, null when closed. */
export function VariantDialog({
  productId,
  productImages,
  editing,
  options,
  first,
  onClose,
}: {
  productId: string;
  productImages: StoredImage[];
  editing: AdminVariant | "new" | null;
  /** The product's option names and types, to start a new variant from. */
  options: { name: string; type: OptionType }[];
  /** No variants yet: the new one starts as the default. */
  first: boolean;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={editing !== null}
      onOpenChange={(open) => !open && !busy && onClose()}
    >
      <DialogContent className="max-h-[92svh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        {editing !== null && (
          <VariantForm
            key={editing === "new" ? "new" : editing.id}
            productId={productId}
            productImages={productImages}
            variant={editing === "new" ? undefined : editing}
            options={options}
            first={first}
            onBusyChange={setBusy}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function VariantForm({
  productId,
  productImages,
  variant,
  options,
  first,
  onBusyChange,
  onDone,
}: {
  productId: string;
  productImages: StoredImage[];
  variant?: AdminVariant;
  options: { name: string; type: OptionType }[];
  first: boolean;
  onBusyChange: (busy: boolean) => void;
  onDone: () => void;
}) {
  const isNew = !variant;
  const [uploading, setUploading] = useState(false);

  const save = useAdminMutation({
    mutationFn: async (body: CreateVariantBody | UpdateVariantBody) => {
      if (variant) {
        await adminUpdateVariant({
          path: { productID: productId, variantID: variant.id },
          body,
          throwOnError: true,
        });
      } else {
        await adminCreateVariant({
          path: { productID: productId },
          body: body as CreateVariantBody,
          throwOnError: true,
        });
      }
    },
    quietOnFieldErrors: true,
    failure: "Couldn't save the variant.",
    success: variant ? "Variant saved" : "Variant added",
    invalidate: [
      adminKeys.variants(productId),
      adminKeys.products(),
      adminKeys.stats(),
      adminKeys.inventory(),
      adminKeys.counts(),
    ],
    onSuccess: onDone,
  });

  const form = useAppForm({
    defaultValues: variantFormFrom({ variant, options, productImages, first }),
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: ({ value }) => variantErrors(value, isNew),
    },
    onSubmit: async ({ value, formApi }) => {
      const { body, rename } = variantBody(value, isNew);
      const schema = isNew ? CreateVariantBodySchema : UpdateVariantBodySchema;
      try {
        await save.mutateAsync(schema.parse(body));
      } catch (error) {
        applyApiErrors(formApi, error, { rename });
      }
    },
  });
  useReportSubmitting(form, onBusyChange);
  const submitting = useStore(form.store, (s) => s.isSubmitting);
  const noOffer = useStore(form.store, (s) => !s.values.offer_price.trim());

  const label = variant
    ? variant.options.map((o) => o.value).join(" / ") || "Default variant"
    : "New variant";
  // The earliest end a browser offers: now, to the minute.
  const now = toLocalInput(new Date().toISOString());

  return (
    <form.AppForm>
      <form.Form>
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="font-serif text-2xl font-normal">
            {label}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {variant
              ? `SKU ${variant.sku ?? "none"}. Its options are fixed; add a new variant for another combination.`
              : "The options tell this variant apart, like Size M in Black. Prices are in dollars."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-7 px-6 py-6">
          {isNew && (
            <form.AppField name="properties" mode="array">
              {(list) => {
                const listError = firstError(list.state.meta.errors);
                return (
                  <fieldset className="space-y-3">
                    <legend className="eyebrow mb-3 !text-foreground">
                      Options
                    </legend>
                    {list.state.value.map((p, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_1fr_6.5rem_auto] items-start gap-2"
                      >
                        <form.AppField name={`properties[${i}].name`}>
                          {(field) => (
                            <field.TextField
                              id={`variant-option-${i}-name`}
                              label={`Option ${i + 1} name`}
                              hideLabel
                              placeholder="Option, e.g. Size"
                              maxLength={20}
                            />
                          )}
                        </form.AppField>
                        <form.AppField name={`properties[${i}].value`}>
                          {(field) => (
                            <field.TextField
                              id={`variant-option-${i}-value`}
                              label={`${p.name || `Option ${i + 1}`} value`}
                              hideLabel
                              placeholder={
                                p.type === "color" ? "e.g. Black" : "e.g. M"
                              }
                              maxLength={20}
                            />
                          )}
                        </form.AppField>
                        <form.AppField name={`properties[${i}].type`}>
                          {(field) => (
                            <field.SelectField
                              id={`variant-option-${i}-type`}
                              label={`Option ${i + 1} type`}
                              hideLabel
                              items={typeItems}
                            />
                          )}
                        </form.AppField>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => list.removeValue(i)}
                          aria-label={`Remove option ${i + 1}`}
                        >
                          <XIcon />
                        </Button>
                      </div>
                    ))}
                    {listError && (
                      <p
                        id="variant-options-error"
                        className="animate-rise text-xs text-destructive"
                      >
                        {listError}
                      </p>
                    )}
                    {list.state.value.length < 10 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          list.pushValue({ name: "", value: "", type: "text" })
                        }
                      >
                        <PlusIcon data-icon="inline-start" />
                        Add option
                      </Button>
                    )}
                  </fieldset>
                );
              }}
            </form.AppField>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <form.AppField name="selling_price">
              {(field) => (
                <field.MoneyField id="variant-selling" label="Price" />
              )}
            </form.AppField>
            {variant ? (
              <div className="space-y-2">
                <p className="eyebrow !text-foreground">Stock</p>
                <p className="flex h-10 items-center text-sm tabular-nums">
                  {variant.stock}
                  <span className="ml-2 text-xs text-muted-foreground">
                    Count it in the variants table.
                  </span>
                </p>
              </div>
            ) : (
              <form.AppField name="stock">
                {(field) => (
                  <field.TextField
                    id="variant-stock"
                    label="Stock"
                    inputMode="numeric"
                    normalize={digits(5)}
                    className="tabular-nums"
                  />
                )}
              </form.AppField>
            )}
            <form.AppField name="offer_price">
              {(field) => (
                <field.MoneyField
                  id="variant-offer"
                  label="Offer price"
                  optional
                />
              )}
            </form.AppField>
            <form.AppField name="offer_expires_at">
              {(field) => (
                <field.TextField
                  id="variant-offer-ends"
                  label="Offer ends"
                  optional
                  type="datetime-local"
                  min={now}
                  disabled={noOffer}
                />
              )}
            </form.AppField>
          </div>

          <form.AppField name="images">
            {(field) => (
              <FieldShell id="variant-images" label="Images" group>
                {(control) => (
                  <div
                    role="group"
                    id={control.id}
                    aria-labelledby={control["aria-labelledby"]}
                    aria-invalid={control["aria-invalid"]}
                    aria-describedby={control["aria-describedby"]}
                    className="space-y-3"
                  >
                    <ImageManager
                      images={field.state.value}
                      onChange={(update) => field.handleChange(update)}
                      library={productImages}
                      invalid={control["aria-invalid"]}
                      onUploadingChange={setUploading}
                      label={label}
                    />
                  </div>
                )}
              </FieldShell>
            )}
          </form.AppField>

          <div className="grid gap-5 sm:grid-cols-2">
            <form.AppField name="is_default">
              {(field) => (
                <field.SwitchField
                  id="variant-default"
                  label="Default"
                  description="Its price and photos represent the product in listings. Switching it on takes over from the current default."
                />
              )}
            </form.AppField>
            <form.AppField name="is_active">
              {(field) => (
                <field.SwitchField
                  id="variant-active"
                  label="Active"
                  description="Can be chosen and bought."
                />
              )}
            </form.AppField>
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 border-t border-border bg-popover px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onDone}
            disabled={submitting}
          >
            Cancel
          </Button>
          <form.SubmitButton pendingLabel="Saving…" disabled={uploading}>
            {uploading
              ? "Uploading…"
              : variant
                ? "Save variant"
                : "Add variant"}
          </form.SubmitButton>
        </DialogFooter>
      </form.Form>
    </form.AppForm>
  );
}
