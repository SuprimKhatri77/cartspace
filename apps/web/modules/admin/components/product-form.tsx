"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { revalidateLogic, useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { ProductBodySchema, type Product, type ProductBody } from "@repo/types";
import { Button } from "@/components/ui/button";
import { adminCreateProduct, adminUpdateProduct } from "@/lib/api/client";
import { applyApiErrors } from "@/lib/form/api-errors";
import { FieldShell } from "@/lib/form/fields";
import { useAppForm } from "@/lib/form/form";
import { useAdminMutation } from "../hooks/use-admin-mutation";
import { adminKeys } from "../keys";
import { categoryPath, orderTree } from "../lib/categories";
import {
  productBody,
  productErrors,
  productFormFrom,
  type ProductFormValues,
} from "../lib/product-form";
import { useCategoryTree } from "../queries";
import { ImageManager } from "./image-manager";
import { Panel } from "./panel";

const MAX_FEATURES = 7;

/** What the form would send, to tell edits from what's saved. */
function snapshot(values: ProductFormValues) {
  return JSON.stringify(productBody(values).body);
}

/**
 * Creates a product or edits one. Every field is sent on save (the API's
 * PUT replaces the product). A new product moves to its edit page, where
 * its variants are added: until it has a default variant the store
 * doesn't list it.
 */
export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tree = useCategoryTree();
  const [uploading, setUploading] = useState(false);
  // What was last saved, as a body. Not the form's defaultValues: useForm
  // re-reads those from its options on every render.
  const [saved, setSaved] = useState(() => snapshot(productFormFrom(product)));

  const categories = useMemo(() => {
    const nodes = tree.data ?? [];
    return orderTree(nodes).map((c) => ({
      value: c.id,
      label: categoryPath(nodes, c.id),
      name: c.name,
      depth: c.depth,
    }));
  }, [tree.data]);

  const save = useAdminMutation({
    mutationFn: async (next: ProductBody) => {
      const { data } = product
        ? await adminUpdateProduct({
            path: { productID: product.id },
            body: next,
            throwOnError: true,
          })
        : await adminCreateProduct({ body: next, throwOnError: true });
      return data.data;
    },
    quietOnFieldErrors: true,
    failure: "Couldn't save the product.",
    success: product
      ? "Product saved"
      : "Product created. Now add its variants.",
    invalidate: [
      adminKeys.products(),
      adminKeys.stats(),
      adminKeys.inventory(),
      adminKeys.counts(),
    ],
    onSuccess: (saved) => {
      setSaved(snapshot(productFormFrom(saved)));
      queryClient.setQueryData(adminKeys.product(saved.id), saved);
      if (!product) router.replace(`/admin/products/${saved.id}#variants`);
    },
  });

  const form = useAppForm({
    defaultValues: productFormFrom(product),
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: ({ value }) => productErrors(value),
    },
    onSubmit: async ({ value, formApi }) => {
      const { body, rename } = productBody(value);
      try {
        await save.mutateAsync(ProductBodySchema.parse(body));
      } catch (error) {
        applyApiErrors(formApi, error, { rename });
      }
    },
  });
  const dirty = useStore(form.store, (s) => snapshot(s.values) !== saved);
  const imageCount = useStore(form.store, (s) => s.values.images.length);
  const name = useStore(form.store, (s) => s.values.name);

  // Leaving with unsaved edits asks first (reloads and closing the tab).
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return (
    <form.AppForm>
      <form.Form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="space-y-6">
          <Panel title="Details">
            <div className="space-y-5">
              <form.AppField name="name">
                {(field) => (
                  <field.TextField
                    id="product-name"
                    label="Name"
                    maxLength={50}
                  />
                )}
              </form.AppField>
              <form.AppField name="description">
                {(field) => (
                  <field.TextareaField
                    id="product-description"
                    label="Description"
                    maxLength={5000}
                    rows={6}
                  />
                )}
              </form.AppField>
            </div>
          </Panel>

          <Panel title="Images" hint={`${imageCount} of 5`}>
            <form.AppField name="images">
              {(field) => (
                <FieldShell id="product-images" label="Images" hideLabel group>
                  {(control) => (
                    <div
                      role="group"
                      id={control.id}
                      aria-labelledby={control["aria-labelledby"]}
                      aria-invalid={control["aria-invalid"]}
                      aria-describedby={control["aria-describedby"]}
                    >
                      <ImageManager
                        images={field.state.value}
                        onChange={(update) => field.handleChange(update)}
                        invalid={control["aria-invalid"]}
                        onUploadingChange={setUploading}
                        label={name || "Product image"}
                      />
                    </div>
                  )}
                </FieldShell>
              )}
            </form.AppField>
          </Panel>

          <form.AppField name="features" mode="array">
            {(list) => (
              <Panel
                title="Features"
                hint={`${list.state.value.length} of ${MAX_FEATURES}`}
              >
                <div className="space-y-2">
                  {list.state.value.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <form.AppField name={`features[${i}]`}>
                        {(field) => (
                          <field.TextField
                            id={`product-feature-${i}`}
                            label={`Feature ${i + 1}`}
                            hideLabel
                            fieldClassName="flex-1"
                            maxLength={100}
                            onKeyDown={(e) => {
                              // Enter adds a row instead of saving.
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              if (list.state.value.length < MAX_FEATURES) {
                                list.pushValue("");
                              }
                            }}
                            autoFocus={
                              i === list.state.value.length - 1 &&
                              feature === ""
                            }
                          />
                        )}
                      </form.AppField>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => list.removeValue(i)}
                        aria-label={`Remove feature ${i + 1}`}
                      >
                        <XIcon />
                      </Button>
                    </div>
                  ))}
                  {list.state.value.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Short points shown under the description, such as
                      &ldquo;100% organic linen&rdquo;.
                    </p>
                  )}
                  {list.state.value.length < MAX_FEATURES && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => list.pushValue("")}
                    >
                      <PlusIcon data-icon="inline-start" />
                      Add feature
                    </Button>
                  )}
                </div>
              </Panel>
            )}
          </form.AppField>
        </div>

        <div className="space-y-6 xl:sticky xl:top-24">
          <Panel title="Organisation">
            <form.AppField name="category_id">
              {(field) => (
                <field.SelectField
                  id="product-category"
                  label="Category"
                  items={categories}
                  placeholder="Choose a category"
                  renderItem={(item) => {
                    const c = categories.find((x) => x.value === item.value);
                    return (
                      <span style={{ paddingLeft: `${c?.depth ?? 0}rem` }}>
                        {c?.name ?? item.label}
                      </span>
                    );
                  }}
                />
              )}
            </form.AppField>
          </Panel>

          <Panel title="Visibility">
            <div className="space-y-5">
              <form.AppField name="is_active">
                {(field) => (
                  <field.SwitchField
                    id="product-active"
                    label="Active"
                    description="Shown in the store and can be bought."
                  />
                )}
              </form.AppField>
              <form.AppField name="is_featured">
                {(field) => (
                  <field.SwitchField
                    id="product-featured"
                    label="Featured"
                    description="Picked for the home page."
                  />
                )}
              </form.AppField>
            </div>
          </Panel>

          <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 xl:static xl:mx-0 xl:border-0 xl:bg-transparent xl:p-0 xl:backdrop-blur-none">
            <form.SubmitButton
              size="lg"
              className="w-full"
              pendingLabel="Saving…"
              disabled={uploading || (Boolean(product) && !dirty)}
            >
              {uploading
                ? "Uploading…"
                : product
                  ? dirty
                    ? "Save changes"
                    : "Saved"
                  : "Create product"}
            </form.SubmitButton>
          </div>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
