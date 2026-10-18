"use client";

import { useMemo, useState } from "react";
import {
  DotsThreeIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  TreeStructureIcon,
} from "@phosphor-icons/react";
import { revalidateLogic } from "@tanstack/react-form";
import { CategoryBodySchema, type CategoryNode } from "@repo/types";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminCreateCategory,
  adminDeleteCategory,
  adminUpdateCategory,
} from "@/lib/api/client";
import { applyApiErrors } from "@/lib/form/api-errors";
import { useAppForm } from "@/lib/form/form";
import { useReportSubmitting } from "@/lib/form/form-components";
import { schemaErrors } from "@/lib/form/validate";
import { useAdminMutation } from "../hooks/use-admin-mutation";
import { categoryPath, orderTree, subtreeIds } from "../lib/categories";
import { useCategoryTree } from "../queries";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";

const ROOT = "root";

type Editing =
  | { mode: "create"; parentId: string | null }
  | { mode: "edit"; category: CategoryNode };

/** The category tree: add (at the top or under a category), rename, move, delete. */
export function CategoryManager() {
  const tree = useCategoryTree();
  const nodes = useMemo(() => tree.data ?? [], [tree.data]);
  const ordered = useMemo(() => orderTree(nodes), [nodes]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<CategoryNode | null>(null);

  const remove = useAdminMutation({
    mutationFn: async (category: CategoryNode) => {
      await adminDeleteCategory({
        path: { id: category.id },
        throwOnError: true,
      });
    },
    success: (_, c) => `${c.name} was deleted`,
    failure: "Couldn't delete the category.",
    onSuccess: () => setDeleting(null),
  });

  const childCount = (id: string) =>
    nodes.filter((n) => n.parent_id === id).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {tree.isSuccess &&
            `${nodes.length} ${nodes.length === 1 ? "category" : "categories"}`}
        </p>
        <Button onClick={() => setEditing({ mode: "create", parentId: null })}>
          <PlusIcon data-icon="inline-start" />
          Add category
        </Button>
      </div>

      <div className="overflow-hidden rounded-panel border border-border bg-card">
        {tree.isPending ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : tree.isError ? (
          <div className="p-8 text-sm text-muted-foreground">
            The categories couldn&apos;t load.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => tree.refetch()}
            >
              Try again
            </button>
          </div>
        ) : ordered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <TreeStructureIcon
              className="mx-auto size-8 text-muted-foreground"
              weight="light"
            />
            <p className="mt-4 font-serif text-2xl">No categories yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Every product sits in one; start with the top level, like
              Clothing.
            </p>
          </div>
        ) : (
          <ul aria-label="Categories" className="divide-y divide-border">
            {ordered.map((category) => (
              <li
                key={category.id}
                className="group flex h-14 items-center justify-between gap-3 pr-3 transition-colors hover:bg-muted/40"
                style={{ paddingLeft: `${1.25 + category.depth * 1.75}rem` }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {category.depth > 0 && (
                    <span aria-hidden className="h-px w-3 shrink-0 bg-border" />
                  )}
                  <div className="min-w-0">
                    <p
                      className={
                        category.depth === 0
                          ? "truncate font-serif text-xl leading-tight"
                          : "truncate text-[0.8125rem]"
                      }
                    >
                      {category.name}
                      {category.parent_id && (
                        <span className="sr-only">
                          , in {categoryPath(nodes, category.parent_id)}
                        </span>
                      )}
                    </p>
                    <p className="truncate font-mono text-[0.625rem] text-muted-foreground">
                      /{category.slug}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden sm:inline-flex sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
                    onClick={() =>
                      setEditing({ mode: "create", parentId: category.id })
                    }
                  >
                    <PlusIcon data-icon="inline-start" />
                    Subcategory
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={buttonVariants({
                        variant: "ghost",
                        size: "icon-sm",
                      })}
                      aria-label={`Actions for ${category.name}`}
                    >
                      <DotsThreeIcon className="size-5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 p-1">
                      <DropdownMenuItem
                        onClick={() => setEditing({ mode: "edit", category })}
                      >
                        <PencilSimpleIcon />
                        Rename or move
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setEditing({ mode: "create", parentId: category.id })
                        }
                      >
                        <PlusIcon />
                        Add subcategory
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleting(category)}
                      >
                        <TrashIcon />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CategoryDialog
        nodes={nodes}
        editing={editing}
        onClose={() => setEditing(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this category?"
        description={
          deleting && (
            <>
              <span className="text-foreground">{deleting.name}</span> is
              removed. Its products stay but lose their category until you
              choose another
              {childCount(deleting.id) > 0 &&
                `, and its ${childCount(deleting.id) === 1 ? "subcategory moves" : `${childCount(deleting.id)} subcategories move`} to the top level`}
              .
            </>
          )
        }
        confirmLabel="Delete category"
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </div>
  );
}

function CategoryDialog({
  nodes,
  editing,
  onClose,
}: {
  nodes: CategoryNode[];
  editing: Editing | null;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const key =
    editing === null
      ? "closed"
      : editing.mode === "edit"
        ? editing.category.id
        : `new-${editing.parentId ?? ROOT}`;
  return (
    <Dialog
      open={editing !== null}
      onOpenChange={(open) => !open && !busy && onClose()}
    >
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        {editing && (
          <CategoryForm
            key={key}
            nodes={nodes}
            editing={editing}
            onBusyChange={setBusy}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({
  nodes,
  editing,
  onBusyChange,
  onDone,
}: {
  nodes: CategoryNode[];
  editing: Editing;
  onBusyChange: (busy: boolean) => void;
  onDone: () => void;
}) {
  const category = editing.mode === "edit" ? editing.category : null;

  // A category can't move under itself or anything below it.
  const parents = useMemo(() => {
    const blocked = category
      ? subtreeIds(nodes, category.id)
      : new Set<string>();
    return [
      { value: ROOT, label: "None (top level)", depth: 0 },
      ...orderTree(nodes)
        .filter((n) => !blocked.has(n.id))
        .map((n) => ({
          value: n.id,
          label: categoryPath(nodes, n.id),
          depth: n.depth,
        })),
    ];
  }, [nodes, category]);

  const save = useAdminMutation({
    mutationFn: async (body: { name: string; parent_id?: string }) => {
      if (category) {
        await adminUpdateCategory({
          path: { id: category.id },
          body,
          throwOnError: true,
        });
      } else {
        await adminCreateCategory({ body, throwOnError: true });
      }
    },
    quietOnFieldErrors: true,
    failure: "Couldn't save the category.",
    success: category ? "Category saved" : "Category added",
    onSuccess: onDone,
  });

  const form = useAppForm({
    defaultValues: {
      name: category?.name ?? "",
      parent_id:
        (category
          ? category.parent_id
          : editing.mode === "create"
            ? editing.parentId
            : null) ?? ROOT,
    },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: ({ value }) =>
        schemaErrors(CategoryBodySchema, categoryBody(value), {
          labels: { name: "a name" },
        }),
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        await save.mutateAsync(CategoryBodySchema.parse(categoryBody(value)));
      } catch (error) {
        applyApiErrors(formApi, error, {
          codes: {
            CATEGORY_ALREADY_EXISTS: {
              field: "name",
              message: "Another category already has this name",
            },
          },
        });
      }
    },
  });
  useReportSubmitting(form, onBusyChange);

  const parentName =
    editing.mode === "create" && editing.parentId
      ? categoryPath(nodes, editing.parentId)
      : null;

  return (
    <form.AppForm>
      <form.Form>
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="font-serif text-2xl font-normal">
            {category
              ? `Edit ${category.name}`
              : parentName
                ? "New subcategory"
                : "New category"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {category
              ? "Renaming changes its address in the store."
              : parentName
                ? `Inside ${parentName}.`
                : "Names are unique across the store."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 px-6 py-6">
          <form.AppField name="name">
            {(field) => (
              <field.TextField
                id="category-name"
                label="Name"
                maxLength={20}
                autoComplete="off"
              />
            )}
          </form.AppField>
          <form.AppField name="parent_id">
            {(field) => (
              <field.SelectField
                id="category-parent"
                label="Parent"
                items={parents}
                renderItem={(item) => {
                  const p = parents.find((x) => x.value === item.value);
                  const top = item.value === ROOT;
                  return (
                    <span
                      style={{ paddingLeft: `${top ? 0 : (p?.depth ?? 0)}rem` }}
                    >
                      {top
                        ? item.label
                        : String(item.label).split(" / ").at(-1)}
                    </span>
                  );
                }}
              />
            )}
          </form.AppField>
        </div>
        <DialogFooter className="border-t border-border px-6 py-4">
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(submitting) => (
              <Button
                type="button"
                variant="outline"
                onClick={onDone}
                disabled={submitting}
              >
                Cancel
              </Button>
            )}
          </form.Subscribe>
          <form.SubmitButton pendingLabel="Saving…">
            {category ? "Save" : "Add category"}
          </form.SubmitButton>
        </DialogFooter>
      </form.Form>
    </form.AppForm>
  );
}

/** The body for the picked parent: none at the top level. */
function categoryBody(value: { name: string; parent_id: string }) {
  return {
    name: value.name,
    ...(value.parent_id !== ROOT && { parent_id: value.parent_id }),
  };
}
